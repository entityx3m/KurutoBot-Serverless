// api/index.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import axios from "axios";
import { InteractionResponseType, MessageFlags } from "discord-api-types/v10";
import { InteractionType, verifyKey } from "discord-interactions";
import getRawBody from "raw-body";
import commands from "./.discraft/commands/index";
import { logger } from "./utils/logger";
import {
  type Command,
  type CommandExecuteUnpromised,
  type SimplifiedInteraction,
} from "./utils/types";
import { RecruitmentTracker } from "./utils/recruitment";
import { 
  getKV, 
  setKV, 
  getUserData, 
  setUserData, 
  getUserIdByTag,
  unlinkTag, 
  linkTagToUser, 
  getMainAccount,
  type PlayerAccount 
} from "./utils/kvHelper";

const COC_API_BASE_URL = "https://cocproxy.royaleapi.dev/v1";
const VERIFIED_ROLE_ID = "REDACTED_VERIFIED_ID";

// UPDATED: New embed format using API data
async function createRecruitmentEmbed() {
  const summary = await RecruitmentTracker.getSummary();
  const { clans, totalMembers, totalCapacity, totalEmptySlots, overallFillPercentage } = summary;
  
  let description = `**📊 Overall Alliance Status**\n` +
                   `👥 **Total Members:** ${totalMembers}/${totalCapacity}\n` +
                   `📈 **Overall Fill Rate:** ${overallFillPercentage}%\n` +
                   `🎯 **Total Recruits Needed:** ${totalEmptySlots}\n\n` +
                   `**Clan Breakdown:**\n`;
  
  clans.forEach((clan: any) => {
    const neededRecruits = RecruitmentTracker.calculateNeededRecruits(clan.memberCount);
    const fillPercentage = Math.round((clan.memberCount / 50) * 100);
    const progressBar = RecruitmentTracker.createProgressBar(fillPercentage);
    
    description += `\n**${clan.name} (${clan.clan})**\n` +
                  `> 👥 **Members:** ${clan.memberCount}/50\n` +
                  `> 🎯 **Recruits Needed:** ${neededRecruits}\n` +
                  `> 📊 **Fill Rate:** ${fillPercentage}%\n` +
                  `> ${progressBar}\n`;
  });
  
  description += `\n*Data automatically fetched from Clash of Clans API*\n*Click refresh to update*`;
  
  return {
    title: "🏰 BOOM House Recruitment Status",
    description: description,
    color: 0x5865F2,
    footer: {
      text: "Last updated"
    },
    timestamp: new Date().toISOString()
  };
}

// Handle CoC account linking modal submission
async function handleCocLinkModal(message: SimplifiedInteraction, res: VercelResponse) {
  try {
    const userId = message.member?.user?.id;
    const guildId = message.guild_id;
    const components = message.data?.components || [];
    
    if (!userId || !guildId) {
      await axios.post(
        `https://discord.com/api/v10/interactions/${message.id}/${message.token}/callback`,
        {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: "❌ Failed to identify user or guild",
            flags: MessageFlags.Ephemeral,
          },
        },
        { headers: { "Content-Type": "application/json" } }
      );
      return res.status(200).end();
    }

    // If the user already has linked accounts, show them instead of processing the modal
    const existingUserData = await getUserData(userId);
    if (existingUserData && existingUserData.accounts.length > 0) {
      let accountList = "**📋 You already have linked accounts!**\n\n";
      
      existingUserData.accounts.forEach((account, index) => {
        const isMain = account.isMain ? " ⭐" : "";
        accountList += `${index + 1}. **${account.playerName}** (#${account.playerTag}) | TH${account.townHallLevel}${isMain}\n`;
      });
      
      accountList += "\n**Use `/player` to view your accounts or `/unlink` to remove accounts.**";
      
      await axios.post(
        `https://discord.com/api/v10/interactions/${message.id}/${message.token}/callback`,
        {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: accountList,
            flags: MessageFlags.Ephemeral,
          },
        },
        { headers: { "Content-Type": "application/json" } }
      );
      return res.status(200).end();
    }

    // Extract player tag from modal
    let playerTag = '';
    components.forEach((row: any) => {
      row.components.forEach((component: any) => {
        if (component.custom_id === "player_tag_input") {
          playerTag = component.value || '';
        }
      });
    });
    
    // Validate player tag
    playerTag = playerTag.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!/^[A-Z0-9]{3,15}$/.test(playerTag)) {
      await axios.post(
        `https://discord.com/api/v10/interactions/${message.id}/${message.token}/callback`,
        {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: "❌ **Invalid Player Tag**\nExample: `#ABCDEFGH` or just `ABCDEFGH`",
            flags: MessageFlags.Ephemeral,
          },
        },
        { headers: { "Content-Type": "application/json" } }
      );
      return res.status(200).end();
    }
    
    // Check if tag is already linked (anywhere)
    const existingUserId = await getUserIdByTag(playerTag);
    if (existingUserId) {
      const existingUser = await getUserData(existingUserId);
      const existingAccount = existingUser?.accounts.find(acc => acc.playerTag === playerTag);
      
      const isSelf = existingUserId === userId;
      const errorMessage = isSelf
        ? `❌ **Already Linked**\nYou already have account **#${playerTag}** linked to your profile.`
        : `❌ **Tag Already Used**\nAccount **#${playerTag}** is already linked to another user.`;
      
      await axios.post(
        `https://discord.com/api/v10/interactions/${message.id}/${message.token}/callback`,
        {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: errorMessage,
            flags: MessageFlags.Ephemeral,
          },
        },
        { headers: { "Content-Type": "application/json" } }
      );
      return res.status(200).end();
    }
    
    // Verify player tag with CoC API
    const response = await fetch(`${COC_API_BASE_URL}/players/%23${playerTag}`, {
      headers: { 
        'Authorization': `Bearer ${process.env.COC_API_KEY}`, 
        'Accept': 'application/json' 
      },
    });
    
    if (!response.ok) {
      await axios.post(
        `https://discord.com/api/v10/interactions/${message.id}/${message.token}/callback`,
        {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: `❌ **Player Not Found**\nTag **#${playerTag}** not found. Check tag or profile privacy.`,
            flags: MessageFlags.Ephemeral,
          },
        },
        { headers: { "Content-Type": "application/json" } }
      );
      return res.status(200).end();
    }
    
    const playerData = await response.json();
    const playerName = playerData.name;
    const thLevel = playerData.townHallLevel;
    const expLevel = playerData.expLevel;
    const leagueTier = playerData.leagueTier ? {
      name: playerData.leagueTier.name,
      iconUrls: playerData.leagueTier.iconUrls
    } : undefined;
    const clan = playerData.clan ? {
      tag: playerData.clan.tag,
      name: playerData.clan.name
    } : undefined;
    const role = playerData.role;
    const warPreference = playerData.warPreference;
    
    // Get or create user data
    let userData = await getUserData(userId);
    const isFirstAccount = !userData || userData.accounts.length === 0;
    
    if (!userData) {
      userData = {
        discordId: userId,
        discordName: message.member?.user?.username || 'Unknown',
        accounts: [],
        lastUpdated: new Date().toISOString(),
      };
    }
    
    // Create new account
    const newAccount: PlayerAccount = {
      playerTag,
      playerName,
      townHallLevel: thLevel,
      expLevel,
      leagueTier,
      clan,
      role,
      warPreference,
      isMain: isFirstAccount,
      linkedAt: new Date().toISOString(),
      linkedBy: userId,
    };
    
    // Add account
    userData.accounts.push(newAccount);
    
    // If this is the first account, set as main
    if (isFirstAccount) {
      userData.mainAccountTag = playerTag;
    }
    
    // Save user data
    await setUserData(userId, userData);
    await linkTagToUser(playerTag, userId);
    
    // Assign Verified role if first account
    if (isFirstAccount) {
      const auditReason = `CoC account linked via /postlink - ${playerName} (#${playerTag})`;
      
      try {
        await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}/roles/${VERIFIED_ROLE_ID}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bot ${process.env.DISCORD_TOKEN}`,
            'Content-Type': 'application/json',
            'X-Audit-Log-Reason': auditReason
          },
        });
      } catch (roleError) {
        console.warn('Failed to assign Verified role:', roleError);
      }
      
      // Set nickname for main account
      if (newAccount.isMain) {
        try {
          const nickname = `${playerName} | TH${thLevel}`;
          await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bot ${process.env.DISCORD_TOKEN}`,
              'Content-Type': 'application/json',
              'X-Audit-Log-Reason': `Nickname set from main account ${playerName}`
            },
            body: JSON.stringify({ nick: nickname }),
          });
          userData.nickname = nickname;
          await setUserData(userId, userData);
        } catch (nicknameError) {
          console.warn('Failed to set nickname:', nicknameError);
        }
      }
    }
    
    // Send success response
    await axios.post(
      `https://discord.com/api/v10/interactions/${message.id}/${message.token}/callback`,
      {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          embeds: [{
            title: "✅ Account Successfully Linked!",
            description: `Your Discord account has been linked to your Clash of Clans account.`,
            color: 0x00ff00,
            fields: [
              { name: "👤 CoC Name", value: playerName, inline: true },
              { name: "🏷️ Player Tag", value: `#${playerTag}`, inline: true },
              { name: "🏰 Town Hall", value: `Level ${thLevel}`, inline: true },
              { name: "📊 Experience", value: `Level ${expLevel}`, inline: true },
              { name: "🏆 League", value: leagueTier?.name || "Unranked", inline: true },
              { name: "⚔️ War Pref", value: warPreference === "in" ? "Opted In" : "Opted Out", inline: true },
            ],
            footer: { 
              text: isFirstAccount 
                ? "You can now apply to join our clans!" 
                : "Use /player to manage your accounts"
            }
          }],
          flags: MessageFlags.Ephemeral,
        },
      },
      { headers: { "Content-Type": "application/json" } }
    );
    
    return res.status(200).end();
    
  } catch (error) {
    console.error("Modal handling error:", error);
    await axios.post(
      `https://discord.com/api/v10/interactions/${message.id}/${message.token}/callback`,
      {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: "❌ An error occurred while processing your request.",
          flags: MessageFlags.Ephemeral,
        },
      },
      { headers: { "Content-Type": "application/json" } }
    );
    return res.status(200).end();
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    logger.debug("Request received", { method: req.method, url: req.url });

    if (req.method !== "POST") {
      logger.warn("Method not allowed", { method: req.method });
      return res.status(405).send({ error: "Method Not Allowed" });
    }

    const signature = req.headers["x-signature-ed25519"];
    const timestamp = req.headers["x-signature-timestamp"];

    if (
      !signature ||
      !timestamp ||
      typeof signature !== "string" ||
      typeof timestamp !== "string"
    ) {
      logger.error("Invalid request headers", { signature, timestamp });
      return res.status(401).send({ error: "Invalid request headers" });
    }

    if (!process.env.DISCORD_PUBLIC_KEY) {
      logger.error("DISCORD_PUBLIC_KEY environment variable not set");
      return res
        .status(500)
        .send({ error: "Internal server configuration error" });
    }

    const rawBody = await getRawBody(req);

    if (!rawBody) {
      logger.error("Missing request body");
      return res.status(400).send({ error: "Missing request body" });
    }

    let isValidRequest = false;
    try {
      isValidRequest = await verifyKey(
        rawBody,
        signature,
        timestamp,
        process.env.DISCORD_PUBLIC_KEY,
      );
    } catch (err) {
      logger.error("Signature verification failed", {
        error: err,
        signature,
        timestamp,
      });
      return res.status(401).send({ error: "Invalid request signature" });
    }

    if (!isValidRequest) {
      logger.error("Invalid request signature", { signature, timestamp });
      return res.status(401).send({ error: "Invalid request signature" });
    }

    const message: SimplifiedInteraction & { data?: { custom_id?: string; component_type?: number }; guild_id?: string } = JSON.parse(rawBody.toString());
    logger.debug("Parsed message", { message });

    // Handle PING
    if (message.type === InteractionType.PING) {
      logger.debug("Handling Ping request");
      return res.status(200).json({ type: InteractionResponseType.Pong });
    }
    
    // Handle BUTTON CLICKS (MESSAGE_COMPONENT)
    else if (message.type === InteractionType.MESSAGE_COMPONENT) {
      logger.debug("Handling button interaction", { custom_id: message.data?.custom_id });
      
      const customId = message.data?.custom_id;
      
      // Handle refresh recruitment button
      if (customId === "refresh_recruitment") {
        try {
          // CHECK GUILD ID FIRST
          const guildId = message.guild_id;
          const MAIN_SERVER_ID = process.env.GUILD_ID || "REDACTED_WM_ID";
          
          if (guildId !== MAIN_SERVER_ID) {
            // Send error response
            await axios.post(
              `https://discord.com/api/v10/interactions/${message.id}/${message.token}/callback`,
              {
                type: InteractionResponseType.ChannelMessageWithSource,
                data: {
                  content: "❌ This button only works in the BOOM House server!",
                  flags: MessageFlags.Ephemeral,
                },
              },
              {
                headers: { "Content-Type": "application/json" },
              },
            );
            return res.status(200).end();
          }
          
          // Acknowledge the button click immediately
          await axios.post(
            `https://discord.com/api/v10/interactions/${message.id}/${message.token}/callback`,
            {
              type: InteractionResponseType.DeferredMessageUpdate,
            },
            {
              headers: { "Content-Type": "application/json" },
            },
          );
          
          // UPDATED: Fetch fresh API data before creating embed
          await RecruitmentTracker.updateFromAPI();
          
          // Update the message with fresh data
          const embed = await createRecruitmentEmbed();
          
          const components = {
            type: 1, // ACTION_ROW
            components: [
              {
                type: 2, // BUTTON
                style: 1, // PRIMARY
                custom_id: "refresh_recruitment",
                label: "Refresh",
                emoji: { name: "🔄" }
              }
            ]
          };
          
          await axios.patch(
            `https://discord.com/api/v10/webhooks/${message.application_id}/${message.token}/messages/@original`,
            {
              embeds: [embed],
              components: [components]
            },
            {
              headers: {
                "Content-Type": "application/json",
              },
            },
          );
          
          return res.status(200).end();
        } catch (error) {
          logger.error("Failed to handle button interaction", { error });
          return res.status(500).json({ error: "Failed to update message" });
        }
      }
      
      // Handle link CoC account button (opens modal) - check for existing accounts first
      if (customId === "link_coc_account") {
        try {
          const userId = message.member?.user?.id;
          
          if (!userId) {
            await axios.post(
              `https://discord.com/api/v10/interactions/${message.id}/${message.token}/callback`,
              {
                type: InteractionResponseType.ChannelMessageWithSource,
                data: {
                  content: "❌ Could not identify user.",
                  flags: MessageFlags.Ephemeral,
                },
              },
              { headers: { "Content-Type": "application/json" } }
            );
            return res.status(200).end();
          }

          // Check if user already has linked accounts
          const userData = await getUserData(userId);
          if (userData && userData.accounts.length > 0) {
            // Show their existing accounts instead of opening modal
            let accountList = "**📋 You already have linked accounts!**\n\n";
            
            userData.accounts.forEach((account, index) => {
              const isMain = account.isMain ? " ⭐" : "";
              accountList += `${index + 1}. **${account.playerName}** (#${account.playerTag}) | TH${account.townHallLevel}${isMain}\n`;
            });
            
            accountList += "\n**Use `/player` to view your accounts or `/unlink` to remove accounts.**";
            
            await axios.post(
              `https://discord.com/api/v10/interactions/${message.id}/${message.token}/callback`,
              {
                type: InteractionResponseType.ChannelMessageWithSource,
                data: {
                  content: accountList,
                  flags: MessageFlags.Ephemeral,
                },
              },
              { headers: { "Content-Type": "application/json" } }
            );
            return res.status(200).end();
          }

          // If no accounts, open the modal
          await axios.post(
            `https://discord.com/api/v10/interactions/${message.id}/${message.token}/callback`,
            {
              type: 9, // InteractionResponseType.Modal
              data: {
                custom_id: "link_coc_account_modal",
                title: "Link CoC Account",
                components: [
                  {
                    type: 1, // ACTION_ROW
                    components: [
                      {
                        type: 4, // TEXT_INPUT
                        custom_id: "player_tag_input",
                        label: "Your Player Tag",
                        style: 1, // SHORT
                        min_length: 3,
                        max_length: 15,
                        placeholder: "#ABC123 or ABC123",
                        required: true
                      }
                    ]
                  }
                ]
              }
            },
            {
              headers: { "Content-Type": "application/json" },
            },
          );
          return res.status(200).end();
        } catch (error) {
          logger.error("Failed to open modal", { error });
          return res.status(500).json({ error: "Failed to open modal" });
        }
      }

      // NEW: manage_accounts, set_main, select_account handlers
      if (customId === "manage_accounts") {
        try {
          const userId = message.member?.user?.id;
          if (!userId) {
            await axios.post(
              `https://discord.com/api/v10/interactions/${message.id}/${message.token}/callback`,
              {
                type: InteractionResponseType.ChannelMessageWithSource,
                data: {
                  content: "❌ Could not identify user.",
                  flags: MessageFlags.Ephemeral,
                },
              },
              { headers: { "Content-Type": "application/json" } }
            );
            return res.status(200).end();
          }

          // Get user data
          const userData = await getUserData(userId);
          if (!userData || userData.accounts.length === 0) {
            await axios.post(
              `https://discord.com/api/v10/interactions/${message.id}/${message.token}/callback`,
              {
                type: InteractionResponseType.ChannelMessageWithSource,
                data: {
                  content: "❌ You don't have any linked CoC accounts.\nClick the **Link Account** button to get started!",
                  flags: MessageFlags.Ephemeral,
                },
              },
              { headers: { "Content-Type": "application/json" } }
            );
            return res.status(200).end();
          }

          // Show their accounts with buttons
          let accountList = "**📋 Your Linked Accounts:**\n\n";
          
          // Create buttons for each account
          const components: any[] = [];
          const actionRows: any[] = [];
          let currentRow = {
            type: 1,
            components: [] as any[]
          };
          
          userData.accounts.forEach((account, index) => {
            const isMain = account.isMain ? " ⭐" : "";
            accountList += `${index + 1}. **${account.playerName}** (#${account.playerTag}) | TH${account.townHallLevel}${isMain}\n`;
            
            // Add button for each account (max 5 per row, Discord limit)
            if (currentRow.components.length >= 5) {
              components.push(currentRow);
              currentRow = { type: 1, components: [] };
            }

            currentRow.components.push({
              type: 2,
              style: 2, // SECONDARY
              custom_id: `view_account:${account.playerTag}`,
              label: `${index + 1}. ${account.playerName.slice(0, 10)}${account.playerName.length > 10 ? '...' : ''}`,
              emoji: account.isMain ? { name: "⭐" } : undefined
            });
          });
          
          if (currentRow.components.length > 0) {
            components.push(currentRow);
          }
          
          // Add "Set Main" button if multiple accounts
          if (userData.accounts.length > 1) {
            components.push({
              type: 1,
              components: [{
                type: 2,
                style: 1, // PRIMARY
                custom_id: "show_set_main",
                label: "Set Main Account",
                emoji: { name: "⭐" }
              }]
            });
          }

          accountList += `\n**Click a button above to view that account**\nOr use \`/player\` command for more options.`;

          await axios.post(
            `https://discord.com/api/v10/interactions/${message.id}/${message.token}/callback`,
            {
              type: InteractionResponseType.ChannelMessageWithSource,
              data: {
                content: accountList,
                components: components,
                flags: MessageFlags.Ephemeral,
              },
            },
            { headers: { "Content-Type": "application/json" } }
          );
          return res.status(200).end();

        } catch (error) {
          logger.error("Failed to handle manage_accounts:", error);
          return res.status(500).end();
        }
      }

      if (typeof customId === "string" && customId.startsWith("set_main:")) {
        try {
          const parts = customId.split(":");
          const playerTag = parts[1];
          const userId = message.member?.user?.id;

          if (!userId) {
            await axios.post(
              `https://discord.com/api/v10/interactions/${message.id}/${message.token}/callback`,
              {
                type: InteractionResponseType.ChannelMessageWithSource,
                data: {
                  content: "❌ Could not identify user.",
                  flags: MessageFlags.Ephemeral,
                },
              },
              { headers: { "Content-Type": "application/json" } }
            );
            return res.status(200).end();
          }

          // VERIFY USER OWNS THE ACCOUNT
          const userData = await getUserData(userId);
          if (!userData || !userData.accounts.some(acc => acc.playerTag === playerTag)) {
            await axios.post(
              `https://discord.com/api/v10/interactions/${message.id}/${message.token}/callback`,
              {
                type: InteractionResponseType.ChannelMessageWithSource,
                data: {
                  content: "❌ This button is for someone else's account.",
                  flags: MessageFlags.Ephemeral,
                },
              },
              { headers: { "Content-Type": "application/json" } }
            );
            return res.status(200).end();
          }

          // Defer the response
          await axios.post(
            `https://discord.com/api/v10/interactions/${message.id}/${message.token}/callback`,
            {
              type: InteractionResponseType.DeferredChannelMessageWithSource,
            },
            { headers: { "Content-Type": "application/json" } }
          );

          // Update main account logic
          let found = false;
          for (const account of userData.accounts) {
            if (account.playerTag === playerTag) {
              account.isMain = true;
              found = true;
            } else {
              account.isMain = false;
            }
          }

          if (!found) {
            await axios.patch(
              `https://discord.com/api/v10/webhooks/${message.application_id}/${message.token}/messages/@original`,
              {
                content: `❌ Account #${playerTag} not found in your linked accounts.`,
                flags: MessageFlags.Ephemeral,
              },
              { headers: { "Content-Type": "application/json" } }
            );
            return res.status(200).end();
          }

          userData.mainAccountTag = playerTag;
          userData.lastUpdated = new Date().toISOString();

          // Update nickname
          const mainAccount = userData.accounts.find(acc => acc.isMain);
          if (mainAccount) {
            const guildId = message.guild_id;
            if (guildId) {
              try {
                const nickname = `${mainAccount.playerName} | TH${mainAccount.townHallLevel}`;
                await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
                  method: 'PATCH',
                  headers: {
                    'Authorization': `Bot ${process.env.DISCORD_TOKEN}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ nick: nickname }),
                });
                userData.nickname = nickname;
              } catch (nicknameError) {
                console.warn('Failed to update nickname:', nicknameError);
              }
            }
          }

          await setUserData(userId, userData);

          await axios.patch(
            `https://discord.com/api/v10/webhooks/${message.application_id}/${message.token}/messages/@original`,
            {
              content: `✅ **Main Account Updated!**\n\n⭐ **${mainAccount?.playerName}** (#${playerTag}) is now your main account.\n\nYour nickname has been updated.`,
            },
            { headers: { "Content-Type": "application/json" } }
          );

          return res.status(200).end();

        } catch (error) {
          logger.error("Failed to set main account:", error);
          return res.status(500).end();
        }
      }

      // Handle select_account dropdown
      if (customId === "select_account") {
        try {
          const selectedTag = message.data?.values?.[0];
          const userId = message.member?.user?.id;

          if (!selectedTag || !userId) {
            return res.status(400).end();
          }

          // Defer the response
          await axios.post(
            `https://discord.com/api/v10/interactions/${message.id}/${message.token}/callback`,
            {
              type: InteractionResponseType.DeferredChannelMessageWithSource,
            },
            { headers: { "Content-Type": "application/json" } }
          );

          // Fetch fresh data for selected account
          const response = await fetch(`${COC_API_BASE_URL}/players/%23${selectedTag}`, {
            headers: { 
              'Authorization': `Bearer ${process.env.COC_API_KEY}`, 
              'Accept': 'application/json' 
            },
          });

          if (!response.ok) {
            await axios.patch(
              `https://discord.com/api/v10/webhooks/${message.application_id}/${message.token}/messages/@original`,
              {
                content: `❌ Failed to fetch data for account #${selectedTag}`,
                flags: MessageFlags.Ephemeral,
              },
              { headers: { "Content-Type": "application/json" } }
            );
            return res.status(200).end();
          }

          const playerData = await response.json();

          const embed = {
            title: `👤 ${playerData.name} (#${selectedTag})`,
            color: 0x5865F2,
            fields: [
              { name: "🏰 Town Hall", value: `Level ${playerData.townHallLevel}`, inline: true },
              { name: "📊 Experience", value: `Level ${playerData.expLevel}`, inline: true },
              { name: "🏆 League", value: playerData.leagueTier?.name || "Unranked", inline: true },
              { name: "⚔️ War Stars", value: playerData.warStars?.toString() || "0", inline: true },
              { name: "🎯 Trophies", value: playerData.trophies?.toString() || "0", inline: true },
              { name: "🏆 Best Trophies", value: playerData.bestTrophies?.toString() || "0", inline: true },
            ],
            footer: { text: "Account selected from dropdown" },
            timestamp: new Date().toISOString()
          };

          if (playerData.clan) {
            embed.fields.push({ 
              name: "👑 Clan", 
              value: `${playerData.clan.name} (${playerData.clan.tag})`, 
              inline: false 
            });
          }

          // Get user data to check if this is main account
          const userData = await getUserData(userId);
          const isMain = userData?.accounts.find(acc => acc.playerTag === selectedTag)?.isMain || false;

          const components = [];
          if (!isMain) {
            components.push({
              type: 1, // ACTION_ROW
              components: [{
                type: 2, // BUTTON
                style: 1, // PRIMARY
                custom_id: `set_main:${selectedTag}`,
                label: "Set as Main",
                emoji: { name: "⭐" }
              }]
            });
          }

          await axios.patch(
            `https://discord.com/api/v10/webhooks/${message.application_id}/${message.token}/messages/@original`,
            {
              embeds: [embed],
              components: components.length > 0 ? components : undefined,
            },
            { headers: { "Content-Type": "application/json" } }
          );

          return res.status(200).end();

        } catch (error) {
          logger.error("Failed to handle select_account:", error);
          return res.status(500).end();
        }
      }

      // Handle view_account button (shows fresh player data)
      if (customId && customId.startsWith("view_account:")) {
        try {
          const playerTag = customId.replace("view_account:", "");
          const userId = message.member?.user?.id;
          
          if (!userId) {
            await axios.post(
              `https://discord.com/api/v10/interactions/${message.id}/${message.token}/callback`,
              {
                type: InteractionResponseType.ChannelMessageWithSource,
                data: {
                  content: "❌ Could not identify user.",
                  flags: MessageFlags.Ephemeral,
                },
              },
              { headers: { "Content-Type": "application/json" } }
            );
            return res.status(200).end();
          }
          
          // Defer response
          await axios.post(
            `https://discord.com/api/v10/interactions/${message.id}/${message.token}/callback`,
            {
              type: InteractionResponseType.DeferredMessageUpdate,
            },
            { headers: { "Content-Type": "application/json" } }
          );
          
          // Fetch fresh data for selected account
          const response = await fetch(`${COC_API_BASE_URL}/players/%23${playerTag}`, {
            headers: { 
              'Authorization': `Bearer ${process.env.COC_API_KEY}`, 
              'Accept': 'application/json' 
            },
          });
          
          if (!response.ok) {
            await axios.patch(
              `https://discord.com/api/v10/webhooks/${message.application_id}/${message.token}/messages/@original`,
              {
                content: `❌ Failed to fetch data for account #${playerTag}`,
                flags: MessageFlags.Ephemeral,
              },
              { headers: { "Content-Type": "application/json" } }
            );
            return res.status(200).end();
          }
          
          const playerData = await response.json();
          
          const embed = {
            title: `👤 ${playerData.name} (#${playerTag})`,
            color: 0x5865F2,
            thumbnail: playerData.leagueTier?.iconUrls?.large ? { url: playerData.leagueTier.iconUrls.large } : undefined,
            fields: [
              { name: "🏰 Town Hall", value: `Level ${playerData.townHallLevel}`, inline: true },
              { name: "📊 Experience", value: `Level ${playerData.expLevel}`, inline: true },
              { 
                name: "🏆 League", 
                value: playerData.leagueTier ? 
                  `${playerData.leagueTier.name}` : 
                  "Unranked", 
                inline: true 
              },
              { name: "⚔️ War Stars", value: playerData.warStars?.toString() || "0", inline: true },
              { name: "🎯 Trophies", value: playerData.trophies?.toString() || "0", inline: true },
              { name: "🏆 Best Trophies", value: playerData.bestTrophies?.toString() || "0", inline: true },
            ],
            footer: { text: "Account View" },
            timestamp: new Date().toISOString()
          };

          if (playerData.warPreference) {
            embed.fields.push({ 
              name: "⚔️ War Preference", 
              value: playerData.warPreference === "in" ? "Opted In ✅" : "Opted Out ❌", 
              inline: true 
            });
          }
          
          if (playerData.role) {
            embed.fields.push({ 
              name: "👑 Clan Role", 
              value: playerData.role.charAt(0).toUpperCase() + playerData.role.slice(1), 
              inline: true 
            });
          }
          
          if (playerData.clan) {
            embed.fields.push({ 
              name: "👑 Clan", 
              value: `${playerData.clan.name} (${playerData.clan.tag})`, 
              inline: false 
            });
          }
          
          await axios.patch(
            `https://discord.com/api/v10/webhooks/${message.application_id}/${message.token}/messages/@original`,
            {
              embeds: [embed],
              flags: MessageFlags.Ephemeral,
            },
            { headers: { "Content-Type": "application/json" } }
          );
          
          return res.status(200).end();
          
        } catch (error) {
          logger.error("Failed to handle view_account:", error);
          return res.status(500).end();
        }
      }

      // Handle show_set_main button
      if (customId === "show_set_main") {
        try {
          const userId = message.member?.user?.id;
          
          if (!userId) {
            await axios.post(
              `https://discord.com/api/v10/interactions/${message.id}/${message.token}/callback`,
              {
                type: InteractionResponseType.ChannelMessageWithSource,
                data: {
                  content: "❌ Could not identify user.",
                  flags: MessageFlags.Ephemeral,
                },
              },
              { headers: { "Content-Type": "application/json" } }
            );
            return res.status(200).end();
          }
          
          // Get user data
          const userData = await getUserData(userId);
          if (!userData || userData.accounts.length < 2) {
            await axios.post(
              `https://discord.com/api/v10/interactions/${message.id}/${message.token}/callback`,
              {
                type: InteractionResponseType.ChannelMessageWithSource,
                data: {
                  content: "❌ You need at least 2 accounts to set a main account.",
                  flags: MessageFlags.Ephemeral,
                },
              },
              { headers: { "Content-Type": "application/json" } }
            );
            return res.status(200).end();
          }
          
          // Create dropdown for selecting main account
          const options = userData.accounts.map((account) => ({
            label: `${account.playerName} | TH${account.townHallLevel}${account.isMain ? ' ⭐' : ''}`,
            value: account.playerTag,
            description: `#${account.playerTag}`,
            default: account.isMain
          }));
          
          const components = [{
            type: 1,
            components: [{
              type: 3, // SELECT_MENU
              custom_id: "select_main_account",
              placeholder: "Select your main account",
              options: options.slice(0, 25) // Discord limit
            }]
          }];
          
          await axios.post(
            `https://discord.com/api/v10/interactions/${message.id}/${message.token}/callback`,
            {
              type: InteractionResponseType.ChannelMessageWithSource,
              data: {
                content: "**⭐ Select your main account:**\nYour main account determines your nickname and is shown first in your profile.",
                components: components,
                flags: MessageFlags.Ephemeral,
              },
            },
            { headers: { "Content-Type": "application/json" } }
          );
          return res.status(200).end();
          
        } catch (error) {
          logger.error("Failed to handle show_set_main:", error);
          return res.status(500).end();
        }
      }

      // Handle select_main_account dropdown
      if (customId === "select_main_account") {
        try {
          const selectedTag = message.data?.values?.[0];
          const userId = message.member?.user?.id;
          
          if (!selectedTag || !userId) {
            return res.status(400).end();
          }
          
          // Defer the response
          await axios.post(
            `https://discord.com/api/v10/interactions/${message.id}/${message.token}/callback`,
            {
              type: InteractionResponseType.DeferredMessageUpdate,
            },
            { headers: { "Content-Type": "application/json" } }
          );
          
          // Get user data
          const userData = await getUserData(userId);
          if (!userData) {
            await axios.patch(
              `https://discord.com/api/v10/webhooks/${message.application_id}/${message.token}/messages/@original`,
              {
                content: "❌ No user data found.",
                flags: MessageFlags.Ephemeral,
              },
              { headers: { "Content-Type": "application/json" } }
            );
            return res.status(200).end();
          }
          
          // Update main account logic
          let found = false;
          let newMainAccount: PlayerAccount | null = null;
          
          for (const account of userData.accounts) {
            if (account.playerTag === selectedTag) {
              account.isMain = true;
              found = true;
              newMainAccount = account;
            } else {
              account.isMain = false;
            }
          }
          
          if (!found || !newMainAccount) {
            await axios.patch(
              `https://discord.com/api/v10/webhooks/${message.application_id}/${message.token}/messages/@original`,
              {
                content: `❌ Account #${selectedTag} not found in your linked accounts.`,
                flags: MessageFlags.Ephemeral,
              },
              { headers: { "Content-Type": "application/json" } }
            );
            return res.status(200).end();
          }
          
          userData.mainAccountTag = selectedTag;
          userData.lastUpdated = new Date().toISOString();
          
          // Update nickname
          const guildId = message.guild_id;
          if (guildId) {
            try {
              const nickname = `${newMainAccount.playerName} | TH${newMainAccount.townHallLevel}`;
              await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
                method: 'PATCH',
                headers: {
                  'Authorization': `Bot ${process.env.DISCORD_TOKEN}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ nick: nickname }),
              });
              userData.nickname = nickname;
            } catch (nicknameError) {
              console.warn('Failed to update nickname:', nicknameError);
            }
          }
          
          await setUserData(userId, userData);
          
          await axios.patch(
            `https://discord.com/api/v10/webhooks/${message.application_id}/${message.token}/messages/@original`,
            {
              content: `✅ **Main Account Updated!**\n\n⭐ **${newMainAccount.playerName}** (#${selectedTag}) is now your main account.\n\nYour nickname has been updated.`,
              flags: MessageFlags.Ephemeral,
            },
            { headers: { "Content-Type": "application/json" } }
          );
          
          return res.status(200).end();
          
        } catch (error) {
          logger.error("Failed to handle select_main_account:", error);
          return res.status(500).end();
        }
      }

      // Handle unlink_account button
      if (customId && customId.startsWith("unlink_account:")) {
        try {
          const parts = customId.split(":");
          const playerTag = parts[1];
          const expectedUserId = parts[2]; // User ID from the button
          
          const userId = message.member?.user?.id;
          
          // VERIFY USER MATCHES BUTTON OWNER
          if (!userId || userId !== expectedUserId) {
            await axios.post(
              `https://discord.com/api/v10/interactions/${message.id}/${message.token}/callback`,
              {
                type: InteractionResponseType.ChannelMessageWithSource,
                data: {
                  content: "❌ These buttons are for someone else's accounts. Use `/unlink` to manage your own accounts.",
                  flags: MessageFlags.Ephemeral,
                },
              },
              { headers: { "Content-Type": "application/json" } }
            );
            return res.status(200).end();
          }
          
          // Defer response
          await axios.post(
            `https://discord.com/api/v10/interactions/${message.id}/${message.token}/callback`,
            {
              type: InteractionResponseType.DeferredChannelMessageWithSource,
            },
            { headers: { "Content-Type": "application/json" } }
          );
          
          // Get user data
          const userData = await getUserData(userId);
          if (!userData) {
            await axios.patch(
              `https://discord.com/api/v10/webhooks/${message.application_id}/${message.token}/messages/@original`,
              {
                content: "❌ No user data found.",
                flags: MessageFlags.Ephemeral,
              },
              { headers: { "Content-Type": "application/json" } }
            );
            return res.status(200).end();
          }
          
          // Find the account
          const accountIndex = userData.accounts.findIndex(acc => acc.playerTag === playerTag);
          if (accountIndex === -1) {
            await axios.patch(
              `https://discord.com/api/v10/webhooks/${message.application_id}/${message.token}/messages/@original`,
              {
                content: `❌ Account #${playerTag} not found in your linked accounts.`,
                flags: MessageFlags.Ephemeral,
              },
              { headers: { "Content-Type": "application/json" } }
            );
            return res.status(200).end();
          }
          
          const accountToRemove = userData.accounts[accountIndex];
          const isMainAccount = accountToRemove.isMain;
          const isOnlyAccount = userData.accounts.length === 1;
          
          // Remove the account
          userData.accounts.splice(accountIndex, 1);
          userData.lastUpdated = new Date().toISOString();
          await unlinkTag(playerTag);
          
          // Handle main account reassignment if needed
          if (isMainAccount && userData.accounts.length > 0) {
            userData.accounts[0].isMain = true;
            userData.mainAccountTag = userData.accounts[0].playerTag;
            
            // Update nickname
            const newMain = userData.accounts[0];
            const guildId = message.guild_id!;
            try {
              const nickname = `${newMain.playerName} | TH${newMain.townHallLevel}`;
              await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
                method: 'PATCH',
                headers: {
                  'Authorization': `Bot ${process.env.DISCORD_TOKEN}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ nick: nickname }),
              });
              userData.nickname = nickname;
            } catch (nicknameError) {
              console.warn('Failed to update nickname:', nicknameError);
            }
          } else if (isOnlyAccount) {
            userData.mainAccountTag = undefined;
            userData.nickname = undefined;
            
            // Remove nickname and Verified role
            const guildId = message.guild_id!;
            try {
              await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
                method: 'PATCH',
                headers: {
                  'Authorization': `Bot ${process.env.DISCORD_TOKEN}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ nick: null }),
              });
            } catch (nicknameError) {
              console.warn('Failed to remove nickname:', nicknameError);
            }
            
            try {
              await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}/roles/${VERIFIED_ROLE_ID}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bot ${process.env.DISCORD_TOKEN}`,
                  'Content-Type': 'application/json',
                },
              });
            } catch (roleError) {
              console.warn('Failed to remove Verified role:', roleError);
            }
          }
          
          // Save updated data
          await setUserData(userId, userData);
          
          let responseText = `✅ **Account Unlinked!**\n\n` +
            `**👤 Account:** ${accountToRemove.playerName}\n` +
            `**🏷️ Player Tag:** #${accountToRemove.playerTag}\n\n`;
          
          if (isMainAccount && userData.accounts.length > 0) {
            const newMain = userData.accounts[0];
            responseText += `⭐ **New main account:** ${newMain.playerName} (#${newMain.playerTag})\n`;
          }
          
          if (isOnlyAccount) {
            responseText += `📝 **No accounts remaining.** Verified role and nickname removed.\n`;
          } else {
            responseText += `📊 **Remaining accounts:** ${userData.accounts.length}`;
          }
          
          await axios.patch(
            `https://discord.com/api/v10/webhooks/${message.application_id}/${message.token}/messages/@original`,
            {
              content: responseText,
              flags: MessageFlags.Ephemeral,
            },
            { headers: { "Content-Type": "application/json" } }
          );
          
          return res.status(200).end();
          
        } catch (error) {
          logger.error("Failed to handle unlink_account button:", error);
          return res.status(500).end();
        }
      }
      
      logger.warn("Unknown button custom_id", { custom_id: customId });
      return res.status(400).json({ error: "Unknown button" });
    }
    
    // Handle MODAL SUBMISSIONS
    else if (message.type === 5) { // InteractionType.MODAL_SUBMIT
      logger.debug("Handling modal submission", { custom_id: message.data?.custom_id });
      
      const customId = message.data?.custom_id;
      
      if (customId === "link_coc_account_modal") {
        return handleCocLinkModal(message, res);
      }
      
      logger.warn("Unknown modal custom_id", { custom_id: customId });
      return res.status(400).json({ error: "Unknown modal" });
    }
    
    // Handle APPLICATION_COMMAND (slash commands)
    else if (message.type === InteractionType.APPLICATION_COMMAND) {
      const commandName = message.data.name.toLowerCase();
      logger.debug("Handling application command", { commandName });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const command: Command = (commands as any)[commandName];

      if (command) {
        // Immediately defer the command
        try {
          await axios.post(
            `https://discord.com/api/v10/interactions/${message.id}/${message.token}/callback`,
            {
              type: InteractionResponseType.DeferredChannelMessageWithSource,
              data: {
                flags: command.data.initialEphemeral
                  ? MessageFlags.Ephemeral
                  : 0,
              },
            },
            {
              headers: { "Content-Type": "application/json" },
            },
          );
        } catch (deferError) {
          logger.error("Failed to defer command", { deferError });
          return res.status(500).json({ error: "Failed to defer command" });
        }

        // Process the command asynchronously
        let commandResult: CommandExecuteUnpromised;
        try {
          commandResult = await command.execute({ interaction: message });
          logger.debug("Command executed successfully", { commandName });
        } catch (error) {
          logger.error("Error executing command", {
            commandName,
            error,
          });
          commandResult = {
            content: "An error occurred while processing your request.",
            flags: MessageFlags.Ephemeral,
          };
        }

        // PATCH the original response
        try {
          await axios.patch(
            `https://discord.com/api/v10/webhooks/${message.application_id}/${message.token}/messages/@original`,
            {
              content: commandResult.content ?? "",
              embeds: commandResult.embeds || [],
              components: commandResult.components || [],
              flags: commandResult.flags || 0,
            },
            {
              headers: {
                "Content-Type": "application/json",
              },
            },
          );
          logger.debug("Original response edited successfully");

          return res.status(200).end();
        } catch (patchError) {
          logger.error("Failed to edit original response", {
            patchError,
          });
          return res
            .status(500)
            .json({ error: "Failed to update the message." });
        }
      }

      logger.warn("Unknown command", { commandName });
      return res.status(400).json({ error: "Unknown Command" });
    } else {
      logger.warn("Unknown Interaction Type", { type: message.type });
      return res.status(400).json({ error: "Unknown Interaction Type" });
    }
  } catch (error) {
    logger.error("Error processing request", {
      error,
    });
    return res.status(500).json({
      error: "Failed to process request",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
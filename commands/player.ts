// commands/player.ts
import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  InteractionResponseType,
  MessageFlags,
} from "discord-api-types/v10";
import type {
  CommandData,
  CommandExecuteResult,
  SimplifiedInteraction,
} from "../utils/types";
import { getUserData, setUserData } from "../utils/dbHelper";
import axios from "axios";

const MAIN_SERVER_ID = process.env.GUILD_ID || "REDACTED_WM_ID";
const COC_API_BASE_URL = "https://cocproxy.royaleapi.dev/v1";

// Helper function to render player stats with secure component IDs
async function renderPlayerStats(
  playerTag: string,
  userData: any,
  isSelf: boolean,
  ownerId: string
) {
  // Fetch fresh API data
  let playerData = userData.accounts.find((acc: any) => acc.playerTag === playerTag) as any;
  
  try {
    const response = await fetch(`${COC_API_BASE_URL}/players/%23${playerTag}`, {
      headers: {
        'Authorization': `Bearer ${process.env.COC_API_KEY}`,
        'Accept': 'application/json'
      },
    });
    if (response.ok) {
      playerData = await response.json();
    }
  } catch (error) {
    console.warn("Failed to fetch fresh data:", error);
  }

  const titlePrefix = isSelf ? "Your" : "Their";
  const mainAccount = userData.accounts.find((acc: any) => acc.isMain) || userData.accounts[0];
  
  const embed: any = {
    title: `📊 ${titlePrefix} Player Stats`,
    color: 0x5865F2,
    thumbnail: playerData.leagueTier?.iconUrls?.large ? { url: playerData.leagueTier.iconUrls.large } : undefined,
    fields: [
      { name: "👤 CoC Name", value: playerData.name || mainAccount.playerName, inline: true },
      { name: "🏷️ Player Tag", value: `#${playerTag}`, inline: true },
      { name: "⭐ Status", value: mainAccount.playerTag === playerTag ? "Main Account" : "Linked Account", inline: true },
      { name: "🏰 Town Hall", value: `Level ${playerData.townHallLevel || mainAccount.townHallLevel}`, inline: true },
      { name: "📊 Experience", value: `Level ${playerData.expLevel || mainAccount.expLevel}`, inline: true },
      { name: "🏆 League", value: playerData.leagueTier?.name || mainAccount.leagueTier || "Unranked", inline: true },
    ],
    footer: {
      text: isSelf
        ? `You have ${userData.accounts.length} linked account${userData.accounts.length > 1 ? 's' : ''}`
        : `${userData.accounts.length} account${userData.accounts.length > 1 ? 's' : ''}`
    },
    timestamp: new Date().toISOString()
  };

  if (playerData.clan || mainAccount.clan) {
    const clan = playerData.clan || mainAccount.clan;
    embed.fields.push({
      name: "👑 Current Clan",
      value: `${clan?.name} (${clan?.tag})`,
      inline: false
    });
  }

  if (userData.clan) {
    const clanMap = {
      WM: "WAR MASTER",
      LE: "LEGENDS",
      ZP: "ZwartePiet",
      CH: "Clash Heros",
      SP: "SP.OPS.DIVISION"
    };

    embed.fields.push({
      name: "🏰 BOOM House",
      value: `${clanMap[userData.clan as keyof typeof clanMap] || userData.clan}`,
      inline: false
    });
  }

  if (userData.recruitedAt) {
    const date = new Date(userData.recruitedAt).toLocaleDateString();
    embed.fields.push({
      name: "📅 Joined BOOM",
      value: date,
      inline: true
    });
  }

  if (userData.recruitedBy) {
    embed.fields.push({
      name: "👤 Recruited By",
      value: `<@${userData.recruitedBy}>`,
      inline: true
    });
  }

  const components = [];

  // Only show buttons if the user is viewing their own profile (isSelf)
  if (userData.accounts.length > 1 && isSelf) {
    const options = userData.accounts.map((acc: any) => ({
      label: `${acc.playerName} (TH${acc.townHallLevel})`,
      value: acc.playerTag,
      default: acc.playerTag === playerTag,
      emoji: acc.isMain ? { name: "⭐" } : undefined
    }));

    components.push({
      type: 1,
      components: [{
        type: 3, // String Select
        // SECURE: Embed the ownerId into the custom_id
        custom_id: `select_account:${ownerId}`,
        placeholder: "Select an account to view",
        options: options.slice(0, 25)
      }]
    });

    const currentAccount = userData.accounts.find((acc: any) => acc.playerTag === playerTag);
    if (currentAccount && !currentAccount.isMain) {
      components.push({
        type: 1,
        components: [{
          type: 2,
          style: 1,
          // SECURE: Embed the ownerId into the custom_id
          custom_id: `set_main:${playerTag}:${ownerId}`,
          label: "Set as Main Account",
          emoji: { name: "⭐" }
        }]
      });
    }
  }

  // Response flags: Ephemeral if looking at someone else, Public if looking at self
  return { embeds: [embed], components, flags: isSelf ? undefined : MessageFlags.Ephemeral };
}

export default {
  data: {
    name: "player",
    description: "View Clash of Clans player stats",
    type: ApplicationCommandType.ChatInput,
    options: [
      {
        name: "tag",
        description: "Player tag to look up (for any player)",
        type: ApplicationCommandOptionType.String,
        required: false,
      },
      {
        name: "user",
        description: "Discord user to view their linked accounts",
        type: ApplicationCommandOptionType.User,
        required: false,
      }
    ]
  } as CommandData,

  // 1. Main Command
  async execute(data: {
    interaction: SimplifiedInteraction;
  }): Promise<CommandExecuteResult> {
    const interaction = data.interaction;

    if (interaction.guild_id !== MAIN_SERVER_ID) {
      return {
        content: "<a:redcross:1439044567415521443> This command only works in the BOOM House server!",
        flags: MessageFlags.Ephemeral,
      };
    }

    const options = interaction.data.options || [];
    const tagOption = options.find((opt: any) => opt.name === "tag");
    const userOption = options.find((opt: any) => opt.name === "user");
    
    const rawTag = tagOption?.value;
    const targetUserId = (userOption?.value || interaction.member?.user?.id) as string | undefined;
    if (!targetUserId) {
      return {
        content: "<a:redcross:1439044567415521443> Could not identify the target user.",
        flags: MessageFlags.Ephemeral,
      };
    }
    
    // Get target user
    const targetUser = userOption 
      ? interaction.data.resolved?.users?.[String(targetUserId)]
      : interaction.member?.user;
    
    if (!targetUser) {
      return {
        content: "<a:redcross:1439044567415521443> Could not find the specified user.",
        flags: MessageFlags.Ephemeral,
      };
    }

    // CASE 1: Looking up by tag (any player)
    if (rawTag) {
      const playerTag = rawTag.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      
      try {
        const response = await fetch(`${COC_API_BASE_URL}/players/%23${playerTag}`, {
          headers: { 
            'Authorization': `Bearer ${process.env.COC_API_KEY}`, 
            'Accept': 'application/json' 
          },
        });

        if (!response.ok) {
          return {
            content: `<a:redcross:1439044567415521443> **Player Not Found**\nTag **#${playerTag}** not found.`,
            flags: MessageFlags.Ephemeral,
          };
        }

        const playerData = await response.json();
        
        const embed = {
          title: `👤 ${playerData.name} (#${playerTag})`,
          color: 0x5865F2,
          thumbnail: playerData.leagueTier?.iconUrls?.large ? { url: playerData.leagueTier.iconUrls.large } : undefined,
          fields: [
            { name: "🏰 Town Hall", value: `Level ${playerData.townHallLevel}`, inline: true },
            { name: "📊 Experience", value: `Level ${playerData.expLevel}`, inline: true },
            { name: "🏆 League", value: playerData.leagueTier?.name || "Unranked", inline: true },
            { name: "⚔️ War Stars", value: playerData.warStars?.toString() || "0", inline: true },
            { name: "🎯 Trophies", value: playerData.trophies?.toString() || "0", inline: true },
            { name: "🏆 Best Trophies", value: playerData.bestTrophies?.toString() || "0", inline: true },
          ],
          footer: { text: "Player Lookup" },
          timestamp: new Date().toISOString()
        };

        if (playerData.warPreference) {
          embed.fields.push({
            name: "⚔️ War Preference",
            value: playerData.warPreference === "in" ? "Opted In <a:AnimatedCheck:1427570005750448169>" : "Opted Out <a:redcross:1439044567415521443>",
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

        return {
          content: "",
          embeds: [embed]
        };
      } catch (error) {
        return {
          content: `<a:redcross:1439044567415521443> **Lookup Failed**\n${error instanceof Error ? error.message : "Unknown error"}`,
          flags: MessageFlags.Ephemeral,
        };
      }
    }

    // CASE 2: Looking up user's linked accounts
    const userData = await getUserData(targetUserId);
    if (!userData || userData.accounts.length === 0) {
      const isSelf = targetUserId === interaction.member?.user?.id;
      const userMention = isSelf ? "You don't" : `<@${targetUserId}> doesn't`;
      return {
        content: `${userMention} have any linked CoC accounts.\nUse \`/link\` to link an account.`,
        flags: MessageFlags.Ephemeral,
      };
    }

    const mainAccount = userData.accounts.find((acc) => acc.isMain) || userData.accounts[0];
    const isSelf = targetUserId === interaction.member?.user?.id;
    
    // Fetch fresh API data
    let playerData = mainAccount as any;
    try {
      const response = await fetch(`${COC_API_BASE_URL}/players/%23${mainAccount.playerTag}`, {
        headers: { 
          'Authorization': `Bearer ${process.env.COC_API_KEY}`, 
          'Accept': 'application/json' 
        },
      });
      if (response.ok) {
        playerData = await response.json();
      }
    } catch (error) {
      console.warn("Failed to fetch fresh data:", error);
    }

    const titlePrefix = isSelf ? "Your" : `${targetUser.username}'s`;
    const embed: any = {
      title: `📊 ${titlePrefix} Player Stats`,
      color: 0x5865F2,
      thumbnail: playerData.leagueTier?.iconUrls?.large ? { url: playerData.leagueTier.iconUrls.large } : undefined,
      fields: [
        { name: "👤 CoC Name", value: playerData.name || mainAccount.playerName, inline: true },
        { name: "🏷️ Player Tag", value: `#${mainAccount.playerTag}`, inline: true },
        { name: "⭐ Status", value: mainAccount.isMain ? "Main Account" : "Linked Account", inline: true },
        { name: "🏰 Town Hall", value: `Level ${playerData.townHallLevel || mainAccount.townHallLevel}`, inline: true },
        { name: "📊 Experience", value: `Level ${playerData.expLevel || mainAccount.expLevel}`, inline: true },
        { name: "🏆 League", value: playerData.leagueTier?.name || mainAccount.leagueTier || "Unranked", inline: true },
      ],
      footer: {
        text: isSelf 
          ? `You have ${userData.accounts.length} linked account${userData.accounts.length > 1 ? 's' : ''}` 
          : `${targetUser.username} has ${userData.accounts.length} linked account${userData.accounts.length > 1 ? 's' : ''}` 
      },
      timestamp: new Date().toISOString()
    };
    
    if (playerData.clan || mainAccount.clan) {
      const clan = playerData.clan || mainAccount.clan;
      embed.fields.push({ 
        name: "👑 Current Clan", 
        value: `${clan?.name} (${clan?.tag})`, 
        inline: false 
      });
    }
    
    // Add BOOM House info if available
    if (userData.clan) {
      const clanMap = {
        WM: "WAR MASTER",
        LE: "LEGENDS", 
        ZP: "ZwartePiet",
        CH: "Clash Heros",
        SP: "SP.OPS.DIVISION"
      };
      
      embed.fields.push({ 
        name: "🏰 BOOM House", 
        value: `${clanMap[userData.clan as keyof typeof clanMap] || userData.clan}`, 
        inline: false 
      });
    }
    
    if (userData.recruitedAt) {
      const date = new Date(userData.recruitedAt).toLocaleDateString();
      embed.fields.push({ 
        name: "📅 Joined BOOM", 
        value: date, 
        inline: true 
      });
    }
    
    if (userData.recruitedBy) {
      embed.fields.push({ 
        name: "👤 Recruited By", 
        value: `<@${userData.recruitedBy}>`, 
        inline: true 
      });
    }
    
    return await renderPlayerStats(mainAccount.playerTag, userData, isSelf, targetUserId);
  },

  // 2. Handlers for Dropdown & Button
  handlers: {
    // Handle Account Selection Dropdown - SECURE: Verify ownerId
    "select_account": async ({ interaction, args }: { interaction: SimplifiedInteraction; args: string[] }) => {
      const [ownerId] = args; // SECURE: Extract ownerId from custom_id
      const selectedTag = interaction.data?.values?.[0];
      const userId = interaction.member?.user?.id;

      // SECURITY CHECK: Verify that the user clicking the button owns this profile
      if (userId !== ownerId) {
        await axios.post(
          `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`,
          {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: "<a:Warning:1456190079830720625> This button is not for you.",
              flags: MessageFlags.Ephemeral
            }
          }
        );
        return;
      }

      if (!selectedTag || !userId) {
        return;
      }

      // Defer the response
      await axios.post(
        `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`,
        {
          type: InteractionResponseType.DeferredChannelMessageWithSource,
        },
        { headers: { "Content-Type": "application/json" } }
      );

      try {
        // Fetch fresh data for selected account
        const response = await fetch(`${COC_API_BASE_URL}/players/%23${selectedTag}`, {
          headers: { 
            'Authorization': `Bearer ${process.env.COC_API_KEY}`, 
            'Accept': 'application/json' 
          },
        });

        if (!response.ok) {
          await axios.patch(
            `https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`,
            {
              content: `<a:redcross:1439044567415521443> Failed to fetch data for account #${selectedTag}`,
              flags: MessageFlags.Ephemeral,
            },
            { headers: { "Content-Type": "application/json" } }
          );
          return;
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
              custom_id: `set_main:${selectedTag}:${ownerId}`, // SECURE: Embed ownerId
              label: "Set as Main",
              emoji: { name: "⭐" }
            }]
          });
        }

        await axios.patch(
          `https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`,
          {
            embeds: [embed],
            components: components.length > 0 ? components : undefined,
          },
          { headers: { "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error("Failed to handle select_account:", error);
      }
    },

    // Handle "Set as Main" Button - SECURE: Verify ownerId
    "set_main": async ({ interaction, args }: { interaction: SimplifiedInteraction; args: string[] }) => {
      const [selectedTag, ownerId] = args; // SECURE: Extract ownerId from custom_id (set_main:TAG:OWNER_ID)
      const userId = interaction.member?.user?.id;

      // SECURITY CHECK: Verify that the user clicking the button owns this profile
      if (userId !== ownerId) {
        await axios.post(
          `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`,
          {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: "<a:Warning:1456190079830720625> This button is not for you.",
              flags: MessageFlags.Ephemeral
            }
          }
        );
        return;
      }

      if (!selectedTag || !userId) {
        return;
      }

      // Defer the response
      await axios.post(
        `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`,
        {
          type: InteractionResponseType.DeferredMessageUpdate,
        },
        { headers: { "Content-Type": "application/json" } }
      );

      try {
        // Get user data
        let userData = await getUserData(userId);
        if (!userData) {
          await axios.patch(
            `https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`,
            {
              content: "<a:redcross:1439044567415521443> No user data found.",
              flags: MessageFlags.Ephemeral,
            },
            { headers: { "Content-Type": "application/json" } }
          );
          return;
        }

        // Update main account logic
        let found = false;
        for (const account of userData.accounts) {
          if (account.playerTag === selectedTag) {
            account.isMain = true;
            found = true;
          } else {
            account.isMain = false;
          }
        }

        if (!found) {
          await axios.patch(
            `https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`,
            {
              content: `<a:redcross:1439044567415521443> Account #${selectedTag} not found in your linked accounts.`,
              flags: MessageFlags.Ephemeral,
            },
            { headers: { "Content-Type": "application/json" } }
          );
          return;
        }

        userData.mainAccountTag = selectedTag;
        userData.lastUpdated = new Date().toISOString();

        // Update nickname
        const guildId = interaction.guild_id;
        const mainAccount = userData.accounts.find(acc => acc.isMain);
        if (mainAccount && guildId) {
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

        await setUserData(userId, userData);

        await axios.patch(
          `https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`,
          {
            content: `<a:AnimatedCheck:1427570005750448169> **Main Account Updated!**\n\n⭐ **${mainAccount?.playerName}** (#${selectedTag}) is now your main account.\n\nYour nickname has been updated.`,
          },
          { headers: { "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error("Failed to set main account:", error);
      }
    }
  }
};

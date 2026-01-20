// commands/link.ts
import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  InteractionResponseType,
  MessageFlags,
  PermissionFlagsBits,
} from "discord-api-types/v10";
import axios from "axios";
import type {
  CommandData,
  CommandExecuteResult,
  SimplifiedInteraction,
} from "../utils/types";
import { getUserData, setUserData, getUserIdByTag, linkTagToUser, type UserData, type PlayerAccount } from "../utils/kvHelper";

const MAIN_SERVER_ID = process.env.GUILD_ID || "REDACTED_WM_ID";
const COC_API_BASE_URL = "https://cocproxy.royaleapi.dev/v1";
const VERIFIED_ROLE_ID = "REDACTED_VERIFIED_ID";

export default {
  data: {
    name: "link",
    description: "Link a Clash of Clans account to a Discord user",
    type: ApplicationCommandType.ChatInput,
    default_member_permissions: PermissionFlagsBits.ManageRoles.toString(),
    options: [
      {
        name: "player_tag",
        description: "Player's Clash of Clans tag (e.g., #ABC123)",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: "user",
        description: "Discord user to link account to (defaults to yourself)",
        type: ApplicationCommandOptionType.User,
        required: false,
      }
    ]
  } as CommandData,
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
    const playerTagOption = options.find((opt: any) => opt.name === "player_tag");
    const userOption = options.find((opt: any) => opt.name === "user");
    
    const rawPlayerTag = playerTagOption?.value;
    if (typeof rawPlayerTag !== "string" || !rawPlayerTag) {
      return {
        content: "<a:redcross:1439044567415521443> Missing player tag.",
        flags: MessageFlags.Ephemeral,
      };
    }
    const targetUserId = userOption?.value || interaction.member?.user?.id;
    
    if (!targetUserId) {
      return {
        content: "<a:redcross:1439044567415521443> Could not identify target user.",
        flags: MessageFlags.Ephemeral,
      };
    }

    // Get target user info
    const targetUser = userOption 
      ? interaction.data.resolved?.users?.[targetUserId]
      : interaction.member?.user;
    
    if (!targetUser) {
      return {
        content: "<a:redcross:1439044567415521443> Could not find the specified user.",
        flags: MessageFlags.Ephemeral,
      };
    }

    // Validate player tag
    const playerTag = rawPlayerTag.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!/^[A-Z0-9]{3,15}$/.test(playerTag)) {
      return {
        content: "<a:redcross:1439044567415521443> **Invalid Player Tag**\nExample: `#ABCDEFGH` or just `ABCDEFGH`",
        flags: MessageFlags.Ephemeral,
      };
    }

    try {
      // Verify player tag with CoC API
      const response = await fetch(`${COC_API_BASE_URL}/players/%23${playerTag}`, {
        headers: { 
          'Authorization': `Bearer ${process.env.COC_API_KEY}`, 
          'Accept': 'application/json' 
        },
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          return {
            content: `<a:redcross:1439044567415521443> **Player Not Found**\nTag **#${playerTag}** not found. Check tag or profile privacy.`,
            flags: MessageFlags.Ephemeral,
          };
        }
        throw new Error(`CoC API error: ${response.status}`);
      }
      
      const playerData = await response.json();
      const playerName = playerData.name;
      const thLevel = playerData.townHallLevel;
      const expLevel = playerData.expLevel;
      const leagueTier = playerData.leagueTier?.name || "Unranked";
      const clan = playerData.clan ? {
        tag: playerData.clan.tag,
        name: playerData.clan.name
      } : undefined;
      const role = playerData.role;
      const warPreference = playerData.warPreference;
      
      // Check if tag is already linked to someone else
      // (We need to implement tag lookup - for now skip this check)
      
      // Get existing user data (ensure non-null)
      let userData = (await getUserData(targetUserId)) ?? {
        discordId: targetUserId,
        discordName: targetUser.username,
        accounts: [],
        lastUpdated: new Date().toISOString(),
      };
      const isFirstAccount = userData.accounts.length === 0;
      
      // Check if account already linked to this user
      const existingAccount = userData.accounts.find(acc => acc.playerTag === playerTag);
      if (existingAccount) {
        return {
          content: `<a:redcross:1439044567415521443> **Already Linked**\nThis account (#${playerTag}) is already linked to <@${targetUserId}>.`,
          flags: MessageFlags.Ephemeral,
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
        isMain: isFirstAccount, // First account becomes main
        linkedAt: new Date().toISOString(),
        linkedBy: interaction.member?.user?.id // Who performed the linking
      };
      
      // Add account
      userData.accounts.push(newAccount);
      
      // If this is the first account, set as main
      if (isFirstAccount) {
        userData.mainAccountTag = playerTag;
      }
      
      // Save user data
      await setUserData(targetUserId, userData);
      
      // Assign Verified role if first account
      if (isFirstAccount) {
        const guildId = interaction.guild_id!;
        const auditReason = `CoC account linked by ${interaction.member?.user?.username}`;
        
        try {
          await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${targetUserId}/roles/${VERIFIED_ROLE_ID}`, {
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
            await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${targetUserId}`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bot ${process.env.DISCORD_TOKEN}`,
                'Content-Type': 'application/json',
                'X-Audit-Log-Reason': `Nickname set from main account ${playerName}`
              },
              body: JSON.stringify({ nick: nickname }),
            });
            userData.nickname = nickname;
            await setUserData(targetUserId, userData);
          } catch (nicknameError) {
            console.warn('Failed to set nickname:', nicknameError);
          }
        }
      }
      
      // Build response
      const linkedByOthers = targetUserId !== interaction.member?.user?.id;
      const mention = linkedByOthers ? `<@${targetUserId}> ` : '';
      const linkedByText = linkedByOthers ? ` (linked by <@${interaction.member?.user?.id}>)` : '';
      
      let responseText = `${mention}<a:AnimatedCheck:1427570005750448169> **Account Successfully Linked!**${linkedByText}\n\n` +
        `**👤 CoC Account:** ${playerName}\n` +
        `**🏷️ Player Tag:** #${playerTag}\n` +
        `**🏰 Town Hall:** Level ${thLevel}\n` +
        `**📊 Experience:** Level ${expLevel}\n` +
        `**🏆 League:** ${leagueTier}\n`;
      
      if (clan) {
        responseText += `**👑 Clan:** ${clan.name}\n`;
      }
      
      responseText += `\n` +
        (isFirstAccount 
          ? `🎉 **First account linked!** You now have the Verified role.`
          : `📝 **Additional account linked!** You now have ${userData.accounts.length} linked accounts.`);
      
      if (newAccount.isMain) {
        responseText += `\n⭐ **This is now your main account.** Your nickname has been updated.`;
      } else {
        responseText += `\n💡 Use \`/player\` to view your accounts or set a different one as main.`;
      }
      
      return {
        content: responseText,
      };
      
    } catch (error: any) {
      console.error('Error in link command:', error);
      return {
        content: `<a:redcross:1439044567415521443> **Linking Failed**\n${error instanceof Error ? error.message : 'Unknown error'}`,
        flags: MessageFlags.Ephemeral,
      };
    }
  },

  // Handlers for button and modal interactions
  handlers: {
    // 1. Button: "Link Account" - Opens modal
    "link_coc_account": async ({ interaction }: { interaction: SimplifiedInteraction }) => {
      const userId = interaction.member?.user?.id;
      const guildId = interaction.guild_id;

      if (!userId || !guildId) {
        await axios.post(
          `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`,
          {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: "<a:redcross:1439044567415521443> Could not identify user or guild.",
              flags: MessageFlags.Ephemeral,
            },
          },
          { headers: { "Content-Type": "application/json" } }
        );
        return;
      }

      // Check if user already has linked accounts
      const userData = await getUserData(userId);
      if (userData && userData.accounts.length > 0) {
        // Show accounts list instead of link modal
        let accountList = "**📋 You already have linked accounts!**\n\n";
        userData.accounts.forEach((account, index) => {
          const isMain = account.isMain ? " ⭐" : "";
          accountList += `${index + 1}. **${account.playerName}** (#${account.playerTag}) | TH${account.townHallLevel}${isMain}\n`;
        });
        accountList += "\n**Use `/player` to view your accounts or `/unlink` to remove accounts.**";

        await axios.post(
          `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`,
          {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: accountList,
              flags: MessageFlags.Ephemeral,
            },
          },
          { headers: { "Content-Type": "application/json" } }
        );
        return;
      }

      // Open the link modal
      await axios.post(
        `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`,
        {
          type: InteractionResponseType.Modal,
          data: {
            custom_id: "link_coc_account_modal",
            title: "Link Clash of Clans Account",
            components: [
              {
                type: 1,
                components: [
                  {
                    type: 4, // TEXT_INPUT
                    custom_id: "player_tag_input",
                    label: "Your Player Tag",
                    style: 1, // SHORT
                    placeholder: "#ABC123 or ABC123",
                    min_length: 3,
                    max_length: 15,
                    required: true,
                  },
                ],
              },
            ],
          },
        },
        { headers: { "Content-Type": "application/json" } }
      );
    },

    // 2. Modal: "Link CoC Account Modal" - Process linking
    "link_coc_account_modal": async ({ interaction }: { interaction: SimplifiedInteraction }) => {
      const userId = interaction.member?.user?.id;
      const guildId = interaction.guild_id;
      const components = interaction.data?.components || [];

      if (!userId || !guildId) {
        await axios.post(
          `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`,
          {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: "<a:redcross:1439044567415521443> Failed to identify user or guild",
              flags: MessageFlags.Ephemeral,
            },
          },
          { headers: { "Content-Type": "application/json" } }
        );
        return;
      }

      // Extract player tag from modal
      let playerTag = "";
      components.forEach((row: any) => {
        row.components.forEach((component: any) => {
          if (component.custom_id === "player_tag_input") {
            playerTag = component.value || "";
          }
        });
      });

      // Validate player tag
      playerTag = playerTag.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (!/^[A-Z0-9]{3,15}$/.test(playerTag)) {
        await axios.post(
          `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`,
          {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: "<a:redcross:1439044567415521443> **Invalid Player Tag**\nExample: `#ABCDEFGH` or just `ABCDEFGH`",
              flags: MessageFlags.Ephemeral,
            },
          },
          { headers: { "Content-Type": "application/json" } }
        );
        return;
      }

      // Check if tag is already linked
      const existingUserId = await getUserIdByTag(playerTag);
      if (existingUserId) {
        const existingUser = await getUserData(existingUserId);
        const isSelf = existingUserId === userId;
        const errorMessage = isSelf
          ? `<a:redcross:1439044567415521443> **Already Linked**\nYou already have account **#${playerTag}** linked to your profile.`
          : `<a:redcross:1439044567415521443> **Tag Already Used**\nAccount **#${playerTag}** is already linked to another user.`;

        await axios.post(
          `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`,
          {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: errorMessage,
              flags: MessageFlags.Ephemeral,
            },
          },
          { headers: { "Content-Type": "application/json" } }
        );
        return;
      }

      // Verify player tag with CoC API
      try {
        const response = await fetch(`${COC_API_BASE_URL}/players/%23${playerTag}`, {
          headers: {
            Authorization: `Bearer ${process.env.COC_API_KEY}`,
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          await axios.post(
            `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`,
            {
              type: InteractionResponseType.ChannelMessageWithSource,
              data: {
                content: `<a:redcross:1439044567415521443> **Player Not Found**\nTag **#${playerTag}** not found. Check tag or profile privacy.`,
                flags: MessageFlags.Ephemeral,
              },
            },
            { headers: { "Content-Type": "application/json" } }
          );
          return;
        }

        const playerData = await response.json();
        const playerName = playerData.name;
        const thLevel = playerData.townHallLevel;
        const expLevel = playerData.expLevel;
        const leagueTier = playerData.leagueTier
          ? {
              name: playerData.leagueTier.name,
              iconUrls: playerData.leagueTier.iconUrls,
            }
          : undefined;
        const clan = playerData.clan
          ? {
              tag: playerData.clan.tag,
              name: playerData.clan.name,
            }
          : undefined;
        const role = playerData.role;
        const warPreference = playerData.warPreference;

        // Get or create user data
        let userData = await getUserData(userId);
        const isFirstAccount = !userData || userData.accounts.length === 0;

        if (!userData) {
          userData = {
            discordId: userId,
            discordName: interaction.member?.user?.username || "Unknown",
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
          const auditReason = `CoC account linked via /link - ${playerName} (#${playerTag})`;

          try {
            await fetch(
              `https://discord.com/api/v10/guilds/${guildId}/members/${userId}/roles/${VERIFIED_ROLE_ID}`,
              {
                method: "PUT",
                headers: {
                  Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
                  "Content-Type": "application/json",
                  "X-Audit-Log-Reason": auditReason,
                },
              }
            );
          } catch (roleError) {
            console.warn("Failed to assign Verified role:", roleError);
          }

          // Set nickname for main account
          if (newAccount.isMain) {
            try {
              const nickname = `${playerName} | TH${thLevel}`;
              await fetch(
                `https://discord.com/api/v10/guilds/${guildId}/members/${userId}`,
                {
                  method: "PATCH",
                  headers: {
                    Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
                    "Content-Type": "application/json",
                    "X-Audit-Log-Reason": `Nickname set from main account ${playerName}`,
                  },
                  body: JSON.stringify({ nick: nickname }),
                }
              );
              userData.nickname = nickname;
              await setUserData(userId, userData);
            } catch (nicknameError) {
              console.warn("Failed to set nickname:", nicknameError);
            }
          }
        }

        // Send success response
        await axios.post(
          `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`,
          {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              embeds: [
                {
                  title: "<a:AnimatedCheck:1427570005750448169> Account Successfully Linked!",
                  description: `Your Discord account has been linked to your Clash of Clans account.`,
                  color: 0x00ff00,
                  fields: [
                    { name: "👤 CoC Name", value: playerName, inline: true },
                    { name: "🏷️ Player Tag", value: `#${playerTag}`, inline: true },
                    { name: "🏰 Town Hall", value: `Level ${thLevel}`, inline: true },
                    {
                      name: "📊 Experience",
                      value: `Level ${expLevel}`,
                      inline: true,
                    },
                    {
                      name: "🏆 League",
                      value: leagueTier?.name || "Unranked",
                      inline: true,
                    },
                    {
                      name: "⚔️ War Pref",
                      value:
                        warPreference === "in" ? "Opted In" : "Opted Out",
                      inline: true,
                    },
                  ],
                  footer: {
                    text: isFirstAccount
                      ? "You can now apply to join our clans!"
                      : "Use /player to manage your accounts",
                  },
                },
              ],
              flags: MessageFlags.Ephemeral,
            },
          },
          { headers: { "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error("Modal handling error:", error);
        await axios.post(
          `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`,
          {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: "<a:redcross:1439044567415521443> An error occurred while processing your request.",
              flags: MessageFlags.Ephemeral,
            },
          },
          { headers: { "Content-Type": "application/json" } }
        );
      }
    },
  },
};
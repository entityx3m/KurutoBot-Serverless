// commands/link.ts
import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  MessageFlags,
  PermissionFlagsBits,
} from "discord-api-types/v10";
import type {
  CommandData,
  CommandExecuteResult,
  SimplifiedInteraction,
} from "../utils/types";
import { getUserData, setUserData, type UserData, type PlayerAccount } from "../utils/kvHelper";

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
        content: "❌ This command only works in the BOOM House server!",
        flags: MessageFlags.Ephemeral,
      };
    }

    const options = interaction.data.options || [];
    const playerTagOption = options.find((opt: any) => opt.name === "player_tag");
    const userOption = options.find((opt: any) => opt.name === "user");
    
    const rawPlayerTag = playerTagOption?.value;
    if (typeof rawPlayerTag !== "string" || !rawPlayerTag) {
      return {
        content: "❌ Missing player tag.",
        flags: MessageFlags.Ephemeral,
      };
    }
    const targetUserId = userOption?.value || interaction.member?.user?.id;
    
    if (!targetUserId) {
      return {
        content: "❌ Could not identify target user.",
        flags: MessageFlags.Ephemeral,
      };
    }

    // Get target user info
    const targetUser = userOption 
      ? interaction.data.resolved?.users?.[targetUserId]
      : interaction.member?.user;
    
    if (!targetUser) {
      return {
        content: "❌ Could not find the specified user.",
        flags: MessageFlags.Ephemeral,
      };
    }

    // Validate player tag
    const playerTag = rawPlayerTag.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!/^[A-Z0-9]{3,15}$/.test(playerTag)) {
      return {
        content: "❌ **Invalid Player Tag**\nExample: `#ABCDEFGH` or just `ABCDEFGH`",
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
            content: `❌ **Player Not Found**\nTag **#${playerTag}** not found. Check tag or profile privacy.`,
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
          content: `❌ **Already Linked**\nThis account (#${playerTag}) is already linked to <@${targetUserId}>.`,
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
      
      let responseText = `${mention}✅ **Account Successfully Linked!**${linkedByText}\n\n` +
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
        content: `❌ **Linking Failed**\n${error instanceof Error ? error.message : 'Unknown error'}`,
        flags: MessageFlags.Ephemeral,
      };
    }
  },
};
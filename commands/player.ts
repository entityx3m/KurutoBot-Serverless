// commands/player.ts
import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  MessageFlags,
} from "discord-api-types/v10";
import type {
  CommandData,
  CommandExecuteResult,
  SimplifiedInteraction,
} from "../utils/types";
import { getUserData, setUserData } from "../utils/kvHelper";

const MAIN_SERVER_ID = process.env.GUILD_ID || "REDACTED_WM_ID";
const COC_API_BASE_URL = "https://cocproxy.royaleapi.dev/v1";

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
    const tagOption = options.find((opt: any) => opt.name === "tag");
    const userOption = options.find((opt: any) => opt.name === "user");
    
    const rawTag = tagOption?.value;
    const targetUserId = (userOption?.value || interaction.member?.user?.id) as string | undefined;
    if (!targetUserId) {
      return {
        content: "❌ Could not identify the target user.",
        flags: MessageFlags.Ephemeral,
      };
    }
    
    // Get target user
    const targetUser = userOption 
      ? interaction.data.resolved?.users?.[String(targetUserId)]
      : interaction.member?.user;
    
    if (!targetUser) {
      return {
        content: "❌ Could not find the specified user.",
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
            content: `❌ **Player Not Found**\nTag **#${playerTag}** not found.`,
            flags: MessageFlags.Ephemeral,
          };
        }
        
        const playerData = await response.json();
        
        const embed: any = {
          title: `👤 ${playerData.name} (#${playerTag})`,
          color: 0x5865F2,
          thumbnail: playerData.league?.iconUrls?.medium ? { url: playerData.league.iconUrls.medium } : undefined,
          fields: [
            { name: "🏰 Town Hall", value: `Level ${playerData.townHallLevel}`, inline: true },
            { name: "📊 Experience", value: `Level ${playerData.expLevel}`, inline: true },
            { 
              name: "🏆 League", 
              value: playerData.leagueTier ? 
                `${playerData.leagueTier.name}${playerData.league ? ` (${playerData.league.name})` : ''}` : 
                "Unranked", 
              inline: true 
            },
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
        
        return {
            content: "",
          embeds: [embed],
        };
        
      } catch (error: any) {
        return {
          content: `❌ **Lookup Failed**\n${error instanceof Error ? error.message : 'Unknown error'}`,
          flags: MessageFlags.Ephemeral,
        };
      }
    }
    
    // CASE 2: Viewing user's linked accounts
    const userData = await getUserData(targetUserId);
    if (!userData || userData.accounts.length === 0) {
      const isSelf = targetUserId === interaction.member?.user?.id;
      const userMention = isSelf ? "You don't" : `<@${targetUserId}> doesn't`;
      
      return {
        content: `${userMention} have any linked CoC accounts.\nUse \`/link\` to link an account.`,
        flags: MessageFlags.Ephemeral,
      };
    }
    
    // Show user's main account first
    const mainAccount = userData.accounts.find(acc => acc.isMain) || userData.accounts[0];
    
    // Fetch fresh data for main account
    let freshData;
    try {
      const response = await fetch(`${COC_API_BASE_URL}/players/%23${mainAccount.playerTag}`, {
        headers: { 
          'Authorization': `Bearer ${process.env.COC_API_KEY}`, 
          'Accept': 'application/json' 
        },
      });
      
      if (response.ok) {
        freshData = await response.json();
      }
    } catch (error) {
      console.warn('Failed to fetch fresh data:', error);
    }
    
    const playerData = freshData || mainAccount;
    const isSelf = targetUserId === interaction.member?.user?.id;
    const titlePrefix = isSelf ? "Your" : `${targetUser.username}'s`;
    
    const embed = {
      title: `📊 ${titlePrefix} Player Stats`,
      color: 0x5865F2,
      thumbnail: playerData.league?.iconUrls?.medium ? { url: playerData.league.iconUrls.medium } : undefined,
      fields: [
        { name: "👤 CoC Name", value: playerData.name || mainAccount.playerName, inline: true },
        { name: "🏷️ Player Tag", value: `#${mainAccount.playerTag}`, inline: true },
        { name: "⭐ Status", value: mainAccount.isMain ? "Main Account" : "Linked Account", inline: true },
        { name: "🏰 Town Hall", value: `Level ${playerData.townHallLevel || mainAccount.townHallLevel}`, inline: true },
        { name: "📊 Experience", value: `Level ${playerData.expLevel || mainAccount.expLevel}`, inline: true },
        { name: "🏆 League", value: playerData.league?.name || mainAccount.league || "Unranked", inline: true },
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
        value: `${clan.name} (${clan.tag})`, 
        inline: false 
      });
    }
    
    // Add BOOM House info if available
    if (userData.clan) {
      const clanMap = {
        WM: "WAR MASTER",
        LE: "LEGENDS", 
        ZP: "ZwartePiet",
        CH: "Clash Heros"
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
    
    // Create dropdown for account selection (if multiple accounts)
    let components = [];
    
    if (userData.accounts.length > 1 && isSelf) {
      // Create dropdown options
      const options = userData.accounts.map((account, index) => ({
        label: `${account.playerName} | TH${account.townHallLevel}${account.isMain ? ' ⭐' : ''}`,
        value: account.playerTag,
        description: `#${account.playerTag}`,
        default: account.isMain
      }));
      
      components.push({
        type: 1, // ACTION_ROW
        components: [{
          type: 3, // SELECT_MENU
          custom_id: "select_account",
          placeholder: "Select an account to view",
          options: options.slice(0, 25) // Discord limit
        }]
      });
      
      // Add "Set as Main" button for non-main accounts
      if (!mainAccount.isMain) {
        components.push({
          type: 1, // ACTION_ROW
          components: [{
            type: 2, // BUTTON
            style: 1, // PRIMARY
            custom_id: `set_main:${mainAccount.playerTag}`,
            label: "⭐ Set as Main",
            emoji: { name: "⭐" }
          }]
        });
      }
    }
    
    return {
      content: "",
      embeds: [embed],
      components: components.length > 0 ? components : undefined,
      flags: isSelf ? undefined : MessageFlags.Ephemeral,
    };
  },
};
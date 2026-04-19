// commands/servers.ts
import {
  ApplicationCommandType,
  MessageFlags,
} from "discord-api-types/v10";
import type {
  CommandData,
  CommandExecuteResult,
  SimplifiedInteraction,
} from "../utils/types";
import { BOT_OWNER_ID } from "../utils/config";

export default {
  data: {
    name: "servers",
    description: "See what servers the bot is in (Owner only)",
    type: ApplicationCommandType.ChatInput,
  } as CommandData,
  async execute(data: { interaction: SimplifiedInteraction }): Promise<CommandExecuteResult> {
    const interaction = data.interaction;

    // Owner check
    if (interaction.member?.user?.id !== BOT_OWNER_ID) {
      return {
        content: "<a:redcross:1495393630112841839> Owner only command 💀",
        flags: MessageFlags.Ephemeral,
      };
    }

    try {
      // Fetch bot's guilds
      const response = await fetch('https://discord.com/api/v10/users/@me/guilds', {
        method: 'GET',
        headers: {
          'Authorization': `Bot ${process.env.DISCORD_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error: ${response.status} - ${errorText}`);
        
        return {
          content: `<a:redcross:1495393630112841839> Failed to fetch servers: ${response.status} ${response.statusText}`,
          flags: MessageFlags.Ephemeral,
        };
      }

      const guilds = await response.json();

      if (guilds.length === 0) {
        return {
          content: "🤖 Bot is not in any servers",
          flags: MessageFlags.Ephemeral,
        };
      }

      // Format server list (limit to 15 to avoid too long message)
      let serverList = '';
      const displayGuilds = guilds.slice(0, 15);
      
      displayGuilds.forEach((guild: any, index: number) => {
        // Get icon if available
        const icon = guild.icon ? 
          `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : 
          '❓';
        
        const ownerBadge = guild.owner ? ' 👑' : '';
        const features = guild.features?.length > 0 ? ` [${guild.features.length} features]` : '';
        
        serverList += `**${index + 1}. ${guild.name}**${ownerBadge}${features}\n`;
        serverList += `   ID: \`${guild.id}\` | Members: ${guild.approximate_member_count || 'N/A'}\n`;
        
        // Fix: Handle joined_at timestamp properly
        if (guild.joined_at) {
          try {
            const joinDate = new Date(guild.joined_at);
            if (!isNaN(joinDate.getTime())) {
              const timestamp = Math.floor(joinDate.getTime() / 1000);
              serverList += `   Joined: <t:${timestamp}:R>\n\n`;
            } else {
              serverList += `   Joined: Unknown date\n\n`;
            }
          } catch {
            serverList += `   Joined: Unknown date\n\n`;
          }
        } else {
          serverList += `   Joined: Unknown date\n\n`;
        }
      });

      // Get approximate total members (if available)
      const totalMembers = guilds.reduce((sum: number, guild: any) => {
        return sum + (guild.approximate_member_count || 0);
      }, 0);

      const embed = {
        title: `📊 Kuruto Bot is in ${guilds.length} servers`,
        description: serverList,
        color: 0x5865F2, // Discord blurple
        fields: totalMembers > 0 ? [
          {
            name: "📈 Stats",
            value: `**Total Servers:** ${guilds.length}\n**Total Members:** ${totalMembers.toLocaleString()}`,
            inline: true
          }
        ] : [],
        footer: guilds.length > 15 ? { 
          text: `Showing 15/${guilds.length} servers. Use /leave [server_id] to remove bot` 
        } : { 
          text: 'Use /leave [server_id] to remove bot from unwanted servers' 
        },
        timestamp: new Date().toISOString()
      };

      return {
        content: "", // Empty content is okay when we have embeds
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      };

    } catch (error: any) {
      console.error('<a:redcross:1495393630112841839> /servers command error:', error);
      
      return {
        content: `<a:redcross:1495393630112841839> Error: ${error.message || 'Unknown error'}`,
        flags: MessageFlags.Ephemeral,
      };
    }
  },
};
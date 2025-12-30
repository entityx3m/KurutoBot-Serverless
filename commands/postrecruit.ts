// commands/postrecruit.ts (simplified)
import {
  ApplicationCommandType,
  MessageFlags,
  PermissionFlagsBits,
} from "discord-api-types/v10";
import type {
  CommandData,
  CommandExecuteResult,
  SimplifiedInteraction,
} from "../utils/types";
import { RecruitmentTracker } from "../utils/recruitment";

const MAIN_SERVER_ID = process.env.GUILD_ID || "REDACTED_WM_ID";

export default {
  data: {
    name: "postrecruit",
    description: "Post recruitment embed with refresh button",
    type: ApplicationCommandType.ChatInput,
    default_member_permissions: PermissionFlagsBits.ManageMessages.toString(),
  } as CommandData,
  async execute(data: {
    interaction: SimplifiedInteraction;
  }): Promise<CommandExecuteResult> {
    const interaction = data.interaction;
    
    // BLOCK OTHER SERVERS
    if (interaction.guild_id !== MAIN_SERVER_ID) {
      return {
        content: "❌ This command only works in the BOOM House server!",
        flags: MessageFlags.Ephemeral,
      };
    }
    
    try {
      // Auto-update from CoC API before posting
      await RecruitmentTracker.updateFromAPI();
      
      const { embed, components } = await createRecruitmentMessage();
      
      // Post in the current channel
      await fetch(`https://discord.com/api/v10/channels/${interaction.channel_id}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bot ${process.env.DISCORD_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          embeds: [embed],
          components: [components]
        }),
      });
      
      return {
        content: "✅ Recruitment status posted with refresh button! (Auto-fetched from CoC API)",
        flags: MessageFlags.Ephemeral,
      };
      
    } catch (error) {
      console.error("Error posting recruitment:", error);
      return {
        content: "❌ Failed to post recruitment status 💀",
        flags: MessageFlags.Ephemeral,
      };
    }
  },
};

async function createRecruitmentMessage() {
  const summary = await RecruitmentTracker.getSummary();
  const { clans, totalNeeded, totalCurrent, remaining, overallProgress } = summary;
  
  let description = `**Total Recruitment Status**\n` +
                   `🎯 **Goal:** ${totalNeeded} recruits\n` +
                   `📊 **Current Recruits:** ${totalCurrent}\n` +
                   `📈 **Remaining:** ${remaining} (${overallProgress}%)\n\n` +
                   `**Clan Breakdown:**\n`;
  
  clans.forEach((clan: any) => {
    const progress = clan.needed > 0 ? Math.min(Math.round((clan.current / clan.needed) * 100), 100) : 0;
    const progressBar = RecruitmentTracker.createProgressBar(progress);
    const remainingClan = Math.max(0, clan.needed - clan.current);
    
    description += `\n**${clan.name} (${clan.clan})**\n` +
                  `> 🎯 **Need:** ${clan.needed} recruits\n` +
                  `> 📊 **Recruited:** ${clan.current}\n` +
                  `> 📈 **Remaining:** ${remainingClan}\n` +
                  `> ${progressBar} ${progress}%\n`;
  });
  
  description += `\n*Goals automatically calculated to fill clans to 50 members*`;
  
  const embed = {
    title: "📋 BOOM House Recruitment Status",
    description: description,
    color: 0x5865F2,
    footer: {
      text: "Click refresh below to update • Last updated"
    },
    timestamp: new Date().toISOString()
  };
  
  // Create refresh button component
  const components = {
    type: 1, // ACTION_ROW
    components: [
      {
        type: 2, // BUTTON
        style: 1, // PRIMARY
        custom_id: "refresh_recruitment",
        label: "🔄 Refresh",
        emoji: { name: "🔄" }
      }
    ]
  };
  
  return { embed, components };
}
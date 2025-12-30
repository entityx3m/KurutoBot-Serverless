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

// commands/postrecruit.ts (updated with better display)
async function createRecruitmentMessage() {
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
  
  const embed = {
    title: "🏰 BOOM House Recruitment Status",
    description: description,
    color: 0x5865F2,
    footer: {
      text: "Last updated"
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
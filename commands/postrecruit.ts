import {
  ApplicationCommandType,
  InteractionResponseType,
  MessageFlags,
  PermissionFlagsBits,
} from "discord-api-types/v10";
import type {
  CommandData,
  CommandExecuteResult,
  SimplifiedInteraction,
} from "../utils/types";
import { RecruitmentTracker } from "../utils/recruitment";
import axios from "axios";

const MAIN_SERVER_ID = process.env.GUILD_ID || "REDACTED_WM_ID";

export default {
  data: {
    name: "postrecruit",
    description: "Post recruitment embed with refresh button",
    type: ApplicationCommandType.ChatInput,
    default_member_permissions: PermissionFlagsBits.ManageMessages.toString(),
  } as CommandData,

  // 1. Main Command: Posts the initial message
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
    
    try {
      await RecruitmentTracker.updateFromAPI();
      const { embed, components } = await createRecruitmentMessage();

      return {
        content: "",
        embeds: [embed],
        components: components,
      };
      
    } catch (error) {
      console.error("Error posting recruitment:", error);
      return {
        content: "<a:redcross:1439044567415521443> Failed to post recruitment status 💀",
        flags: MessageFlags.Ephemeral,
      };
    }
  },

  // 2. Handlers: Handles the "Refresh" button
  handlers: {
    "refresh_recruitment": async ({ interaction }: { interaction: SimplifiedInteraction }) => {
      // Security Check: Ensure it's the right server
      if (interaction.guild_id !== MAIN_SERVER_ID) {
        await axios.post(
          `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`,
          {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: { content: "<a:redcross:1439044567415521443> Wrong server!", flags: MessageFlags.Ephemeral }
          }
        );
        return;
      }

      // Acknowledge click immediately (Loading state)
      await axios.post(
        `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`,
        { type: InteractionResponseType.DeferredMessageUpdate }
      );

      try {
        // Fetch fresh data
        await RecruitmentTracker.updateFromAPI();
        const { embed, components } = await createRecruitmentMessage();
        
        // Edit the original message
        await axios.patch(
          `https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`,
          {
            embeds: [embed],
            components: components
          },
          { headers: { "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error("Refresh failed:", error);
      }
    }
  }
};

// Helper function (Reused by both Execute and Handler)
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
  
  // Create refresh button component (return an array of action rows)
  const components = [
    {
      type: 1, // ACTION_ROW
      components: [
        {
          type: 2, // BUTTON
          style: 1, // PRIMARY
          custom_id: "refresh_recruitment", // Matches handler key
          label: "Refresh",
          emoji: { name: "🔄" }
        }
      ]
    }
  ];

  return { embed, components };
}
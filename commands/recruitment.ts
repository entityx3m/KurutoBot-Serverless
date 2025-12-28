// commands/recruitment.ts - Simplified version (optional)
import {
  ApplicationCommandType,
  MessageFlags,
} from "discord-api-types/v10";
import type {
  CommandData,
  CommandExecuteResult,
  SimplifiedInteraction,
} from "../utils/types";
import { RecruitmentTracker } from "../utils/recruitment";

export default {
  data: {
    name: "recruitment",
    description: "Quick view of recruitment status (private)",
    type: ApplicationCommandType.ChatInput,
  } as CommandData,
  async execute(data: { interaction: SimplifiedInteraction }): Promise<CommandExecuteResult> {
    const summary = await RecruitmentTracker.getSummary();
    const { totalNeeded, totalCurrent, remaining, overallProgress } = summary;
    
    let content = `**📋 BOOM House Recruitment Status**\n` +
                  `🎯 **Total Goal:** ${totalNeeded}\n` +
                  `📊 **Total Current:** ${totalCurrent}\n` +
                  `📈 **Remaining:** ${remaining} (${overallProgress}%)\n\n`;
    
    summary.clans.forEach((clan: any) => {
      const remainingClan = Math.max(0, clan.needed - clan.current);
      content += `**${clan.clan}:** ${clan.current}/${clan.needed} (${remainingClan} left)\n`;
    });
    
    content += `\nUse \`/postrecruit\` to post a public embed with refresh button!`;
    
    return {
      content: content,
      flags: MessageFlags.Ephemeral, // Private message
    };
  },
};
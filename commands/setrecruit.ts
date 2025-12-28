// commands/setrecruit.ts
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
import { RecruitmentTracker } from "../utils/recruitment";

const MAIN_SERVER_ID = process.env.GUILD_ID || "REDACTED_WM_ID";

const CLAN_CHOICES = [
  { name: "WM (War Master)", value: "WM" },
  { name: "LE (LEGENDS)", value: "LE" },
  { name: "ZP (ZwartePiet)", value: "ZP" },
  { name: "CH (Clash Heros)", value: "CH" }
];

export default {
  data: {
    name: "setrecruit",
    description: "Set recruitment goal for a clan",
    type: ApplicationCommandType.ChatInput,
    default_member_permissions: PermissionFlagsBits.ManageRoles.toString(),
    options: [
      {
        name: "clan",
        description: "Clan abbreviation",
        type: ApplicationCommandOptionType.String,
        required: true,
        choices: CLAN_CHOICES
      },
      {
        name: "needed",
        description: "Number of recruits needed",
        type: ApplicationCommandOptionType.Integer,
        required: true,
        min_value: 0,
        max_value: 100
      },
      {
        name: "reset_current",
        description: "Reset current count to 0?",
        type: ApplicationCommandOptionType.Boolean,
        required: false
      }
    ]
  } as CommandData,
  async execute(data: { interaction: SimplifiedInteraction }): Promise<CommandExecuteResult> {
    const interaction = data.interaction;

    // BLOCK OTHER SERVERS
    if (interaction.guild_id !== MAIN_SERVER_ID) {
      return {
        content: "❌ This command only works in the BOOM House server!",
        flags: MessageFlags.Ephemeral,
      };
    }

    const clanOption = interaction.data.options?.find(
      (option: any) => option.name === "clan"
    ) as any;
    const neededOption = interaction.data.options?.find(
      (option: any) => option.name === "needed"
    ) as any;
    const resetOption = interaction.data.options?.find(
      (option: any) => option.name === "reset_current"
    ) as any;

    const clan = clanOption?.value;
    const needed = neededOption?.value;
    const resetCurrent = resetOption?.value || false;
    
    if (resetCurrent) {
      await RecruitmentTracker.resetCurrent(clan);
    }
    
    const success = await RecruitmentTracker.setRecruitment(clan, needed);
    
    if (!success) {
      return {
        content: `❌ Invalid clan: ${clan}`,
        flags: MessageFlags.Ephemeral,
      };
    }

    const clanData = await RecruitmentTracker.getClan(clan);
    if (!clanData) {
      return {
        content: `❌ Failed to get clan data for ${clan}`,
        flags: MessageFlags.Ephemeral,
      };
    }

    const progress = clanData.needed > 0 ? Math.min(Math.round((clanData.current / clanData.needed) * 100), 100) : 0;
    const progressBar = RecruitmentTracker.createProgressBar(progress);
    
    return {
      content: `✅ **${clanData.name} Recruitment Updated**\n` +
               `🎯 **Goal:** ${clanData.needed} recruits\n` +
               `📊 **Current:** ${clanData.current} recruits\n` +
               `📈 **Remaining:** ${Math.max(0, clanData.needed - clanData.current)}\n` +
               `${progressBar} ${progress}%\n` +
               `_Updated just now_`,
    };
  },
};
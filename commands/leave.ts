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
import { BOT_OWNER_ID } from "../utils/config";

type InteractionOption = { name: string; value: string };

function getOptionValue(options: InteractionOption[] | undefined, name: string): string | undefined {
  return options?.find((opt) => opt.name === name)?.value;
}

export default {
  data: {
    name: "leave",
    description: "Make bot leave a server (Owner only)",
    type: ApplicationCommandType.ChatInput,
    options: [
      {
        name: "server_id",
        description: "Server ID to leave (get from /servers)",
        type: ApplicationCommandOptionType.String,
        required: true,
      }
    ]
  } as CommandData,
  async execute(data: { interaction: SimplifiedInteraction }): Promise<CommandExecuteResult> {
    const interaction = data.interaction;

    if (interaction.member?.user?.id !== BOT_OWNER_ID) {
      return {
        content: "Kuruto only 💀",
        flags: MessageFlags.Ephemeral,
      };
    }

    const options = interaction.data.options as InteractionOption[] | undefined;
    const serverId = getOptionValue(options, "server_id");

    if (!serverId) {
      return {
        content: "Need server ID 💀",
        flags: MessageFlags.Ephemeral,
      };
    }

    try {
      const response = await fetch(`https://discord.com/api/v10/users/@me/guilds/${serverId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bot ${process.env.DISCORD_TOKEN}`,
        },
      });

      if (response.status === 204) {
        return {
          content: `<a:AnimatedCheck:1427570005750448169> Left server \`${serverId}\`\nGood riddance 💀`,
          flags: MessageFlags.Ephemeral,
        };
      } else if (response.status === 404) {
        return {
          content: `Server \`${serverId}\` not found or already left`,
          flags: MessageFlags.Ephemeral,
        };
      } else {
        return {
          content: `Failed to leave: ${response.status}`,
          flags: MessageFlags.Ephemeral,
        };
      }

    } catch (error) {
      console.error('Leave command error:', error);
      return {
        content: "Error leaving server 💀",
        flags: MessageFlags.Ephemeral,
      };
    }
  },
};
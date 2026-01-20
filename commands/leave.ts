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

const OWNER_ID = "REDACTED_OWNER_ID"; // Same ID as above!

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

    if (interaction.member?.user?.id !== OWNER_ID) {
      return {
        content: "Kuruto only 💀",
        flags: MessageFlags.Ephemeral,
      };
    }

    const serverIdOption = interaction.data.options?.find(
      (opt: any) => opt.name === "server_id"
    ) as any;
    
    const serverId = serverIdOption?.value;

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
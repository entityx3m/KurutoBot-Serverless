import axios from "axios";
import {
  ApplicationCommandOptionType,
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
import { MAIN_SERVER_ID } from "../utils/config";
import { canManageTicket, getTicketContext } from "../utils/ticketHelper";

type InteractionOption = { name: string; value: string };

function getOptionValue(options: InteractionOption[] | undefined, name: string): string | undefined {
  return options?.find((opt) => opt.name === name)?.value;
}

export default {
  data: {
    name: "include",
    description: "Add a user to this ticket channel",
    type: ApplicationCommandType.ChatInput,
    initialEphemeral: true,
    default_member_permissions: PermissionFlagsBits.ManageChannels.toString(),
    options: [
      {
        name: "user",
        description: "The user to add to the ticket",
        type: ApplicationCommandOptionType.User,
        required: true,
      },
    ],
  } as CommandData,

  async execute(data: {
    interaction: SimplifiedInteraction;
  }): CommandExecuteResult {
    const interaction = data.interaction;

    // Server lock
    if (interaction.guild_id !== MAIN_SERVER_ID) {
      return {
        content:
          "<a:redcross:1439044567415521443> This command only works in the BOOM House server!",
        flags: MessageFlags.Ephemeral,
      };
    }

    const userId = interaction.member?.user?.id;
    const channelId = interaction.channel_id;
    const guildId = interaction.guild_id;
    if (!userId || !channelId || !guildId) {
      return {
        content: "<a:redcross:1439044567415521443> Could not identify context.",
        flags: MessageFlags.Ephemeral,
      };
    }

    const options = interaction.data.options as InteractionOption[] | undefined;
    const targetUserId = getOptionValue(options, "user");
    if (!targetUserId) {
      return {
        content: "<a:redcross:1439044567415521443> Please specify a user.",
        flags: MessageFlags.Ephemeral,
      };
    }

    try {
      const ticketContext = await getTicketContext(channelId);
      if (!ticketContext) {
        return {
          content:
            "<a:redcross:1439044567415521443> This command can only be used inside a ticket channel.",
          flags: MessageFlags.Ephemeral,
        };
      }

      const hasPermission = await canManageTicket(guildId, userId, ticketContext);

      if (!hasPermission) {
        return {
          content:
            "<a:redcross:1439044567415521443> You don't have permission to add users to this ticket.",
          flags: MessageFlags.Ephemeral,
        };
      }

      // Add permission overwrite for target user
      const overwritePayload = {
        allow: (1 << 10) | (1 << 11) | (1 << 12), // VIEW_CHANNEL, SEND_MESSAGES, READ_MESSAGE_HISTORY
        deny: 0,
        type: 1, // member
      };

      const overwriteRes = await fetch(
        `https://discord.com/api/v10/channels/${channelId}/permissions/${targetUserId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(overwritePayload),
        }
      );

      if (!overwriteRes.ok) {
        throw new Error(`Failed to add user: ${overwriteRes.statusText}`);
      }

      // Send confirmation in channel
      await fetch(
        `https://discord.com/api/v10/channels/${channelId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: `<a:AnimatedCheck:1427570005750448169> <@${targetUserId}> has been added to this ticket by <@${userId}>.`,
          }),
        }
      );

      // Acknowledge the command
      return {
        content: `<a:AnimatedCheck:1427570005750448169> Successfully added <@${targetUserId}> to the ticket.`,
        flags: MessageFlags.Ephemeral,
      };
    } catch (error) {
      console.error("Error in include command:", error);
      return {
        content: `<a:redcross:1439044567415521443> Failed to add user: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        flags: MessageFlags.Ephemeral,
      };
    }
  },
};
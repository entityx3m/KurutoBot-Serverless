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
import { ROLE_IDS } from "../utils/config";

const MAIN_SERVER_ID = process.env.GUILD_ID || "REDACTED_WM_ID";
const TICKET_CATEGORY = process.env.TICKET_CATEGORY || "REDACTED_CHANNEL_TICKET_CATEGORY_ID";

export default {
  data: {
    name: "include",
    description: "Add a user to this ticket channel",
    type: ApplicationCommandType.ChatInput,
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

    // Get target user from options
    const options = interaction.data.options || [];
    const userOption = options.find((opt) => opt.name === "user") as any;
    const targetUserId = userOption?.value;
    if (!targetUserId) {
      return {
        content: "<a:redcross:1439044567415521443> Please specify a user.",
        flags: MessageFlags.Ephemeral,
      };
    }

    try {
      // Fetch channel to verify it's a ticket
      const channelRes = await fetch(
        `https://discord.com/api/v10/channels/${channelId}`,
        {
          headers: { Authorization: `Bot ${process.env.DISCORD_TOKEN}` },
        }
      );
      if (!channelRes.ok) throw new Error("Could not fetch channel");
      const channel = await channelRes.json();

      // Check if channel is in ticket category
      if (channel.parent_id !== TICKET_CATEGORY) {
        return {
          content:
            "<a:redcross:1439044567415521443> This command can only be used inside a ticket channel.",
          flags: MessageFlags.Ephemeral,
        };
      }

      const topic = channel.topic || "";
      const creatorMatch = topic.match(/creator:(\d+)/);
      const typeMatch = topic.match(/type:(\w+)/);
      const creatorId = creatorMatch ? creatorMatch[1] : null;
      const ticketType = typeMatch ? typeMatch[1] : null;

      // Determine required staff role based on ticket type
      let requiredRole = null;
      if (ticketType === "apply_join") {
        requiredRole = ROLE_IDS.TICKET_JOIN_LEADERSHIP_ROLE;
      } else if (ticketType === "chat_staff" || ticketType === "apply_staff") {
        requiredRole = ROLE_IDS.TICKET_STAFF_LEADERSHIP_ROLE;
      }

      // Check permissions: creator or staff role
      let hasPermission = userId === creatorId;
      if (!hasPermission && requiredRole) {
        const memberRes = await fetch(
          `https://discord.com/api/v10/guilds/${guildId}/members/${userId}`,
          {
            headers: { Authorization: `Bot ${process.env.DISCORD_TOKEN}` },
          }
        );
        if (memberRes.ok) {
          const member = await memberRes.json();
          hasPermission = member.roles?.includes(requiredRole);
        }
      }

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
import axios from "axios";
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
import { MAIN_SERVER_ID } from "../utils/config";
import { canManageTicket, getTicketContext } from "../utils/ticketHelper";

export default {
  data: {
    name: "closeticket",
    description: "Close this ticket with confirmation",
    type: ApplicationCommandType.ChatInput,
    initialEphemeral: true,
    default_member_permissions: PermissionFlagsBits.ManageChannels.toString(),
  } as CommandData,

  async execute(data: {
    interaction: SimplifiedInteraction;
  }): CommandExecuteResult {
    const interaction = data.interaction;

    if (interaction.guild_id !== MAIN_SERVER_ID) {
      return {
        content:
          "<a:redcross:1495393630112841839> This command only works in the BOOM House server!",
        flags: MessageFlags.Ephemeral,
      };
    }

    const userId = interaction.member?.user?.id;
    const channelId = interaction.channel_id;
    const guildId = interaction.guild_id;
    if (!userId || !channelId || !guildId) {
      return {
        content: "<a:redcross:1495393630112841839> Could not identify context.",
        flags: MessageFlags.Ephemeral,
      };
    }

    try {
      const ticketContext = await getTicketContext(channelId);
      if (!ticketContext) {
        return {
          content:
            "<a:redcross:1495393630112841839> This command can only be used inside a ticket channel.",
          flags: MessageFlags.Ephemeral,
        };
      }
      const hasPermission = await canManageTicket(guildId, userId, ticketContext);

      if (!hasPermission) {
        return {
          content:
            "<a:redcross:1495393630112841839> You don't have permission to close this ticket.",
          flags: MessageFlags.Ephemeral,
        };
      }

      // Send confirmation message with buttons
      const components = [
        {
          type: 1, // ACTION_ROW
          components: [
            {
              type: 2, // BUTTON
              style: 4, // DANGER
              custom_id: `confirm_close_ticket:${userId}`,
              label: "Proceed",
              emoji: { name: "✅" },
            },
            {
              type: 2, // BUTTON
              style: 2, // SECONDARY
              custom_id: `cancel_close_ticket:${userId}`,
              label: "Cancel",
              emoji: { name: "❌" },
            },
          ],
        },
      ];

      await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: `<@${userId}>, are you sure you want to close this ticket?`,
          components,
        }),
      });

      return {
        content: "<a:AnimatedCheck:1495392848072413275> Confirmation sent.",
        flags: MessageFlags.Ephemeral,
      };
    } catch (error) {
      console.error("Error in closeticket command:", error);
      return {
        content: `<a:redcross:1495393630112841839> Failed to initiate close: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        flags: MessageFlags.Ephemeral,
      };
    }
  },

  handlers: {
    // Confirm close button
    confirm_close_ticket: async ({
      interaction,
      args,
    }: {
      interaction: SimplifiedInteraction;
      args: string[];
    }) => {
      const [userId] = args;
      const clickerId = interaction.member?.user?.id;
      const channelId = interaction.channel_id;

      // Verify the clicker is the same user who initiated
      if (clickerId !== userId) {
        await axios.post(
          `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`,
          {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: "<a:Warning:1495394548984315904> This button is not for you.",
              flags: MessageFlags.Ephemeral,
            },
          }
        );
        return;
      }

      // Defer the button press (so we can delete channel)
      await axios.post(
        `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`,
        { type: InteractionResponseType.DeferredMessageUpdate }
      );

      try {
        // Delete the channel
        await fetch(`https://discord.com/api/v10/channels/${channelId}`, {
          method: "DELETE",
          headers: { Authorization: `Bot ${process.env.DISCORD_TOKEN}` },
        });
        // No further response needed (channel is gone)
      } catch (error) {
        console.error("Error closing ticket:", error);
        await axios.patch(
          `https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`,
          {
            content: "<a:redcross:1495393630112841839> Failed to close ticket.",
          }
        );
      }
    },

    // Cancel close button
    cancel_close_ticket: async ({
      interaction,
      args,
    }: {
      interaction: SimplifiedInteraction;
      args: string[];
    }) => {
      const [userId] = args;
      const clickerId = interaction.member?.user?.id;

      if (clickerId !== userId) {
        await axios.post(
          `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`,
          {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: "<a:Warning:1495394548984315904> This button is not for you.",
              flags: MessageFlags.Ephemeral,
            },
          }
        );
        return;
      }

      // Defer the button press to edit the original message
      await axios.post(
        `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`,
        { type: InteractionResponseType.DeferredMessageUpdate }
      );

      try {
        // Edit the confirmation message to indicate cancellation
        await axios.patch(
          `https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`,
          {
            content: "<a:redcross:1495393630112841839> Ticket close cancelled.",
            components: [], // Remove buttons
          }
        );
      } catch (error) {
        console.error("Error cancelling close:", error);
      }
    },
  },
};
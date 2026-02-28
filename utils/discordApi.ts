// utils/discordApi.ts
// Centralized Discord API handler for common operations

import axios from "axios";
import { InteractionResponseType, MessageFlags } from "discord-api-types/v10";
import { API_URLS } from "./config";

export interface DiscordApiError {
  success: false;
  error: string;
  statusCode?: number;
}

export interface DiscordApiSuccess<T = any> {
  success: true;
  data?: T;
}

export type DiscordApiResponse<T = any> = DiscordApiSuccess<T> | DiscordApiError;

/**
 * Send an ephemeral reply to an interaction
 */
export async function sendEphemeralReply(
  interactionId: string,
  token: string,
  content: string
): Promise<DiscordApiResponse> {
  try {
    await axios.post(
      `${API_URLS.DISCORD_API}/interactions/${interactionId}/${token}/callback`,
      {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content,
          flags: MessageFlags.Ephemeral
        }
      },
      { headers: { "Content-Type": "application/json" } }
    );
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}

/**
 * Send an ephemeral reply with embeds
 */
export async function sendEphemeralEmbed(
  interactionId: string,
  token: string,
  embeds: any[],
  content?: string
): Promise<DiscordApiResponse> {
  try {
    await axios.post(
      `${API_URLS.DISCORD_API}/interactions/${interactionId}/${token}/callback`,
      {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: content || "",
          embeds,
          flags: MessageFlags.Ephemeral
        }
      },
      { headers: { "Content-Type": "application/json" } }
    );
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}

/**
 * Send a deferred response
 */
export async function deferReply(
  interactionId: string,
  token: string,
  ephemeral: boolean = false
): Promise<DiscordApiResponse> {
  try {
    await axios.post(
      `${API_URLS.DISCORD_API}/interactions/${interactionId}/${token}/callback`,
      {
        type: InteractionResponseType.DeferredChannelMessageWithSource,
        data: { flags: ephemeral ? MessageFlags.Ephemeral : 0 }
      },
      { headers: { "Content-Type": "application/json" } }
    );
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}

/**
 * Send a deferred message update (for button interactions)
 */
export async function deferMessageUpdate(
  interactionId: string,
  token: string
): Promise<DiscordApiResponse> {
  try {
    await axios.post(
      `${API_URLS.DISCORD_API}/interactions/${interactionId}/${token}/callback`,
      {
        type: InteractionResponseType.DeferredMessageUpdate
      }
    );
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}

/**
 * Update a message (for deferred interactions)
 */
export async function updateMessage(
  applicationId: string,
  token: string,
  payload: any
): Promise<DiscordApiResponse> {
  try {
    await axios.patch(
      `${API_URLS.DISCORD_API}/webhooks/${applicationId}/${token}/messages/@original`,
      payload,
      { headers: { "Content-Type": "application/json" } }
    );
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}

/**
 * Show a modal
 */
export async function showModal(
  interactionId: string,
  token: string,
  customId: string,
  title: string,
  components: any[]
): Promise<DiscordApiResponse> {
  try {
    await axios.post(
      `${API_URLS.DISCORD_API}/interactions/${interactionId}/${token}/callback`,
      {
        type: InteractionResponseType.Modal,
        data: {
          custom_id: customId,
          title,
          components
        }
      },
      { headers: { "Content-Type": "application/json" } }
    );
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}

/**
 * Send a message to a channel
 */
export async function sendChannelMessage(
  channelId: string,
  payload: any
): Promise<DiscordApiResponse> {
  try {
    await fetch(`${API_URLS.DISCORD_API}/channels/${channelId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bot ${process.env.DISCORD_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}

/**
 * Add a role to a member
 */
export async function addMemberRole(
  guildId: string,
  memberId: string,
  roleId: string,
  auditReason?: string
): Promise<DiscordApiResponse> {
  try {
    const response = await fetch(
      `${API_URLS.DISCORD_API}/guilds/${guildId}/members/${memberId}/roles/${roleId}`,
      {
        method: "PUT",
        headers: {
          "Authorization": `Bot ${process.env.DISCORD_TOKEN}`,
          "Content-Type": "application/json",
          ...(auditReason && { "X-Audit-Log-Reason": auditReason })
        }
      }
    );

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to add role: ${response.statusText}`,
        statusCode: response.status
      };
    }

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}

/**
 * Remove a role from a member
 */
export async function removeMemberRole(
  guildId: string,
  memberId: string,
  roleId: string,
  auditReason?: string
): Promise<DiscordApiResponse> {
  try {
    const response = await fetch(
      `${API_URLS.DISCORD_API}/guilds/${guildId}/members/${memberId}/roles/${roleId}`,
      {
        method: "DELETE",
        headers: {
          "Authorization": `Bot ${process.env.DISCORD_TOKEN}`,
          "Content-Type": "application/json",
          ...(auditReason && { "X-Audit-Log-Reason": auditReason })
        }
      }
    );

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to remove role: ${response.statusText}`,
        statusCode: response.status
      };
    }

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}

/**
 * Update member nickname
 */
export async function setMemberNickname(
  guildId: string,
  memberId: string,
  nickname: string | null,
  auditReason?: string
): Promise<DiscordApiResponse> {
  try {
    const response = await fetch(
      `${API_URLS.DISCORD_API}/guilds/${guildId}/members/${memberId}`,
      {
        method: "PATCH",
        headers: {
          "Authorization": `Bot ${process.env.DISCORD_TOKEN}`,
          "Content-Type": "application/json",
          ...(auditReason && { "X-Audit-Log-Reason": auditReason })
        },
        body: JSON.stringify({ nick: nickname })
      }
    );

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to set nickname: ${response.statusText}`,
        statusCode: response.status
      };
    }

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}

/**
 * Get member info
 */
export async function getMember(
  guildId: string,
  memberId: string
): Promise<DiscordApiResponse<any>> {
  try {
    const response = await fetch(
      `${API_URLS.DISCORD_API}/guilds/${guildId}/members/${memberId}`,
      {
        headers: {
          "Authorization": `Bot ${process.env.DISCORD_TOKEN}`
        }
      }
    );

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to get member: ${response.statusText}`,
        statusCode: response.status
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}

/**
 * Create a DM channel
 */
export async function createDmChannel(userId: string): Promise<DiscordApiResponse<any>> {
  try {
    const response = await fetch(`${API_URLS.DISCORD_API}/users/@me/channels`, {
      method: "POST",
      headers: {
        "Authorization": `Bot ${process.env.DISCORD_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ recipient_id: userId })
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to create DM: ${response.statusText}`,
        statusCode: response.status
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}

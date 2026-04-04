import { CHANNEL_IDS, ROLE_IDS } from "./config";
import { getMember } from "./discordApi";

export interface TicketContext {
  creatorId: string | null;
  ticketType: string | null;
  requiredRole: string | null;
}

function getRequiredRole(ticketType: string | null): string | null {
  if (ticketType === "apply_join") {
    return ROLE_IDS.TICKET_JOIN_LEADERSHIP_ROLE;
  }
  if (ticketType === "chat_staff" || ticketType === "apply_staff") {
    return ROLE_IDS.TICKET_STAFF_LEADERSHIP_ROLE;
  }
  return null;
}

export async function getTicketContext(channelId: string): Promise<TicketContext | null> {
  const channelRes = await fetch(`https://discord.com/api/v10/channels/${channelId}`, {
    headers: { Authorization: `Bot ${process.env.DISCORD_TOKEN}` },
  });

  if (!channelRes.ok) {
    throw new Error("Could not fetch channel");
  }

  const channel = await channelRes.json();
  if (channel.parent_id !== CHANNEL_IDS.TICKET_CATEGORY) {
    return null;
  }

  const topic = channel.topic || "";
  const creatorMatch = topic.match(/creator:(\d+)/);
  const typeMatch = topic.match(/type:(\w+)/);
  const creatorId = creatorMatch ? creatorMatch[1] : null;
  const ticketType = typeMatch ? typeMatch[1] : null;

  return {
    creatorId,
    ticketType,
    requiredRole: getRequiredRole(ticketType),
  };
}

export async function canManageTicket(
  guildId: string,
  userId: string,
  context: TicketContext
): Promise<boolean> {
  if (userId === context.creatorId) {
    return true;
  }

  if (!context.requiredRole) {
    return false;
  }

  const member = await getMember(guildId, userId);
  if (!member.success) {
    return false;
  }

  return member.data.roles?.includes(context.requiredRole) ?? false;
}

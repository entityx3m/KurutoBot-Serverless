// utils/config.ts
// Centralized configuration for all IDs, clans, and API URLs

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const API_URLS = {
  COC_API_BASE: "https://cocproxy.royaleapi.dev/v1",
  DISCORD_API: "https://discord.com/api/v10"
};

export const BOT_OWNER_ID = requireEnv("BOT_OWNER_ID");

export const EXTERNAL_LINKS = {
  TICKET_CREATION_URL: requireEnv("TICKET_CREATION_URL")
};

export const ROLE_IDS = {
  BOOM_MEMBER: requireEnv("ROLE_BOOM_MEMBER_ID"),
  TICKET_JOIN_LEADERSHIP_ROLE: requireEnv("ROLE_TICKET_JOIN_LEADERSHIP_ID"),
  TICKET_STAFF_LEADERSHIP_ROLE: requireEnv("ROLE_TICKET_STAFF_LEADERSHIP_ID"),
  VISITOR: requireEnv("ROLE_VISITOR_ID"),
  VERIFIED: requireEnv("ROLE_VERIFIED_ID")
};

export const CHANNEL_IDS = {
  CLANS_LIST: requireEnv("CHANNEL_CLANS_LIST_ID"),
  ATTACK_PLANNING: requireEnv("CHANNEL_ATTACK_PLANNING_ID"),
  FUN_CATEGORY: requireEnv("CHANNEL_FUN_CATEGORY_ID"),
  CWL_SIGNUPS: requireEnv("CHANNEL_CWL_SIGNUPS_ID"),
  TICKET_CATEGORY: requireEnv("CHANNEL_TICKET_CATEGORY_ID"),
  BASE_VAULT: requireEnv("CHANNEL_BASE_VAULT_ID"),
  SHOWCASE_BASE: requireEnv("CHANNEL_SHOWCASE_BASE_ID"),
  VERIFICATION_CHANNEL: requireEnv("CHANNEL_VERIFICATION_ID")
};

export const GUILD_ID = requireEnv("GUILD_ID");
export const MAIN_SERVER_ID = GUILD_ID;
export const MAX_CLAN_SIZE = 50;

// Validation patterns
export const VALIDATION = {
  PLAYER_TAG_PATTERN: /^[A-Z0-9]{3,15}$/,
  cleanPlayerTag: (tag: string): string => {
    return tag.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  },
  isValidPlayerTag: (tag: string): boolean => {
    const cleanTag = VALIDATION.cleanPlayerTag(tag);
    return VALIDATION.PLAYER_TAG_PATTERN.test(cleanTag);
  }
};

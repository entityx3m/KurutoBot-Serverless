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
  WM: requireEnv("ROLE_WM_ID"),
  LE: requireEnv("ROLE_LE_ID"),
  ZP: requireEnv("ROLE_ZP_ID"),
  CH: requireEnv("ROLE_CH_ID"),
  SP: requireEnv("ROLE_SP_ID"),
  WA: requireEnv("ROLE_WA_ID"),
  TICKET_JOIN_LEADERSHIP_ROLE: requireEnv("ROLE_TICKET_JOIN_LEADERSHIP_ID"),
  TICKET_STAFF_LEADERSHIP_ROLE: requireEnv("ROLE_TICKET_STAFF_LEADERSHIP_ID"),
  VISITOR: requireEnv("ROLE_VISITOR_ID"),
  VERIFIED: requireEnv("ROLE_VERIFIED_ID")
};

export const CHANNEL_IDS = {
  WM: requireEnv("CHANNEL_WM_ID"),
  LE: requireEnv("CHANNEL_LE_ID"),
  ZP: requireEnv("CHANNEL_ZP_ID"),
  CH: requireEnv("CHANNEL_CH_ID"),
  SP: requireEnv("CHANNEL_SP_ID"),
  WA: requireEnv("CHANNEL_WA_ID"),
  CLANS_LIST: requireEnv("CHANNEL_CLANS_LIST_ID"),
  ATTACK_PLANNING: requireEnv("CHANNEL_ATTACK_PLANNING_ID"),
  FUN_CATEGORY: requireEnv("CHANNEL_FUN_CATEGORY_ID"),
  CWL_SIGNUPS: requireEnv("CHANNEL_CWL_SIGNUPS_ID"),
  TICKET_CATEGORY: requireEnv("CHANNEL_TICKET_CATEGORY_ID"),
  BASE_VAULT: requireEnv("CHANNEL_BASE_VAULT_ID"),
  SHOWCASE_BASE: requireEnv("CHANNEL_SHOWCASE_BASE_ID"),
  VERIFICATION_CHANNEL: requireEnv("CHANNEL_VERIFICATION_ID")
};

export interface ClanInfo {
  abbr: string;
  name: string;
  roleId: string;
  channelId: string;
  tag: string;
}

export const CLANS: Record<string, ClanInfo> = {
  WM: {
    abbr: "WM",
    name: "WAR MASTER",
    roleId: ROLE_IDS.WM,
    channelId: CHANNEL_IDS.WM,
    tag: requireEnv("CLAN_TAG_WM")
  },
  LE: {
    abbr: "LE",
    name: "LEGENDS",
    roleId: ROLE_IDS.LE,
    channelId: CHANNEL_IDS.LE,
    tag: requireEnv("CLAN_TAG_LE")
  },
  ZP: {
    abbr: "ZP",
    name: "ZwartePiet",
    roleId: ROLE_IDS.ZP,
    channelId: CHANNEL_IDS.ZP,
    tag: requireEnv("CLAN_TAG_ZP")
  },
  CH: {
    abbr: "CH",
    name: "Clash Heros",
    roleId: ROLE_IDS.CH,
    channelId: CHANNEL_IDS.CH,
    tag: requireEnv("CLAN_TAG_CH")
  },
  SP: {
    abbr: "SP",
    name: "SP.OPS.DIVISION",
    roleId: ROLE_IDS.SP,
    channelId: CHANNEL_IDS.SP,
    tag: requireEnv("CLAN_TAG_SP")
  },
  WA: {                                           // New clan
    abbr: "WA",
    name: "War Addiction",
    roleId: ROLE_IDS.WA,
    channelId: CHANNEL_IDS.WA,
    tag: requireEnv("CLAN_TAG_WA")
  }
};

export const CLAN_LIST = Object.values(CLANS);
export const CLAN_TAGS = Object.fromEntries(
  Object.entries(CLANS).map(([key, clan]) => [key, clan.tag])
);
export const CLAN_NAMES = Object.fromEntries(
  Object.entries(CLANS).map(([key, clan]) => [key, clan.name])
);

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

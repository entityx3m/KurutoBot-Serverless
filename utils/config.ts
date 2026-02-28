// utils/config.ts
// Centralized configuration for all IDs, clans, and API URLs

export const API_URLS = {
  COC_API_BASE: "https://cocproxy.royaleapi.dev/v1",
  DISCORD_API: "https://discord.com/api/v10"
};

export const ROLE_IDS = {
  BOOM_MEMBER: "REDACTED_BOOM_MEMBER_ID",
  WM: "REDACTED_WM_ID",
  LE: "REDACTED_LE_ID",
  ZP: "REDACTED_ZP_ID",
  CH: "REDACTED_CH_ID",
  SP: "REDACTED_SP_ID",
  TICKET_JOIN_LEADERSHIP_ROLE: "REDACTED_TICKET_JOIN_LEADERSHIP_ID",   // Role mentioned in join‑clan welcome
  TICKET_STAFF_LEADERSHIP_ROLE: "REDACTED_TICKET_STAFF_LEADERSHIP_ID",  // Role mentioned in staff‑related tickets
  VISITOR: "REDACTED_VISITOR_ID",
  VERIFIED: "REDACTED_VERIFIED_ID"
};

export const CHANNEL_IDS = {
  WM: "REDACTED_CHANNEL_WM_ID",
  LE: "REDACTED_CHANNEL_LE_ID",
  ZP: "REDACTED_CHANNEL_ZP_ID",
  CH: "REDACTED_CHANNEL_CH_ID",
  SP: "REDACTED_CHANNEL_SP_ID",
  CLANS_LIST: "REDACTED_CHANNEL_CLANS_LIST_ID",
  ATTACK_PLANNING: "REDACTED_CHANNEL_ATTACK_PLANNING_ID",
  FUN_CATEGORY: "REDACTED_CHANNEL_FUN_CATEGORY_ID",
  CWL_SIGNUPS: "REDACTED_CHANNEL_CWL_SIGNUPS_ID",
  TICKET_CATEGORY: "REDACTED_CHANNEL_TICKET_CATEGORY_ID",
  BASE_VAULT: "REDACTED_CHANNEL_BASE_VAULT_ID",
  SHOWCASE_BASE: "REDACTED_CHANNEL_SHOWCASE_BASE_ID",
  VERIFICATION_CHANNEL: "REDACTED_CHANNEL_VERIFICATION_ID"
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
    tag: "REDACTED_WM_CLAN_TAG"
  },
  LE: {
    abbr: "LE",
    name: "LEGENDS",
    roleId: ROLE_IDS.LE,
    channelId: CHANNEL_IDS.LE,
    tag: "REDACTED_LE_CLAN_TAG"
  },
  ZP: {
    abbr: "ZP",
    name: "ZwartePiet",
    roleId: ROLE_IDS.ZP,
    channelId: CHANNEL_IDS.ZP,
    tag: "REDACTED_ZP_CLAN_TAG"
  },
  CH: {
    abbr: "CH",
    name: "Clash Heros",
    roleId: ROLE_IDS.CH,
    channelId: CHANNEL_IDS.CH,
    tag: "REDACTED_CH_CLAN_TAG"
  },
  SP: {
    abbr: "SP",
    name: "SP.OPS.DIVISION",
    roleId: ROLE_IDS.SP,
    channelId: CHANNEL_IDS.SP,
    tag: "REDACTED_SP_CLAN_TAG"
  }
};

export const CLAN_LIST = Object.values(CLANS);
export const CLAN_TAGS = Object.fromEntries(
  Object.entries(CLANS).map(([key, clan]) => [key, clan.tag])
);
export const CLAN_NAMES = Object.fromEntries(
  Object.entries(CLANS).map(([key, clan]) => [key, clan.name])
);

export const GUILD_ID = process.env.GUILD_ID || "REDACTED_WM_ID";
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

import { configDotenv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { kv } from "@vercel/kv";

configDotenv();

type LegacyLeagueTier = {
  name?: string;
  iconUrls?: {
    small?: string;
    medium?: string;
    large?: string;
  };
};

type LegacyClanInfo = {
  tag?: string;
  name?: string;
};

type LegacyPlayerAccount = {
  playerTag?: string;
  playerName?: string;
  townHallLevel?: number;
  expLevel?: number;
  leagueTier?: LegacyLeagueTier;
  clan?: LegacyClanInfo;
  role?: string;
  warPreference?: string;
  isMain?: boolean;
  linkedAt?: string;
  linkedBy?: string;
};

type LegacyUserData = {
  discordId?: string;
  discordName?: string;
  accounts?: LegacyPlayerAccount[];
  mainAccountTag?: string;
  recruitedAt?: string;
  recruitedBy?: string;
  recruiterName?: string;
  clan?: string;
  nickname?: string;
  lastUpdated?: string;
};

type UserRow = {
  discord_id: string;
  discord_name: string;
  main_account_tag: string | null;
  recruited_at: string | null;
  recruited_by: string | null;
  recruiter_name: string | null;
  clan: string | null;
  nickname: string | null;
  last_updated: string;
};

type AccountRow = {
  player_tag: string;
  discord_id: string;
  player_name: string;
  town_hall_level: number;
  exp_level: number;
  league_tier: LegacyLeagueTier | null;
  clan_info: LegacyClanInfo | null;
  role: string | null;
  war_preference: string | null;
  is_main: boolean;
  linked_at: string;
  linked_by: string | null;
};

type ClanSetupSeedRow = {
  clan_tag: string;
  clan_name: string;
  category: "main_clan" | "cwl_clan" | "alt_clan";
  abbreviation: string;
  clan_channel_id: string | null;
  clan_role_id: string | null;
  member_count: number;
  last_updated: string;
  updated_at: string;
};

function normalizeTag(tag: string | undefined): string {
  if (!tag) return "";
  return tag.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function toIsoOrNow(value: string | undefined): string {
  if (!value) return new Date().toISOString();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
  return parsed.toISOString();
}

function chunk<T>(items: T[], size: number): T[][] {
  const output: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    output.push(items.slice(i, i + size));
  }
  return output;
}

type ClanEnvDefinition = {
  name: string;
  abbreviation: string;
  tag: string | undefined;
  channelId: string | undefined;
  roleId: string | undefined;
};

const CLAN_ENV_DEFINITIONS: ClanEnvDefinition[] = [
  {
    name: "WAR MASTER",
    abbreviation: "WM",
    tag: process.env.CLAN_TAG_WM,
    channelId: process.env.CHANNEL_WM_ID,
    roleId: process.env.ROLE_WM_ID,
  },
  {
    name: "LEGENDS",
    abbreviation: "LE",
    tag: process.env.CLAN_TAG_LE,
    channelId: process.env.CHANNEL_LE_ID,
    roleId: process.env.ROLE_LE_ID,
  },
  {
    name: "ZwartePiet",
    abbreviation: "ZP",
    tag: process.env.CLAN_TAG_ZP,
    channelId: process.env.CHANNEL_ZP_ID,
    roleId: process.env.ROLE_ZP_ID,
  },
  {
    name: "Clash Heros",
    abbreviation: "CH",
    tag: process.env.CLAN_TAG_CH,
    channelId: process.env.CHANNEL_CH_ID,
    roleId: process.env.ROLE_CH_ID,
  },
  {
    name: "War Addiction",
    abbreviation: "WA",
    tag: process.env.CLAN_TAG_WA,
    channelId: process.env.CHANNEL_WA_ID,
    roleId: process.env.ROLE_WA_ID,
  },
];

function buildLegacyClanTagLookup(): Record<string, string> {
  const lookup: Record<string, string> = {};

  for (const clan of CLAN_ENV_DEFINITIONS) {
    const normalizedTag = normalizeTag(clan.tag);
    if (!normalizedTag) continue;
    lookup[clan.abbreviation.toUpperCase()] = normalizedTag;
  }

  return lookup;
}

const LEGACY_CLAN_TAG_LOOKUP = buildLegacyClanTagLookup();

function translateLegacyClanToTag(value: string | undefined): string | null {
  if (!value) return null;

  const trimmedValue = value.trim();
  if (!trimmedValue) return null;

  const abbreviationMatch = LEGACY_CLAN_TAG_LOOKUP[trimmedValue.toUpperCase()];
  if (abbreviationMatch) return abbreviationMatch;

  return normalizeTag(trimmedValue);
}

function buildClanSetupSeedRowsFromEnv(): ClanSetupSeedRow[] {
  const nowIso = new Date().toISOString();
  const rows: ClanSetupSeedRow[] = [];

  for (const candidate of CLAN_ENV_DEFINITIONS) {
    const normalizedTag = translateLegacyClanToTag(candidate.tag);
    if (!normalizedTag) continue;

    rows.push({
      clan_tag: normalizedTag,
      clan_name: candidate.name,
      category: "main_clan",
      abbreviation: candidate.abbreviation,
      clan_channel_id: candidate.channelId || null,
      clan_role_id: candidate.roleId || null,
      member_count: 0,
      last_updated: nowIso,
      updated_at: nowIso,
    });
  }

  return rows;
}

function buildLegacyClanLookup(seedRows: ClanSetupSeedRow[]): Map<string, string> {
  const lookup = new Map<string, string>();
  for (const row of seedRows) {
    const normalizedTag = normalizeTag(row.clan_tag);
    if (!normalizedTag) continue;

    lookup.set(normalizedTag, normalizedTag);
    lookup.set(row.abbreviation.trim().toUpperCase(), normalizedTag);
    lookup.set(row.clan_name.trim().toUpperCase(), normalizedTag);
  }

  return lookup;
}

function normalizeLegacyClanValue(
  value: string | undefined,
  lookup: Map<string, string>
): string | null {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const normalizedTag = normalizeTag(raw);
  if (raw.startsWith("#") && normalizedTag) {
    return normalizedTag;
  }

  const normalizedRaw = raw.toUpperCase();
  const mapped = lookup.get(normalizedRaw) || (normalizedTag ? lookup.get(normalizedTag) : undefined);
  if (mapped) {
    return mapped;
  }

  if (normalizedTag.length >= 5) {
    return normalizedTag;
  }

  return normalizedRaw;
}

async function scanUserKeys(prefix: string): Promise<string[]> {
  const match = `${prefix}:user:*`;
  const keys = new Set<string>();
  const kvAny = kv as any;

  if (typeof kvAny.scan === "function") {
    let cursor: number | string = 0;

    do {
      const result = await kvAny.scan(cursor, { match, count: 500 });
      let nextCursor: any = 0;
      let batch: any[] = [];

      if (Array.isArray(result)) {
        nextCursor = result[0];
        batch = Array.isArray(result[1]) ? result[1] : [];
      } else if (result && typeof result === "object") {
        nextCursor = result.cursor ?? result.nextCursor ?? 0;
        batch = Array.isArray(result.keys) ? result.keys : [];
      }

      for (const key of batch) {
        keys.add(String(key));
      }

      const parsedCursor = Number(nextCursor);
      cursor = Number.isFinite(parsedCursor) ? parsedCursor : 0;
    } while (Number(cursor) !== 0);

    return [...keys];
  }

  throw new Error("kv.scan is not available in current KV client; cannot enumerate legacy user keys.");
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const apply = args.has("--apply");
  const dryRun = !apply;

  const kvPrefix = process.env.MIGRATION_KV_PREFIX || process.env.GUILD_ID || "BOOM_HOUSE";
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY.");
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log(`Starting KV -> Supabase migration (${dryRun ? "DRY RUN" : "APPLY"})`);
  console.log(`KV prefix: ${kvPrefix}`);

  const clanSeedRows = buildClanSetupSeedRowsFromEnv();
  const legacyClanLookup = buildLegacyClanLookup(clanSeedRows);

  const keys = await scanUserKeys(kvPrefix);
  console.log(`Discovered ${keys.length} legacy user keys`);

  const userRows: UserRow[] = [];
  const accountRows: AccountRow[] = [];

  const tagOwner = new Map<string, string>();

  let usersRead = 0;
  let usersSkipped = 0;
  let accountsSkippedInvalid = 0;
  let accountsSkippedConflict = 0;

  for (const key of keys) {
    const rawUser = await kv.get<LegacyUserData>(key);
    usersRead += 1;

    if (!rawUser) {
      usersSkipped += 1;
      console.warn(`Skipping ${key}: empty payload`);
      continue;
    }

    const keyUserId = key.split(":user:")[1] || "";
    const discordId = String(rawUser.discordId || keyUserId || "").trim();
    const discordName = String(rawUser.discordName || "Unknown").trim() || "Unknown";

    if (!discordId) {
      usersSkipped += 1;
      console.warn(`Skipping ${key}: missing discordId`);
      continue;
    }

    const legacyAccounts = Array.isArray(rawUser.accounts) ? rawUser.accounts : [];

    const cleanedAccounts = legacyAccounts
      .map((acc) => ({ ...acc, playerTag: normalizeTag(acc.playerTag) }))
      .filter((acc) => {
        if (!acc.playerTag || !acc.playerName) {
          accountsSkippedInvalid += 1;
          return false;
        }
        return true;
      });

    const uniqueAccounts: LegacyPlayerAccount[] = [];
    const seenWithinUser = new Set<string>();

    for (const account of cleanedAccounts) {
      const normalizedTag = account.playerTag as string;
      if (seenWithinUser.has(normalizedTag)) continue;
      seenWithinUser.add(normalizedTag);
      uniqueAccounts.push(account);
    }

    const normalizedMainTag = normalizeTag(rawUser.mainAccountTag);
    const resolvedMainTag = uniqueAccounts.some((acc) => acc.playerTag === normalizedMainTag)
      ? normalizedMainTag
      : uniqueAccounts[0]?.playerTag || "";

    for (const account of uniqueAccounts) {
      const normalizedTag = normalizeTag(account.playerTag);
      const existingOwner = tagOwner.get(normalizedTag);

      if (existingOwner && existingOwner !== discordId) {
        accountsSkippedConflict += 1;
        console.warn(
          `Conflict for #${normalizedTag}: owned by ${existingOwner}, skipping duplicate in ${discordId}`
        );
        continue;
      }

      tagOwner.set(normalizedTag, discordId);

      accountRows.push({
        player_tag: normalizedTag,
        discord_id: discordId,
        player_name: String(account.playerName),
        town_hall_level: Number(account.townHallLevel || 0),
        exp_level: Number(account.expLevel || 0),
        league_tier: account.leagueTier || null,
        clan_info: account.clan || null,
        role: account.role || null,
        war_preference: account.warPreference || null,
        is_main: normalizedTag === resolvedMainTag,
        linked_at: toIsoOrNow(account.linkedAt),
        linked_by: account.linkedBy || null,
      });
    }

    userRows.push({
      discord_id: discordId,
      discord_name: discordName,
      main_account_tag: resolvedMainTag || null,
      recruited_at: rawUser.recruitedAt || null,
      recruited_by: rawUser.recruitedBy || null,
      recruiter_name: rawUser.recruiterName || null,
      clan: normalizeLegacyClanValue(rawUser.clan, legacyClanLookup),
      nickname: rawUser.nickname || null,
      last_updated: toIsoOrNow(rawUser.lastUpdated),
    });
  }

  console.log("Migration summary (prepared):");
  console.log(`- users read: ${usersRead}`);
  console.log(`- users prepared: ${userRows.length}`);
  console.log(`- users skipped: ${usersSkipped}`);
  console.log(`- accounts prepared: ${accountRows.length}`);
  console.log(`- accounts skipped (invalid): ${accountsSkippedInvalid}`);
  console.log(`- accounts skipped (cross-user conflict): ${accountsSkippedConflict}`);

  console.log(`- clan rows prepared from env: ${clanSeedRows.length}`);

  if (dryRun) {
    console.log("Dry run complete. No changes were written to Supabase.");
    console.log("Run with --apply to write data.");
    return;
  }

  for (const batch of chunk(userRows, 200)) {
    const { error } = await supabase.from("users").upsert(batch, { onConflict: "discord_id" });
    if (error) {
      throw new Error(`Failed upserting users batch: ${error.message}`);
    }
  }

  for (const batch of chunk(accountRows, 200)) {
    const { error } = await supabase.from("accounts").upsert(batch, { onConflict: "player_tag" });
    if (error) {
      throw new Error(`Failed upserting accounts batch: ${error.message}`);
    }
  }

  if (clanSeedRows.length > 0) {
    for (const batch of chunk(clanSeedRows, 200)) {
        const { error } = await supabase.from("clans").upsert(batch, { onConflict: "clan_tag" });
      if (error) {
          throw new Error(`Failed upserting clans batch: ${error.message}`);
      }
    }
  }

  console.log("Migration applied successfully.");
  console.log(`- users upserted: ${userRows.length}`);
  console.log(`- accounts upserted: ${accountRows.length}`);
  console.log(`- clan setup rows upserted: ${clanSeedRows.length}`);
}

main().catch((error) => {
  console.error("KV -> Supabase migration failed:", error);
  process.exitCode = 1;
});

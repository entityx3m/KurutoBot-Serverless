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
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY).");
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("Using SUPABASE_ANON_KEY for migration. If RLS is enabled, use SUPABASE_SERVICE_ROLE_KEY instead.");
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log(`Starting KV -> Supabase migration (${dryRun ? "DRY RUN" : "APPLY"})`);
  console.log(`KV prefix: ${kvPrefix}`);

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
      clan: rawUser.clan || null,
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

  console.log("Migration applied successfully.");
  console.log(`- users upserted: ${userRows.length}`);
  console.log(`- accounts upserted: ${accountRows.length}`);
}

main().catch((error) => {
  console.error("KV -> Supabase migration failed:", error);
  process.exitCode = 1;
});

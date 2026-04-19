import { cocApi } from "./cocApi";
import { supabase } from "./db";

export type ClanCategory = "main_clan" | "cwl_clan" | "alt_clan";

export const CLAN_CATEGORY_LABELS: Record<ClanCategory, string> = {
  main_clan: "Main Clan",
  cwl_clan: "CWL clan",
  alt_clan: "Alt Clan",
};

export interface ClanSetup {
  clanTag: string;
  clanName: string;
  category: ClanCategory;
  abbreviation: string;
  clanChannelId?: string;
  clanRoleId?: string;
  createdAt: string;
  updatedAt: string;
}

interface UpsertClanInput {
  category: ClanCategory;
  clanTag: string;
  abbreviation: string;
  clanChannelId?: string;
  clanRoleId?: string;
}

const TABLE = "clans";

function isMissingTableError(error: any): boolean {
  return error?.code === "PGRST205";
}

function toIsoString(value: unknown): string {
  if (!value) return new Date().toISOString();
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  return new Date(value as any).toISOString();
}

export function normalizeClanTag(rawTag: string): string {
  return rawTag.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function categoryRequiresMainClanFields(category: ClanCategory): boolean {
  return category === "main_clan";
}

function rowToModel(row: any): ClanSetup {
  return {
    clanTag: row.clan_tag,
    clanName: row.clan_name,
    category: row.category,
    abbreviation: row.abbreviation,
    clanChannelId: row.clan_channel_id || undefined,
    clanRoleId: row.clan_role_id || undefined,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

async function getClanNameFromApi(clanTag: string): Promise<string | null> {
  const result = await cocApi.getClan(clanTag);
  if (!result.success) {
    return null;
  }
  return String(result.data?.name || "").trim() || null;
}

export async function getConfiguredClans(): Promise<ClanSetup[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    if (isMissingTableError(error)) {
      return [];
    }
    throw new Error(`Failed to load clans rows: ${error.message}`);
  }

  return (data || []).map(rowToModel);
}

export async function getMainClans(): Promise<ClanSetup[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("category", "main_clan")
    .order("created_at", { ascending: true });

  if (error) {
    if (isMissingTableError(error)) {
      return [];
    }
    throw new Error(`Failed to load main clan rows: ${error.message}`);
  }

  return (data || []).map(rowToModel);
}

export async function getClanByTag(clanTag: string): Promise<ClanSetup | null> {
  const normalizedTag = normalizeClanTag(clanTag);

  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("clan_tag", normalizedTag)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error)) {
      return null;
    }
    throw new Error(`Failed to load clan ${normalizedTag}: ${error.message}`);
  }

  return data ? rowToModel(data) : null;
}

export async function getMainClanByTagOrName(query: string): Promise<ClanSetup | null> {
  const normalizedTag = normalizeClanTag(query);
  const mainClans = await getMainClans();

  return (
    mainClans.find((clan) => clan.clanTag === normalizedTag) ||
    mainClans.find((clan) => clan.clanName.toLowerCase() === query.trim().toLowerCase()) ||
    null
  );
}

export async function upsertClanSetup(input: UpsertClanInput): Promise<ClanSetup> {
  const normalizedTag = normalizeClanTag(input.clanTag);
  if (!normalizedTag) {
    throw new Error("Clan tag is required.");
  }

  if (!input.abbreviation || input.abbreviation.trim().length === 0) {
    throw new Error("Clan abbreviation is required.");
  }

  if (categoryRequiresMainClanFields(input.category)) {
    if (!input.clanChannelId || !input.clanRoleId) {
      throw new Error("Main Clan requires both clan channel and clan member role.");
    }
  }

  const clanNameFromApi = await getClanNameFromApi(normalizedTag);
  if (!clanNameFromApi) {
    throw new Error(`Unable to fetch clan details for #${normalizedTag}.`);
  }

  const payload = {
    clan_tag: normalizedTag,
    clan_name: clanNameFromApi,
    category: input.category,
    abbreviation: input.abbreviation.trim().toUpperCase().slice(0, 10),
    clan_channel_id: input.clanChannelId || null,
    clan_role_id: input.clanRoleId || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from(TABLE)
    .upsert(payload, { onConflict: "clan_tag" })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to save clan setup row: ${error.message}`);
  }

  return rowToModel(data);
}

export async function unlinkClan(clanTag: string): Promise<boolean> {
  const normalizedTag = normalizeClanTag(clanTag);

  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq("clan_tag", normalizedTag);

  if (error) {
    if (isMissingTableError(error)) {
      return false;
    }
    throw new Error(`Failed to unlink clan ${normalizedTag}: ${error.message}`);
  }

  return true;
}

export async function getMainClanAutocompleteChoices(input: string): Promise<Array<{ name: string; value: string }>> {
  const normalizedInput = input.trim().toLowerCase();
  const clans = await getMainClans();

  return clans
    .filter((clan) => {
      if (!normalizedInput) return true;
      return (
        clan.clanName.toLowerCase().includes(normalizedInput) ||
        clan.clanTag.toLowerCase().includes(normalizedInput)
      );
    })
    .slice(0, 25)
    .map((clan) => ({
      name: `${clan.clanName} (#${clan.clanTag})`.slice(0, 100),
      value: clan.clanTag,
    }));
}

export async function getConfiguredClanByTagOrName(query: string): Promise<ClanSetup | null> {
  const normalizedTag = normalizeClanTag(query);
  const configuredClans = await getConfiguredClans();

  return (
    configuredClans.find((clan) => clan.clanTag === normalizedTag) ||
    configuredClans.find((clan) => clan.clanName.toLowerCase() === query.trim().toLowerCase()) ||
    null
  );
}

export async function getConfiguredClanAutocompleteChoices(input: string): Promise<Array<{ name: string; value: string }>> {
  const normalizedInput = input.trim().toLowerCase();
  const configuredClans = await getConfiguredClans();

  return configuredClans
    .filter((clan) => {
      if (!normalizedInput) return true;
      return (
        clan.clanName.toLowerCase().includes(normalizedInput) ||
        clan.clanTag.toLowerCase().includes(normalizedInput) ||
        clan.abbreviation.toLowerCase().includes(normalizedInput)
      );
    })
    .slice(0, 25)
    .map((clan) => ({
      name: `[${clan.abbreviation}] ${clan.clanName}`.slice(0, 100),
      value: clan.clanTag,
    }));
}

export async function resolveUserClanLabel(userClanValue: string): Promise<string> {
  const clan = await getClanByTag(userClanValue);
  if (clan) {
    return clan.clanName;
  }

  return userClanValue;
}

// utils/kvHelper.ts
import { supabase } from './db';

// Types for our data structure
export interface PlayerAccount {
  playerTag: string;
  playerName: string;
  townHallLevel: number;
  expLevel: number;
  leagueTier?: {
    name: string;
    iconUrls?: {
      small?: string;
      medium?: string;
      large?: string;
    };
  };
  clan?: {
    tag: string;
    name: string;
  };
  role?: string;
  warPreference?: string;
  isMain: boolean;
  linkedAt: string;
  linkedBy?: string;
}

export interface UserData {
  discordId: string;
  discordName: string;
  accounts: PlayerAccount[];
  mainAccountTag?: string; // Reference to main account
  recruitedAt?: string;
  recruitedBy?: string;
  recruiterName?: string;
  clan?: string; // Current BOOM clan (WM, LE, ZP, CH)
  nickname?: string;
  lastUpdated: string;
}

function normalizeTag(playerTag: string): string {
  return playerTag.trim().toUpperCase().replace(/^#/, '');
}

function toIsoString(value: unknown): string {
  if (!value) return new Date().toISOString();
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return new Date(value as any).toISOString();
}

function mapAccountRowToModel(row: any): PlayerAccount {
  return {
    playerTag: row.player_tag,
    playerName: row.player_name,
    townHallLevel: row.town_hall_level,
    expLevel: row.exp_level,
    leagueTier: row.league_tier || undefined,
    clan: row.clan_info || undefined,
    role: row.role || undefined,
    warPreference: row.war_preference || undefined,
    isMain: Boolean(row.is_main),
    linkedAt: toIsoString(row.linked_at),
    linkedBy: row.linked_by || undefined,
  };
}

function mapAccountModelToRow(userId: string, account: PlayerAccount) {
  return {
    player_tag: normalizeTag(account.playerTag),
    discord_id: userId,
    player_name: account.playerName,
    town_hall_level: account.townHallLevel,
    exp_level: account.expLevel,
    league_tier: account.leagueTier || null,
    clan_info: account.clan || null,
    role: account.role || null,
    war_preference: account.warPreference || null,
    is_main: account.isMain,
    linked_at: account.linkedAt,
    linked_by: account.linkedBy || null,
  };
}

// User data operations
export async function getUserData(userId: string): Promise<UserData | null> {
  try {
    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('discord_id', userId)
      .maybeSingle();

    if (userError) {
      console.error(`Failed to get user data for ${userId}:`, userError);
      return null;
    }
    if (!userRow) return null;

    const { data: accountRows, error: accountError } = await supabase
      .from('accounts')
      .select('*')
      .eq('discord_id', userId)
      .order('linked_at', { ascending: true });

    if (accountError) {
      console.error(`Failed to get account rows for ${userId}:`, accountError);
      return null;
    }

    const accounts = (accountRows || []).map(mapAccountRowToModel);
    const mainAccountTag = userRow.main_account_tag || accounts.find((acc) => acc.isMain)?.playerTag;

    return {
      discordId: userRow.discord_id,
      discordName: userRow.discord_name,
      accounts,
      mainAccountTag: mainAccountTag || undefined,
      recruitedAt: userRow.recruited_at ? toIsoString(userRow.recruited_at) : undefined,
      recruitedBy: userRow.recruited_by || undefined,
      recruiterName: userRow.recruiter_name || undefined,
      clan: userRow.clan || undefined,
      nickname: userRow.nickname || undefined,
      lastUpdated: userRow.last_updated ? toIsoString(userRow.last_updated) : new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Failed to get user data for ${userId}:`, error);
    return null;
  }
}

export async function setUserData(userId: string, data: UserData): Promise<boolean> {
  try {
    const now = new Date().toISOString();

    const computedMainTag =
      data.accounts.find((acc) => acc.playerTag === data.mainAccountTag)?.playerTag ||
      data.accounts.find((acc) => acc.isMain)?.playerTag ||
      data.accounts[0]?.playerTag;

    const normalizedMainTag = computedMainTag ? normalizeTag(computedMainTag) : null;

    const normalizedAccounts = data.accounts.map((acc, index) => ({
      ...acc,
      playerTag: normalizeTag(acc.playerTag),
      isMain: normalizedMainTag ? normalizeTag(acc.playerTag) === normalizedMainTag : index === 0,
    }));

    const { error: userUpsertError } = await supabase.from('users').upsert({
      discord_id: userId,
      discord_name: data.discordName,
      main_account_tag: normalizedMainTag,
      recruited_at: data.recruitedAt || null,
      recruited_by: data.recruitedBy || null,
      recruiter_name: data.recruiterName || null,
      clan: data.clan || null,
      nickname: data.nickname || null,
      last_updated: now,
    });

    if (userUpsertError) {
      console.error(`Failed to upsert user data for ${userId}:`, userUpsertError);
      return false;
    }

    const { data: existingRows, error: existingRowsError } = await supabase
      .from('accounts')
      .select('player_tag')
      .eq('discord_id', userId);

    if (existingRowsError) {
      console.error(`Failed to fetch existing accounts for ${userId}:`, existingRowsError);
      return false;
    }

    const desiredTags = new Set(normalizedAccounts.map((acc) => acc.playerTag));
    const tagsToDelete = (existingRows || [])
      .map((row) => row.player_tag)
      .filter((tag) => !desiredTags.has(tag));

    if (tagsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('accounts')
        .delete()
        .eq('discord_id', userId)
        .in('player_tag', tagsToDelete);

      if (deleteError) {
        console.error(`Failed to delete removed accounts for ${userId}:`, deleteError);
        return false;
      }
    }

    if (normalizedAccounts.length > 0) {
      const accountRows = normalizedAccounts.map((account) => mapAccountModelToRow(userId, account));
      const { error: accountUpsertError } = await supabase
        .from('accounts')
        .upsert(accountRows, { onConflict: 'player_tag' });

      if (accountUpsertError) {
        console.error(`Failed to upsert accounts for ${userId}:`, accountUpsertError);
        return false;
      }
    }

    data.accounts = normalizedAccounts;
    data.mainAccountTag = normalizedMainTag || undefined;
    data.lastUpdated = now;
    return true;
  } catch (error) {
    console.error(`Failed to set user data for ${userId}:`, error);
    return false;
  }
}

// Get reverse mapping (tag → userId)
export async function getUserIdByTag(playerTag: string): Promise<string | null> {
  try {
    const normalizedTag = normalizeTag(playerTag);
    const { data, error } = await supabase
      .from('accounts')
      .select('discord_id')
      .eq('player_tag', normalizedTag)
      .maybeSingle();

    if (error) {
      console.error(`Failed to get userId for tag ${playerTag}:`, error);
      return null;
    }

    return data?.discord_id || null;
  } catch (error) {
    console.error(`Failed to get userId for tag ${playerTag}:`, error);
    return null;
  }
}

// Deprecated: reverse map keys no longer exist in Supabase mode.
export async function linkTagToUser(playerTag: string, userId: string): Promise<boolean> {
  try {
    const existingUser = await getUserIdByTag(playerTag);
    return !existingUser || existingUser === userId;
  } catch (error) {
    console.error(`Failed to link tag ${playerTag} to user ${userId}:`, error);
    return false;
  }
}

// Deprecated: reverse map keys no longer exist in Supabase mode.
export async function unlinkTag(playerTag: string): Promise<boolean> {
  try {
    return true;
  } catch (error) {
    console.error(`Failed to unlink tag ${playerTag}:`, error);
    return false;
  }
}

// Get account by tag (efficient version using reverse mapping)
export async function getAccountByTag(playerTag: string): Promise<{userId: string, account: PlayerAccount} | null> {
  try {
    const normalizedTag = normalizeTag(playerTag);
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('player_tag', normalizedTag)
      .maybeSingle();

    if (error) {
      console.error(`Failed to get account by tag ${playerTag}:`, error);
      return null;
    }
    if (!data) return null;

    return { userId: data.discord_id, account: mapAccountRowToModel(data) };
  } catch (error) {
    console.error(`Failed to get account by tag ${playerTag}:`, error);
    return null;
  }
}

// Check if user has linked accounts (simple check)
export async function hasLinkedAccount(userId: string): Promise<boolean> {
  const userData = await getUserData(userId);
  return userData !== null && userData.accounts.length > 0;
}

// Get main account
export async function getMainAccount(userId: string): Promise<PlayerAccount | null> {
  const userData = await getUserData(userId);
  if (!userData) return null;
  
  return userData.accounts.find(acc => acc.isMain) || userData.accounts[0] || null;
}

// Render user accounts as a display string for ephemeral messages
export async function getUserAccountsDisplay(userId: string): Promise<string> {
  const userData = await getUserData(userId);
  if (!userData || userData.accounts.length === 0) {
    return "No linked accounts found.";
  }
  
  let display = `**📋 ${userData.discordName || 'User'}'s Linked Accounts:**\n\n`;
  
  userData.accounts.forEach((account, index) => {
    const isMain = account.isMain ? " ⭐" : "";
    const clanInfo = account.clan ? ` | ${account.clan.name}` : "";
    display += `${index + 1}. **${account.playerName}** (#${account.playerTag}) | TH${account.townHallLevel}${clanInfo}${isMain}\n`;
  });
  
  return display;
}
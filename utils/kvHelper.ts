// utils/kvHelper.ts
import { kv } from '@vercel/kv';

// Add server prefix to avoid collisions with other bots
const SERVER_PREFIX = process.env.GUILD_ID || 'BOOM_HOUSE';

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

// Helper to create server-specific keys
function createKey(key: string): string {
  return `${SERVER_PREFIX}:${key}`;
}

// Basic KV operations
export async function getKV<T = any>(key: string): Promise<T | null> {
  try {
    return await kv.get<T>(createKey(key));
  } catch (error) {
    console.error(`Failed to get KV key ${key}:`, error);
    return null;
  }
}

export async function setKV<T = any>(key: string, value: T): Promise<boolean> {
  try {
    await kv.set(createKey(key), value);
    return true;
  } catch (error) {
    console.error(`Failed to set KV key ${key}:`, error);
    return false;
  }
}

export async function deleteKV(key: string): Promise<boolean> {
  try {
    await kv.del(createKey(key));
    return true;
  } catch (error) {
    console.error(`Failed to delete KV key ${key}:`, error);
    return false;
  }
}

// User data operations
export async function getUserData(userId: string): Promise<UserData | null> {
  try {
    const data = await kv.get<UserData>(createKey(`user:${userId}`));
    return data;
  } catch (error) {
    console.error(`Failed to get user data for ${userId}:`, error);
    return null;
  }
}

export async function setUserData(userId: string, data: UserData): Promise<boolean> {
  try {
    data.lastUpdated = new Date().toISOString();
    await kv.set(createKey(`user:${userId}`), data);
    return true;
  } catch (error) {
    console.error(`Failed to set user data for ${userId}:`, error);
    return false;
  }
}

// Get reverse mapping (tag → userId)
export async function getUserIdByTag(playerTag: string): Promise<string | null> {
  try {
    const userId = await kv.get<string>(createKey(`tag:${playerTag}`));
    return userId;
  } catch (error) {
    console.error(`Failed to get userId for tag ${playerTag}:`, error);
    return null;
  }
}

// Link a player tag to a user (creates reverse mapping)
export async function linkTagToUser(playerTag: string, userId: string): Promise<boolean> {
  try {
    await kv.set(createKey(`tag:${playerTag}`), userId);
    return true;
  } catch (error) {
    console.error(`Failed to link tag ${playerTag} to user ${userId}:`, error);
    return false;
  }
}

// Unlink a player tag (removes reverse mapping)
export async function unlinkTag(playerTag: string): Promise<boolean> {
  try {
    await kv.del(createKey(`tag:${playerTag}`));
    return true;
  } catch (error) {
    console.error(`Failed to unlink tag ${playerTag}:`, error);
    return false;
  }
}

// Get account by tag (efficient version using reverse mapping)
export async function getAccountByTag(playerTag: string): Promise<{userId: string, account: PlayerAccount} | null> {
  try {
    const userId = await getUserIdByTag(playerTag);
    if (!userId) return null;
    
    const userData = await getUserData(userId);
    if (!userData) return null;
    
    const account = userData.accounts.find(acc => acc.playerTag === playerTag);
    if (!account) return null;
    
    return { userId, account };
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
// utils/kvHelper.ts
import { kv } from '@vercel/kv';

export async function getKV<T = any>(key: string): Promise<T | null> {
  try {
    return await kv.get<T>(key);
  } catch (error) {
    console.error(`Failed to get KV key ${key}:`, error);
    return null;
  }
}

export async function setKV<T = any>(key: string, value: T): Promise<boolean> {
  try {
    await kv.set(key, value);
    return true;
  } catch (error) {
    console.error(`Failed to set KV key ${key}:`, error);
    return false;
  }
}

export async function deleteKV(key: string): Promise<boolean> {
  try {
    await kv.del(key);
    return true;
  } catch (error) {
    console.error(`Failed to delete KV key ${key}:`, error);
    return false;
  }
}
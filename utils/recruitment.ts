// utils/recruitment.ts
import { configDotenv } from "dotenv";
import { kv } from "@vercel/kv";
import { CLAN_TAGS, CLAN_NAMES, MAX_CLAN_SIZE } from "./config";
import { cocApi } from "./cocApi";

configDotenv();

export interface ClanRecruitment {
  clan: string; // WM, LE, ZP, CH, SP
  name: string; // Full clan name
  memberCount: number; // Current members from API
  lastUpdated: number;
  clanTag?: string; // Clan tag for API calls
}

export class RecruitmentTracker {
  private static readonly KEY = "boom_house_recruitment";
  private static readonly MAX_CLAN_SIZE = MAX_CLAN_SIZE;

  static async initialize(): Promise<void> {
    try {
      // Get existing data
      const existingData =
        (await kv.hgetall<Record<string, ClanRecruitment>>(this.KEY)) || {};

      // Define all required clans
      const requiredClans = Object.keys(CLAN_TAGS);
      let needsUpdate = false;

      // Check if any clans are missing from KV and add them
      for (const clanKey of requiredClans) {
        if (!existingData[clanKey]) {
          console.log(`🆕 Initializing missing clan: ${clanKey}`);
          existingData[clanKey] = {
            clan: clanKey,
            name: CLAN_NAMES[clanKey as keyof typeof CLAN_NAMES],
            memberCount: 0,
            lastUpdated: Date.now(),
            clanTag: CLAN_TAGS[clanKey as keyof typeof CLAN_TAGS]
          };
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        await kv.hset(this.KEY, existingData);
        console.log("✅ Recruitment tracker updated with new clans");
      }
    } catch (error) {
      console.error(
        "❌ Failed to initialize recruitment tracker:",
        error
      );
    }
  }

  // Fetch real-time member counts from API
  static async updateFromAPI(): Promise<void> {
    try {
      // Ensure we have all clans loaded first
      await this.initialize();

      const clans = await this.getAllClans();

      for (const clan of clans) {
        const clanTag =
          clan.clanTag || CLAN_TAGS[clan.clan as keyof typeof CLAN_TAGS];

        if (clanTag) {
          try {
            const result = await cocApi.getClan(clanTag);

            if (result.success) {
              const memberCount = result.data.members || 0;

              // Update member count
              clan.memberCount = memberCount;
              clan.lastUpdated = Date.now();
              // Ensure name is up to date
              if (!clan.name && CLAN_NAMES[clan.clan as keyof typeof CLAN_NAMES]) {
                clan.name = CLAN_NAMES[clan.clan as keyof typeof CLAN_NAMES];
              }

              await kv.hset(this.KEY, { [clan.clan.toUpperCase()]: clan });
              console.log(
                `✅ Updated ${clan.name}: ${memberCount}/50 members`
              );
            } else {
              console.warn(`⚠️ Error fetching ${clan.name} data:`, result.message);
            }
          } catch (error) {
            console.warn(`⚠️ Error fetching ${clan.name} data:`, error);
          }
        }
      }
    } catch (error) {
      console.error("❌ Failed to update from API:", error);
    }
  }

  static async getClan(clan: string): Promise<ClanRecruitment | null> {
    try {
      const data = await kv.hget<ClanRecruitment>(
        this.KEY,
        clan.toUpperCase()
      );
      return data;
    } catch (error) {
      console.error(`❌ Failed to get clan ${clan}:`, error);
      return null;
    }
  }

  static async getAllClans(): Promise<ClanRecruitment[]> {
    try {
      const data =
        await kv.hgetall<Record<string, ClanRecruitment>>(this.KEY);
      // Sort clans to keep order consistent
      const clanOrder = Object.keys(CLAN_TAGS);

      return data
        ? Object.values(data).sort((a, b) => {
            return clanOrder.indexOf(a.clan) - clanOrder.indexOf(b.clan);
          })
        : [];
    } catch (error) {
      console.error("❌ Failed to get all clans:", error);
      return [];
    }
  }

  static async getSummary(): Promise<{
    clans: ClanRecruitment[];
    totalMembers: number;
    totalCapacity: number;
    totalEmptySlots: number;
    overallFillPercentage: number;
  }> {
    const clans = await this.getAllClans();

    // Calculate totals based on current member counts
    const totalMembers = clans.reduce(
      (sum, clan) => sum + clan.memberCount,
      0
    );
    const totalCapacity = clans.length * this.MAX_CLAN_SIZE;
    const totalEmptySlots = Math.max(0, totalCapacity - totalMembers);
    const overallFillPercentage =
      totalCapacity > 0
        ? Math.round((totalMembers / totalCapacity) * 100)
        : 0;

    return {
      clans,
      totalMembers,
      totalCapacity,
      totalEmptySlots,
      overallFillPercentage
    };
  }

  static createProgressBar(percentage: number): string {
    const filled = Math.round(percentage / 10);
    const empty = 10 - filled;
    return `[${"█".repeat(filled)}${"░".repeat(empty)}]`;
  }

  static calculateNeededRecruits(memberCount: number): number {
    return Math.max(0, this.MAX_CLAN_SIZE - memberCount);
  }
}

// Initialize on import to ensure new clans are added to KV on restart
RecruitmentTracker.initialize().catch(console.error);
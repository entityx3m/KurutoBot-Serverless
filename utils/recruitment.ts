// utils/recruitment.ts
import { configDotenv } from "dotenv";
import { CLAN_TAGS, CLAN_NAMES, MAX_CLAN_SIZE } from "./config";
import { cocApi } from "./cocApi";
import { supabase } from "./db";

configDotenv();

export interface ClanRecruitment {
  clan: string; // WM, LE, ZP, CH, SP
  name: string; // Full clan name
  memberCount: number; // Current members from API
  lastUpdated: number;
  clanTag?: string; // Clan tag for API calls
}

export class RecruitmentTracker {
  private static readonly TABLE = "clan_recruitment";
  private static readonly MAX_CLAN_SIZE = MAX_CLAN_SIZE;

  private static isMissingTableError(error: any): boolean {
    return error?.code === "PGRST205";
  }

  private static rowToModel(row: any): ClanRecruitment {
    const lastUpdatedValue = row.last_updated;
    const lastUpdated =
      typeof lastUpdatedValue === "number"
        ? lastUpdatedValue
        : new Date(lastUpdatedValue || Date.now()).getTime();

    return {
      clan: row.clan,
      name: row.name,
      memberCount: row.member_count ?? 0,
      lastUpdated,
      clanTag: row.clan_tag || undefined,
    };
  }

  private static modelToRow(model: ClanRecruitment) {
    return {
      clan: model.clan,
      name: model.name,
      member_count: model.memberCount,
      last_updated: new Date(model.lastUpdated).toISOString(),
      clan_tag: model.clanTag || null,
    };
  }

  static async initialize(): Promise<void> {
    try {
      const { data: existingRows, error: existingError } = await supabase
        .from(this.TABLE)
        .select("*");

      if (existingError) {
        if (this.isMissingTableError(existingError)) {
          console.warn(`⚠️ Table ${this.TABLE} is missing. Run the Supabase migration SQL before using recruitment tracker.`);
          return;
        }
        console.error("❌ Failed to load recruitment tracker rows:", existingError);
        return;
      }

      const existingData = new Map(
        (existingRows || []).map((row) => [String(row.clan).toUpperCase(), row])
      );

      // Define all required clans
      const requiredClans = Object.keys(CLAN_TAGS);
      const rowsToUpsert: any[] = [];

      // Check if any clans are missing and add them
      for (const clanKey of requiredClans) {
        if (!existingData.has(clanKey.toUpperCase())) {
          console.log(`🆕 Initializing missing clan: ${clanKey}`);
          rowsToUpsert.push({
            clan: clanKey,
            name: CLAN_NAMES[clanKey as keyof typeof CLAN_NAMES],
            member_count: 0,
            last_updated: new Date().toISOString(),
            clan_tag: CLAN_TAGS[clanKey as keyof typeof CLAN_TAGS],
          });
        }
      }

      if (rowsToUpsert.length > 0) {
        const { error: upsertError } = await supabase
          .from(this.TABLE)
          .upsert(rowsToUpsert, { onConflict: "clan" });

        if (upsertError) {
          console.error("❌ Failed to initialize recruitment tracker rows:", upsertError);
          return;
        }
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

              const { error: updateError } = await supabase
                .from(this.TABLE)
                .upsert(this.modelToRow(clan), { onConflict: "clan" });

              if (updateError) {
                console.warn(`⚠️ Failed updating ${clan.name} in Supabase:`, updateError);
                continue;
              }

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
      const { data, error } = await supabase
        .from(this.TABLE)
        .select("*")
        .eq("clan", clan.toUpperCase())
        .maybeSingle();

      if (error) {
        if (this.isMissingTableError(error)) {
          return null;
        }
        console.error(`❌ Failed to get clan ${clan}:`, error);
        return null;
      }

      return data ? this.rowToModel(data) : null;
    } catch (error) {
      console.error(`❌ Failed to get clan ${clan}:`, error);
      return null;
    }
  }

  static async getAllClans(): Promise<ClanRecruitment[]> {
    try {
      const { data, error } = await supabase
        .from(this.TABLE)
        .select("*");

      if (error) {
        if (this.isMissingTableError(error)) {
          return [];
        }
        console.error("❌ Failed to get all clans:", error);
        return [];
      }

      // Sort clans to keep order consistent
      const clanOrder = Object.keys(CLAN_TAGS);

      return data
        ? data.map((row) => this.rowToModel(row)).sort((a, b) => {
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

// Initialize eagerly only when the service role env is available at import time.
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  RecruitmentTracker.initialize().catch(console.error);
}
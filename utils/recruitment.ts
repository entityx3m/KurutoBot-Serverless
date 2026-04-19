// utils/recruitment.ts
import { configDotenv } from "dotenv";
import { MAX_CLAN_SIZE } from "./config";
import { cocApi } from "./cocApi";
import { supabase } from "./db";
import { getConfiguredClans } from "./clanSetup";

configDotenv();

export interface ClanRecruitment {
  clan: string; // Abbreviation (WM, LE, ZP, CH, WA)
  name: string; // Full clan name
  category: string; // Required database category
  memberCount: number; // Current members from API
  lastUpdated: number;
  clanTag?: string; // Clan tag for API calls
}

export class RecruitmentTracker {
  private static readonly TABLE = "clans";
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
      clan: row.abbreviation || row.clan_tag,
      name: row.clan_name,
      category: row.category,
      memberCount: row.member_count ?? 0,
      lastUpdated,
      clanTag: row.clan_tag,
    };
  }

  private static modelToRow(model: ClanRecruitment) {
    return {
      clan_tag: model.clanTag || model.clan,
      clan_name: model.name,
      abbreviation: model.clan,
      category: model.category,
      member_count: model.memberCount,
      last_updated: new Date(model.lastUpdated).toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  static async initialize(): Promise<void> {
    try {
      const configuredClans = await getConfiguredClans();
      if (configuredClans.length === 0) {
        return;
      }

      const { data: existingRows, error: existingError } = await (supabase as any)
        .from(this.TABLE)
        .select("*");

      if (existingError) {
        if (this.isMissingTableError(existingError)) {
          console.warn(`⚠️ Table ${this.TABLE} is missing. Run the Supabase migration SQL before using recruitment tracker.`);
          return;
        }
        console.error("❌ Failed to load recruitment tracker rows:", {
          message: existingError?.message,
          code: existingError?.code,
          details: existingError?.details,
          hint: existingError?.hint,
        });
        return;
      }

      const existingData = new Map(
        (existingRows || []).map((row: any) => [String(row.clan_tag).toUpperCase(), row])
      );

      const rowsToInsert: any[] = [];
      const rowsToUpdate: Array<{ clanTag: string; values: any }> = [];

      for (const configuredClan of configuredClans) {
        const normalizedTag = configuredClan.clanTag.toUpperCase();
        const existing = existingData.get(normalizedTag) as any;
        const now = new Date().toISOString();

        if (!existing) {
          const category = configuredClan.category;
          const clanChannelId = configuredClan.clanChannelId;
          const clanRoleId = configuredClan.clanRoleId;
          const isMainClan = category === "main_clan";

          if (!category || (isMainClan && (!clanChannelId || !clanRoleId))) {
            console.warn(
              `⚠️ Skipping initialization for clan ${configuredClan.clanName} (#${configuredClan.clanTag}) because required config fields are missing for insert.`
            );
            continue;
          }

          console.log(`🆕 Initializing recruitment fields for clan: ${configuredClan.clanName} (#${configuredClan.clanTag})`);
          rowsToInsert.push({
            clan_tag: configuredClan.clanTag,
            clan_name: configuredClan.clanName,
            abbreviation: configuredClan.abbreviation,
            category,
            clan_channel_id: clanChannelId ?? null,
            clan_role_id: clanRoleId ?? null,
            member_count: 0,
            last_updated: now,
            updated_at: now,
          });
          continue;
        }

        if (existing.member_count == null || !existing.last_updated) {
          console.log(`🆕 Initializing recruitment fields for clan: ${configuredClan.clanName} (#${configuredClan.clanTag})`);
          rowsToUpdate.push({
            clanTag: configuredClan.clanTag,
            values: {
              member_count: existing.member_count ?? 0,
              last_updated: now,
              updated_at: now,
            },
          });
        }
      }

      if (rowsToInsert.length > 0) {
        const { error: insertError } = await (supabase as any)
          .from(this.TABLE)
          .insert(rowsToInsert);

        if (insertError) {
          console.error("❌ Failed to initialize recruitment tracker rows:", {
            message: insertError?.message,
            code: insertError?.code,
            details: insertError?.details,
            hint: insertError?.hint,
          });
          return;
        }
      }

      if (rowsToUpdate.length > 0) {
        for (const rowToUpdate of rowsToUpdate) {
          const { error: updateError } = await (supabase as any)
            .from(this.TABLE)
            .update(rowToUpdate.values)
            .eq("clan_tag", rowToUpdate.clanTag);

          if (updateError) {
            console.error("❌ Failed to initialize recruitment tracker rows:", {
              message: updateError?.message,
              code: updateError?.code,
              details: updateError?.details,
              hint: updateError?.hint,
            });
            return;
          }
        }
      }

      if (rowsToInsert.length > 0 || rowsToUpdate.length > 0) {
        console.log("✅ Recruitment tracker updated with new clans");
      }
    } catch (error) {
      const cause = error instanceof Error ? (error as Error & { cause?: unknown }).cause : undefined;
      console.error("❌ Failed to initialize recruitment tracker:", {
        message: error instanceof Error ? error.message : String(error),
        name: error instanceof Error ? error.name : "UnknownError",
        cause: cause instanceof Error ? cause.message : cause,
      });
    }
  }

  // Fetch real-time member counts from API
  static async updateFromAPI(): Promise<void> {
    try {
      // Ensure we have all clans loaded first
      await this.initialize();

      const clans = await this.getAllClans();

      for (const clan of clans) {
        const clanTag = clan.clanTag || clan.clan;

        if (clanTag) {
          try {
            const result = await cocApi.getClan(clanTag);

            if (result.success) {
              const memberCount = result.data.members || 0;

              // Update member count
              clan.memberCount = memberCount;
              clan.lastUpdated = Date.now();

              const { error: updateError } = await (supabase as any)
                .from(this.TABLE)
                .upsert(this.modelToRow(clan), { onConflict: "clan_tag" });

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
      const normalized = clan.trim().toUpperCase();
      const { data, error } = await (supabase as any)
        .from(this.TABLE)
        .select("*")
        .or(`clan_tag.eq.${normalized},abbreviation.eq.${normalized}`)
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
      const configuredClans = await getConfiguredClans();

      const { data, error } = await (supabase as any)
        .from(this.TABLE)
        .select("*");

      if (error) {
        if (this.isMissingTableError(error)) {
          return [];
        }
        console.error("❌ Failed to get all clans:", error);
        return [];
      }

      const clanOrder = configuredClans.map((clan) => clan.clanTag.toUpperCase());

      return data
        ? data.map((row: any) => this.rowToModel(row)).sort((a: ClanRecruitment, b: ClanRecruitment) => {
            const left = clanOrder.indexOf((a.clanTag || "").toUpperCase());
            const right = clanOrder.indexOf((b.clanTag || "").toUpperCase());

            if (left === -1 && right === -1) {
              return a.name.localeCompare(b.name);
            }
            if (left === -1) {
              return 1;
            }
            if (right === -1) {
              return -1;
            }

            return left - right;
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

// Initialization is intentionally lazy to avoid startup failures on transient Supabase outages.
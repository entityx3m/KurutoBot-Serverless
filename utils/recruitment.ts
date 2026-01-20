// utils/recruitment.ts
import { configDotenv } from "dotenv";
configDotenv();
import { kv } from '@vercel/kv';

export interface ClanRecruitment {
  clan: string; // WM, LE, ZP, CH, SP
  name: string; // Full clan name
  memberCount: number; // Current members from API
  lastUpdated: number;
  clanTag?: string; // Clan tag for API calls
}

export class RecruitmentTracker {
  private static readonly KEY = 'boom_house_recruitment';
  private static readonly COC_API_BASE_URL = "https://cocproxy.royaleapi.dev/v1";
  private static readonly MAX_CLAN_SIZE = 50;
  
  // UPDATED: Added SP tag
  private static readonly CLAN_TAGS = {
    WM: 'REDACTED_WM_CLAN_TAG',
    LE: 'REDACTED_LE_CLAN_TAG', 
    ZP: 'REDACTED_ZP_CLAN_TAG',
    CH: 'REDACTED_CH_CLAN_TAG',
    SP: 'REDACTED_SP_CLAN_TAG'
  };

  private static readonly CLAN_NAMES = {
    WM: 'WAR MASTER',
    LE: 'LEGENDS',
    ZP: 'ZwartePiet',
    CH: 'Clash Heros',
    SP: 'SP.OPS.DIVISION'
  };

  static async initialize(): Promise<void> {
    try {
      // Get existing data
      const existingData = await kv.hgetall<Record<string, ClanRecruitment>>(this.KEY) || {};
      
      // Define all required clans
      const requiredClans = Object.keys(this.CLAN_TAGS);
      let needsUpdate = false;

      // Check if any clans are missing from KV and add them
      for (const clanKey of requiredClans) {
        if (!existingData[clanKey]) {
          console.log(`🆕 Initializing missing clan: ${clanKey}`);
          existingData[clanKey] = {
            clan: clanKey,
            name: this.CLAN_NAMES[clanKey as keyof typeof this.CLAN_NAMES],
            memberCount: 0,
            lastUpdated: Date.now(),
            clanTag: this.CLAN_TAGS[clanKey as keyof typeof this.CLAN_TAGS]
          };
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        await kv.hset(this.KEY, existingData);
        console.log('✅ Recruitment tracker updated with new clans');
      }
    } catch (error) {
      console.error('<a:redcross:1439044567415521443> Failed to initialize recruitment tracker:', error);
    }
  }

  // Fetch real-time member counts from API
  static async updateFromAPI(): Promise<void> {
    try {
      // Ensure we have all clans loaded first
      await this.initialize();
      
      const clans = await this.getAllClans();
      
      for (const clan of clans) {
        const clanTag = clan.clanTag || this.CLAN_TAGS[clan.clan as keyof typeof this.CLAN_TAGS];
        
        if (clanTag) {
          try {
            const encodedTag = encodeURIComponent(clanTag);
            const response = await fetch(`${this.COC_API_BASE_URL}/clans/${encodedTag}`, {
              headers: {
                'Authorization': `Bearer ${process.env.COC_API_KEY}`,
                'Accept': 'application/json'
              }
            });
            
            if (response.ok) {
              const clanData = await response.json();
              const memberCount = clanData.members || 0;
              
              // Update member count
              clan.memberCount = memberCount;
              clan.lastUpdated = Date.now();
              // Ensure name is up to date
              if (!clan.name && this.CLAN_NAMES[clan.clan as keyof typeof this.CLAN_NAMES]) {
                 clan.name = this.CLAN_NAMES[clan.clan as keyof typeof this.CLAN_NAMES];
              }
              
              await kv.hset(this.KEY, { [clan.clan.toUpperCase()]: clan });
              console.log(`✅ Updated ${clan.name}: ${memberCount}/50 members`);
            }
          } catch (error) {
            console.warn(`⚠️ Error fetching ${clan.name} data:`, error);
          }
        }
      }
    } catch (error) {
      console.error('<a:redcross:1439044567415521443> Failed to update from API:', error);
    }
  }

  static async getClan(clan: string): Promise<ClanRecruitment | null> {
    try {
      const data = await kv.hget<ClanRecruitment>(this.KEY, clan.toUpperCase());
      return data;
    } catch (error) {
      console.error(`<a:redcross:1439044567415521443> Failed to get clan ${clan}:`, error);
      return null;
    }
  }

  static async getAllClans(): Promise<ClanRecruitment[]> {
    try {
      const data = await kv.hgetall<Record<string, ClanRecruitment>>(this.KEY);
      // Sort clans to keep order consistent (optional: sort by keys defined in CLAN_TAGS)
      const clanOrder = Object.keys(this.CLAN_TAGS);
      
      return data 
        ? Object.values(data).sort((a, b) => {
            return clanOrder.indexOf(a.clan) - clanOrder.indexOf(b.clan);
          }) 
        : [];
    } catch (error) {
      console.error('<a:redcross:1439044567415521443> Failed to get all clans:', error);
      return [];
    }
  }

  static async getSummary() {
    const clans = await this.getAllClans();
    
    // Calculate totals based on current member counts
    const totalMembers = clans.reduce((sum, clan) => sum + clan.memberCount, 0);
    const totalCapacity = clans.length * this.MAX_CLAN_SIZE;
    const totalEmptySlots = Math.max(0, totalCapacity - totalMembers);
    const overallFillPercentage = totalCapacity > 0 ? Math.round((totalMembers / totalCapacity) * 100) : 0;
    
    return {
      clans,
      totalMembers,
      totalCapacity,
      totalEmptySlots,
      overallFillPercentage,
    };
  }

  static createProgressBar(percentage: number): string {
    const filled = Math.round(percentage / 10);
    const empty = 10 - filled;
    return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
  }

  static calculateNeededRecruits(memberCount: number): number {
    return Math.max(0, this.MAX_CLAN_SIZE - memberCount);
  }
}

// Initialize on import to ensure new clans are added to KV on restart
RecruitmentTracker.initialize().catch(console.error);
// utils/recruitment.ts
import { kv } from '@vercel/kv';

export interface ClanRecruitment {
  clan: string; // WM, LE, ZP, CH
  name: string; // Full clan name
  needed: number;
  current: number;
  lastUpdated: number;
  clanTag?: string; // NEW: Added clan tag field
}

export class RecruitmentTracker {
  private static readonly KEY = 'boom_house_recruitment';
  // NEW: Added CoC API constants
  private static readonly COC_API_BASE_URL = "https://cocproxy.royaleapi.dev/v1";
  private static readonly MAX_CLAN_SIZE = 50;
  private static readonly CLAN_TAGS = {
    WM: 'REDACTED_WM_CLAN_TAG',
    LE: 'REDACTED_LE_CLAN_TAG',
    ZP: 'REDACTED_ZP_CLAN_TAG',
    CH: 'REDACTED_CH_CLAN_TAG'
  };

  static async initialize(): Promise<void> {
    try {
      const exists = await kv.exists(this.KEY);
      if (!exists) {
        // UPDATED: Added clanTag to default clans
        const defaultClans: Record<string, ClanRecruitment> = {
          WM: { clan: 'WM', name: 'WAR MASTER', needed: 0, current: 0, lastUpdated: Date.now(), clanTag: 'REDACTED_WM_CLAN_TAG' },
          LE: { clan: 'LE', name: 'LEGENDS', needed: 0, current: 0, lastUpdated: Date.now(), clanTag: 'REDACTED_LE_CLAN_TAG' },
          ZP: { clan: 'ZP', name: 'ZwartePiet', needed: 0, current: 0, lastUpdated: Date.now(), clanTag: 'REDACTED_ZP_CLAN_TAG' },
          CH: { clan: 'CH', name: 'Clash Heros', needed: 0, current: 0, lastUpdated: Date.now(), clanTag: 'REDACTED_CH_CLAN_TAG' },
        };
        
        await kv.hset(this.KEY, defaultClans);
        console.log('✅ Recruitment tracker initialized with default data');
      }
    } catch (error) {
      console.error('❌ Failed to initialize recruitment tracker:', error);
    }
  }

  // NEW: Method to update recruitment data from CoC API
  static async updateFromAPI(): Promise<void> {
    try {
      const clans = await this.getAllClans();
      
      for (const clan of clans) {
        const clanTag = clan.clanTag || this.CLAN_TAGS[clan.clan as keyof typeof this.CLAN_TAGS];
        
        if (clanTag) {
          try {
            // Fetch clan data from API
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
              const needed = Math.max(0, this.MAX_CLAN_SIZE - memberCount);
              
              // Update the clan data
              clan.needed = needed;
              clan.lastUpdated = Date.now();
              
              await kv.hset(this.KEY, { [clan.clan.toUpperCase()]: clan });
              console.log(`✅ Updated ${clan.name}: ${memberCount}/50 members, need ${needed} recruits`);
            } else {
              console.warn(`⚠️ Failed to fetch ${clan.name} data: ${response.status}`);
            }
          } catch (error) {
            console.warn(`⚠️ Error fetching ${clan.name} data:`, error);
          }
        }
      }
    } catch (error) {
      console.error('❌ Failed to update from API:', error);
    }
  }

  static async setRecruitment(clan: string, needed: number): Promise<boolean> {
    try {
      const clanData = await this.getClan(clan);
      if (!clanData) return false;

      clanData.needed = needed;
      clanData.lastUpdated = Date.now();
      
      await kv.hset(this.KEY, { [clan.toUpperCase()]: clanData });
      return true;
    } catch (error) {
      console.error(`❌ Failed to set recruitment for ${clan}:`, error);
      return false;
    }
  }

  static async incrementCurrent(clan: string): Promise<boolean> {
    try {
      const clanData = await this.getClan(clan);
      if (!clanData) return false;

      clanData.current += 1;
      clanData.lastUpdated = Date.now();
      
      await kv.hset(this.KEY, { [clan.toUpperCase()]: clanData });
      return true;
    } catch (error) {
      console.error(`❌ Failed to increment current for ${clan}:`, error);
      return false;
    }
  }

  static async resetCurrent(clan: string): Promise<boolean> {
    try {
      const clanData = await this.getClan(clan);
      if (!clanData) return false;

      clanData.current = 0;
      clanData.lastUpdated = Date.now();
      
      await kv.hset(this.KEY, { [clan.toUpperCase()]: clanData });
      return true;
    } catch (error) {
      console.error(`❌ Failed to reset current for ${clan}:`, error);
      return false;
    }
  }

  static async getClan(clan: string): Promise<ClanRecruitment | null> {
    try {
      const data = await kv.hget<ClanRecruitment>(this.KEY, clan.toUpperCase());
      return data;
    } catch (error) {
      console.error(`❌ Failed to get clan ${clan}:`, error);
      return null;
    }
  }

  static async getAllClans(): Promise<ClanRecruitment[]> {
    try {
      const data = await kv.hgetall<Record<string, ClanRecruitment>>(this.KEY);
      return data ? Object.values(data) : [];
    } catch (error) {
      console.error('❌ Failed to get all clans:', error);
      return [];
    }
  }

  static async clearAll(): Promise<void> {
    try {
      await kv.del(this.KEY);
      await this.initialize();
      console.log('✅ Recruitment data cleared and reinitialized');
    } catch (error) {
      console.error('❌ Failed to clear recruitment data:', error);
    }
  }

  // Helper to create progress bar for display
  static createProgressBar(percentage: number): string {
    const filled = Math.round(percentage / 10);
    const empty = 10 - filled;
    return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
  }

  // Get formatted summary
  static async getSummary() {
    const clans = await this.getAllClans();
    const totalNeeded = clans.reduce((sum, clan) => sum + clan.needed, 0);
    const totalCurrent = clans.reduce((sum, clan) => sum + clan.current, 0);
    const remaining = totalNeeded - totalCurrent;
    
    return {
      clans,
      totalNeeded,
      totalCurrent,
      remaining,
      overallProgress: totalNeeded > 0 ? Math.round((totalCurrent / totalNeeded) * 100) : 0,
    };
  }
}

// Initialize on import
RecruitmentTracker.initialize().catch(console.error);
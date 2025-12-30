// utils/recruitment.ts (simplified - remove current/needed tracking since we use API)
import { kv } from '@vercel/kv';

export interface ClanRecruitment {
  clan: string; // WM, LE, ZP, CH
  name: string; // Full clan name
  memberCount: number; // Current members from API
  lastUpdated: number;
  clanTag?: string; // Clan tag for API calls
}

export class RecruitmentTracker {
  private static readonly KEY = 'boom_house_recruitment';
  private static readonly COC_API_BASE_URL = "https://cocproxy.royaleapi.dev/v1";
  private static readonly MAX_CLAN_SIZE = 50;
  private static readonly CLAN_TAGS = {
    WM: 'REDACTED_WM_CLAN_TAG',
    LE: 'REDACTED_LE_CLAN_TAG', 
    ZP: 'REDACTED_ZP_CLAN_TAG',
    CH: 'REDACTED_CH_CLAN_TAG'
  };

  // Remove current and needed from initialization
  static async initialize(): Promise<void> {
    try {
      const exists = await kv.exists(this.KEY);
      if (!exists) {
        const defaultClans: Record<string, ClanRecruitment> = {
          WM: { clan: 'WM', name: 'WAR MASTER', memberCount: 0, lastUpdated: Date.now(), clanTag: 'REDACTED_WM_CLAN_TAG' },
          LE: { clan: 'LE', name: 'LEGENDS', memberCount: 0, lastUpdated: Date.now(), clanTag: 'REDACTED_LE_CLAN_TAG' },
          ZP: { clan: 'ZP', name: 'ZwartePiet', memberCount: 0, lastUpdated: Date.now(), clanTag: 'REDACTED_ZP_CLAN_TAG' },
          CH: { clan: 'CH', name: 'Clash Heros', memberCount: 0, lastUpdated: Date.now(), clanTag: 'REDACTED_CH_CLAN_TAG' },
        };
        
        await kv.hset(this.KEY, defaultClans);
        console.log('✅ Recruitment tracker initialized');
      }
    } catch (error) {
      console.error('❌ Failed to initialize recruitment tracker:', error);
    }
  }

  // Fetch real-time member counts from API
  static async updateFromAPI(): Promise<void> {
    try {
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
              
              // Update only member count
              clan.memberCount = memberCount;
              clan.lastUpdated = Date.now();
              
              await kv.hset(this.KEY, { [clan.clan.toUpperCase()]: clan });
              console.log(`✅ Updated ${clan.name}: ${memberCount}/50 members`);
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

  // Remove setRecruitment, incrementCurrent, resetCurrent methods
  // We don't need them anymore since we use API data

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

  // Helper to create progress bar for display
  static createProgressBar(percentage: number): string {
    const filled = Math.round(percentage / 10);
    const empty = 10 - filled;
    return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
  }

  // Calculate needed recruits for a clan
  static calculateNeededRecruits(memberCount: number): number {
    return Math.max(0, this.MAX_CLAN_SIZE - memberCount);
  }
}

// Initialize on import
RecruitmentTracker.initialize().catch(console.error);
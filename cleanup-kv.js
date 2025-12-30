// Create a temporary cleanup script (run once)
import { kv } from '@vercel/kv';

async function cleanupRecruitmentData() {
  try {
    // Delete the old structure
    await kv.del('boom_house_recruitment');
    console.log('✅ Old recruitment data cleared');
    
    // Reinitialize with new structure
    const defaultClans = {
      WM: { clan: 'WM', name: 'WAR MASTER', memberCount: 0, lastUpdated: Date.now(), clanTag: 'REDACTED_WM_CLAN_TAG' },
      LE: { clan: 'LE', name: 'LEGENDS', memberCount: 0, lastUpdated: Date.now(), clanTag: 'REDACTED_LE_CLAN_TAG' },
      ZP: { clan: 'ZP', name: 'ZwartePiet', memberCount: 0, lastUpdated: Date.now(), clanTag: 'REDACTED_ZP_CLAN_TAG' },
      CH: { clan: 'CH', name: 'Clash Heros', memberCount: 0, lastUpdated: Date.now(), clanTag: 'REDACTED_CH_CLAN_TAG' },
    };
    
    await kv.hset('boom_house_recruitment', defaultClans);
    console.log('✅ New recruitment structure initialized');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

cleanupRecruitmentData();
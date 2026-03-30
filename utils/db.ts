import { createClient } from '@supabase/supabase-js';
import { configDotenv } from 'dotenv';

configDotenv();

const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'missing-supabase-anon-key';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
	console.warn('SUPABASE_URL/SUPABASE_ANON_KEY missing. Using fallback values; Supabase calls will fail until env vars are set.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
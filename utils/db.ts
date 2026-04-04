import { createClient } from '@supabase/supabase-js';
import { configDotenv } from 'dotenv';

configDotenv();

function requireEnv(name: string): string {
	const value = process.env[name];
	if (!value || !value.trim()) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
}

const supabaseUrl = requireEnv('SUPABASE_URL');
const supabaseKey = requireEnv('SUPABASE_ANON_KEY');

export const supabase = createClient(supabaseUrl, supabaseKey);
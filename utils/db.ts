import { createClient } from '@supabase/supabase-js';
import { configDotenv } from 'dotenv';
import type { Database } from './supabase.types';

configDotenv();

function requireEnv(name: string): string {
	const value = process.env[name];
	if (!value || !value.trim()) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
}

let supabaseClient: ReturnType<typeof createClient<Database>> | null = null;

function getSupabaseClient(): ReturnType<typeof createClient<Database>> {
	if (!supabaseClient) {
		const supabaseUrl = requireEnv('SUPABASE_URL');
		const supabaseKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
		supabaseClient = createClient<Database>(supabaseUrl, supabaseKey);
	}

	return supabaseClient;
}

export const supabase = new Proxy({} as ReturnType<typeof createClient<Database>>, {
	get(_target, property) {
		const client = getSupabaseClient();
		const value = Reflect.get(client, property, client);
		return typeof value === 'function' ? value.bind(client) : value;
	},
}) as ReturnType<typeof createClient<Database>>;
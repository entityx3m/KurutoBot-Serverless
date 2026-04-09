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

let supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient(): ReturnType<typeof createClient> {
	if (!supabaseClient) {
		const supabaseUrl = requireEnv('SUPABASE_URL');
		const supabaseKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
		supabaseClient = createClient(supabaseUrl, supabaseKey);
	}

	return supabaseClient;
}

export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
	get(_target, property) {
		const client = getSupabaseClient();
		const value = Reflect.get(client, property, client);
		return typeof value === 'function' ? value.bind(client) : value;
	},
}) as ReturnType<typeof createClient>;
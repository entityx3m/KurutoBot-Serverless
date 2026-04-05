-- Supabase cutover helpers for my-vercel-bot
-- Run this after creating users/accounts tables.

-- Ensure one main account per Discord user.
-- Create the Users table
CREATE TABLE users (
    discord_id TEXT PRIMARY KEY,
    discord_name TEXT NOT NULL,
    main_account_tag TEXT,
    recruited_at TIMESTAMP WITH TIME ZONE,
    recruited_by TEXT,
    recruiter_name TEXT,
    clan TEXT,
    nickname TEXT,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

  ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create the Accounts table
CREATE TABLE accounts (
    player_tag TEXT PRIMARY KEY,
    discord_id TEXT REFERENCES users(discord_id) ON DELETE CASCADE,
    player_name TEXT NOT NULL,
    town_hall_level INTEGER NOT NULL,
    exp_level INTEGER NOT NULL,
    league_tier JSONB, -- Storing nested CoC API data as JSONB
    clan_info JSONB,   -- Storing nested CoC API data as JSONB
    role TEXT,
    war_preference TEXT,
    is_main BOOLEAN DEFAULT FALSE,
    linked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    linked_by TEXT
);

  ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- Create an index so searching by CoC Name is lightning fast
CREATE INDEX idx_accounts_player_name ON accounts(player_name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_one_main_per_user
ON accounts (discord_id)
WHERE is_main = TRUE;

-- Extra table replacing boom_house_recruitment hash storage.
CREATE TABLE IF NOT EXISTS clan_recruitment (
  clan TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  member_count INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  clan_tag TEXT
);

ALTER TABLE clan_recruitment ENABLE ROW LEVEL SECURITY;

-- Helpful read ordering index for summaries.
CREATE INDEX IF NOT EXISTS idx_clan_recruitment_clan
ON clan_recruitment (clan);

-- Supabase cutover helpers for my-vercel-bot
-- Run this after creating users/accounts tables.

-- Ensure one main account per Discord user.
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

-- Helpful read ordering index for summaries.
CREATE INDEX IF NOT EXISTS idx_clan_recruitment_clan
ON clan_recruitment (clan);

# BOOM House Discord Bot

Production Discord bot for BOOM House (Clash of Clans alliance), built for server operations, recruitment workflow, account verification, and ticket handling.

## Project Status

- Active and maintained
- Production-focused
- Designed for Vercel deployment (serverless)

## What This Bot Does

This bot manages the full BOOM House member lifecycle:

- Clash account linking and identity verification
- Recruitment acceptance flow with role assignment and welcome automation
- Ticket intake and moderation workflows
- Player profile lookups and account management
- Clan recruitment dashboard posting

It is optimized for one Discord community with configurable IDs (guild, roles, channels) through environment variables.

## Tech Stack

- Runtime: Node.js + TypeScript
- Bot framework: Discraft
- Discord APIs: discord-api-types + direct REST calls
- Storage: Supabase (users/accounts)
- Hosting: Vercel
- AI command: Google Generative AI (Gemini)

## Repository Structure

```text
commands/    Slash commands and component handlers
utils/       Shared helpers (config, db, discord API wrappers, type utilities)
scripts/     Command registration and migration scripts
api/         Vercel endpoint entry
public/      Static assets
```

## Main Commands

- /add: accept a member into a BOOM clan (roles, nickname, welcome flow)
- /link: link a Clash of Clans account to a Discord member
- /unlink: unlink one of a member's Clash accounts
- /player: inspect linked accounts or lookup any player by tag
- /postticket: post ticket entry panel
- /closeticket: close active ticket channels with confirmation
- /include: add additional users to active ticket channels
- /postrecruit: post/update recruitment summary embed
- /postlink: post account-linking panel
- /chat: AI assistant persona command

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create environment file

```bash
copy .env.example .env
```

Fill in all required variables (see Environment Variables section below).

### 3. Register slash commands

```bash
npm run register
```

### 4. Build for Vercel

```bash
npm run build
```

### 5. Deploy

```bash
npm run deploy
```

## Environment Variables

The application now uses fail-fast config for critical values. Missing required values will cause startup/runtime errors instead of silent fallbacks.

### Required

| Variable | Purpose |
| --- | --- |
| DISCORD_PUBLIC_KEY | Verifies Discord interaction signatures |
| DISCORD_APP_ID | Discord application ID |
| DISCORD_TOKEN | Bot token for Discord REST operations |
| GUILD_ID | Main BOOM House guild ID |
| BOT_OWNER_ID | Discord user ID allowed to run owner-only commands |
| COC_API_KEY | Clash of Clans API token |
| GOOGLE_AI_API_KEY | Gemini API key for /chat |
| TICKET_CREATION_URL | Full URL used in verification quick-navigation embeds |
| SUPABASE_URL | Supabase project URL |
| SUPABASE_ANON_KEY | Supabase key used by app reads/writes |
| CLAN_TAG_WM | Clan tag for War Master |
| CLAN_TAG_LE | Clan tag for LEGENDS |
| CLAN_TAG_ZP | Clan tag for ZwartePiet |
| CLAN_TAG_CH | Clan tag for Clash Heros |
| CLAN_TAG_SP | Clan tag for SP.OPS.DIVISION |
| CLAN_TAG_WA | Clan tag for War Addiction |
| ROLE_BOOM_MEMBER_ID | BOOM member role ID |
| ROLE_WM_ID | War Master role ID |
| ROLE_LE_ID | Legends role ID |
| ROLE_ZP_ID | ZwartePiet role ID |
| ROLE_CH_ID | Clash Heros role ID |
| ROLE_SP_ID | SP.OPS.DIVISION role ID |
| ROLE_WA_ID | War Addiction role ID |
| ROLE_TICKET_JOIN_LEADERSHIP_ID | Staff role for join-clan ticket actions |
| ROLE_TICKET_STAFF_LEADERSHIP_ID | Staff role for staff/chat ticket actions |
| ROLE_VISITOR_ID | Visitor role ID |
| ROLE_VERIFIED_ID | Verified role ID |
| CHANNEL_WM_ID | WM channel ID |
| CHANNEL_LE_ID | LE channel ID |
| CHANNEL_ZP_ID | ZP channel ID |
| CHANNEL_CH_ID | CH channel ID |
| CHANNEL_SP_ID | SP channel ID |
| CHANNEL_WA_ID | WA channel ID |
| CHANNEL_CLANS_LIST_ID | Clan list channel ID |
| CHANNEL_ATTACK_PLANNING_ID | Attack planning channel ID |
| CHANNEL_FUN_CATEGORY_ID | Fun category/channel ID |
| CHANNEL_CWL_SIGNUPS_ID | CWL signups channel ID |
| CHANNEL_TICKET_CATEGORY_ID | Ticket category ID |
| CHANNEL_BASE_VAULT_ID | Base vault channel ID |
| CHANNEL_SHOWCASE_BASE_ID | Showcase base channel ID |
| CHANNEL_VERIFICATION_ID | Verification channel ID |

### Optional

| Variable | Purpose |
| --- | --- |
| FLASK_API_URL | Optional endpoint used by /ping |
| SUPABASE_SERVICE_ROLE_KEY | Needed for migration/admin scripts |
| MIGRATION_KV_PREFIX | Optional key prefix override for KV migration |

## Data Model (High Level)

- users table: Discord-centric profile metadata
- accounts table: linked Clash accounts keyed by player tag
- one main account per Discord user

Migration helper:

```bash
npm run migrate:kv-to-supabase
npm run migrate:kv-to-supabase:apply
```

## Security Notes

- Never commit .env
- Rotate credentials immediately if exposed
- Use Vercel project environment variables for production
- Keep bot token, CoC API key, and Supabase service key private

## Scripts

```bash
npm run build
npm run register
npm run deploy
npm run migrate:kv-to-supabase
npm run migrate:kv-to-supabase:apply
```

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for the full text.

# AI Coding Agent Instructions

## Project Overview
Serverless Discord bot for BOOM House Clash of Clans alliance, deployed to Vercel using Discraft framework with TypeScript. Integrates Clash of Clans API, Vercel KV storage, and Google Generative AI.

## Architecture

### Three-Tier Structure
1. **[index.ts](../index.ts)** - Main Vercel API handler, processes all Discord interactions (commands, buttons, modals)
2. **[commands/](../commands/)** - Individual command modules (add.ts, chat.ts, link.ts, player.ts, etc.)
3. **[utils/](../utils/)** - Shared utilities: types.ts, kvHelper.ts (Vercel KV wrapper), recruitment.ts (clan data)

### Command Execution Flow
- Discord POST → index.ts validates signature with `verifyKey()`
- Interaction type determines routing: slash command → loads from [`.discraft/commands`]() (auto-built), button/modal → matched in index.ts handlers
- All async, returns Discord API response via axios POST

### Data Layer
- **Vercel KV**: Only persistence layer, prefixed by `GUILD_ID` (e.g., `BOOM_HOUSE:user:{userId}`)
- Key patterns: `user:{discordId}`, `tag:{playerTag}`, `{clanAbbr}:members`
- Clash of Clans API: `https://cocproxy.royaleapi.dev/v1/clans/{tag}` (bearer token required)

## Developer Workflows

### Build & Deploy
```bash
npm run build          # Runs `discraft vercel build`, generates .discraft/ routes & commands
npm run deploy         # `vercel --prod` deploys to Vercel
npm run register       # `tsx scripts/register.ts`, registers commands to Discord bot
npm run register-guild # `tsx scripts/register-guild.ts`, guild-specific registration
```

### Environment Setup
Required in `.env` and Vercel project settings:
- `DISCORD_PUBLIC_KEY`, `DISCORD_APP_ID`, `DISCORD_TOKEN`
- `GOOGLE_AI_API_KEY`, `GOOGLE_AI_MODEL` (e.g., `gemini-2.0-flash-exp`)
- `GUILD_ID` (optional, defaults to `'BOOM_HOUSE'`)
- `COC_API_KEY` (Clash of Clans API bearer token)

## Key Patterns & Conventions

### Command Structure
Commands export object with `data` (Discord CommandData) and `async execute()` returning [CommandExecuteResult](../utils/types.ts#L92):
```typescript
export default {
  data: { name: "ping", description: "Check if bot is online" },
  async execute({ interaction }: { interaction: SimplifiedInteraction }) {
    return { content: "Pong!" };
  }
};
```

### Interaction Handlers in index.ts
Modal/button submissions matched by `custom_id`, call handler functions returning axios response format:
```typescript
async function handleCocLinkModal(message: SimplifiedInteraction, res: VercelResponse) {
  const userId = message.member?.user?.id;
  await axios.post(`/interactions/${id}/${token}/callback`, {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: { content: "...", flags: MessageFlags.Ephemeral }
  });
}
```

### KV Usage Pattern
Helper functions in [kvHelper.ts](../utils/kvHelper.ts) wrap `@vercel/kv` with error handling:
```typescript
await setUserData(userId, { discordId, accounts: [...], lastUpdated: new Date().toISOString() });
const data = await getUserData(userId);  // Returns UserData | null
```

### Constants & Configuration
- **Clan mappings**: [CLAN_MAP](../commands/add.ts#L45) in add.ts (WM, LE, ZP, CH) with role/channel IDs
- **Recruitment**: [RecruitmentTracker](../utils/recruitment.ts#L14) syncs live clan member counts from CoC API
- **Type system**: [types.ts](../utils/types.ts) defines SimplifiedInteraction, PlayerAccount, UserData

## Critical Implementation Details

### Discraft Framework
- Builds commands into `.discraft/commands/index.ts` automatically from `commands/` folder
- Commands registered via Discord API in scripts/register.ts
- `index.ts` is the single handler for all interactions (not individual API routes)

### Discord Interaction Types
1. Slash commands → [index.ts](../index.ts#L180) routes to command from `.discraft/commands`
2. Button clicks → matched by `custom_id` in interaction.data
3. Modal submissions → matched by `custom_id`, extract form values from `components`

### Ephemeral Messages
Use `flags: MessageFlags.Ephemeral` for private responses visible only to user who triggered interaction.

### API Rate Limiting
Chat command implements client-side rate limit per user (3 requests/min), stored in memory Map.

## File Locations Reference
- Commands: [commands/](../commands/) (each exported default command object)
- Builders/embeds: Inline in [index.ts](../index.ts) (e.g., `createRecruitmentEmbed()`)
- Environment variables: [.env example](../.env.example) (not in repo)
- API proxy: [api/index.js](../api/index.js) (compiled output, don't edit)

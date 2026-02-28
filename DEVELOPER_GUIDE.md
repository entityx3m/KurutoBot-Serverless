# Developer Quick Reference - Refactored Codebase

## 🎯 Where to Find Things Now

### Configuration & Constants
```
utils/config.ts
├── API_URLS - API endpoints
├── ROLE_IDS - All Discord role IDs
├── CHANNEL_IDS - All Discord channel IDs
├── CLANS - Clan definitions (WM, LE, ZP, CH, SP)
├── VALIDATION - Player tag validation
└── GUILD_ID / MAIN_SERVER_ID - Global constants
```

### API Handlers
```
utils/cocApi.ts         → All Clash of Clans API calls
utils/discordApi.ts     → All Discord API operations
utils/linkHelper.ts     → Account linking logic
utils/recruitment.ts    → Clan recruitment tracking
```

### Utilities
```
utils/kvHelper.ts       → Vercel KV storage helpers
utils/addHelper.ts      → Add member helpers
utils/logger.ts         → Logging
utils/types.ts          → TypeScript interfaces
```

---

## 📚 Common Tasks

### ✅ Validate a Player Tag
```typescript
import { VALIDATION } from "./utils/config";

const validation = VALIDATION.cleanPlayerTag(userInput);
if (!VALIDATION.isValidPlayerTag(validation)) {
  return "Invalid tag format";
}
const cleanTag = validation; // Use this
```

### ✅ Fetch Player Data from CoC API
```typescript
import { cocApi } from "./utils/cocApi";

const result = await cocApi.getPlayer(playerTag);
if (result.success) {
  const player = result.data;
  console.log(player.name, player.townHallLevel);
} else {
  console.error(result.message); // Already formatted error
}
```

### ✅ Fetch Clan Data from CoC API
```typescript
import { cocApi } from "./utils/cocApi";

const result = await cocApi.getClan(clanTag);
if (result.success) {
  console.log(`${result.data.name}: ${result.data.members}/50`);
}
```

### ✅ Send Ephemeral Message
```typescript
import { sendEphemeralReply } from "./utils/discordApi";

await sendEphemeralReply(
  interactionId,
  token,
  "Only you can see this message"
);
```

### ✅ Send Embed (Ephemeral)
```typescript
import { sendEphemeralEmbed } from "./utils/discordApi";

await sendEphemeralEmbed(interactionId, token, [
  {
    title: "Player Stats",
    description: "...",
    color: 5793266
  }
]);
```

### ✅ Assign a Role
```typescript
import { addMemberRole } from "./utils/discordApi";
import { ROLE_IDS } from "./utils/config";

const result = await addMemberRole(
  guildId,
  memberId,
  ROLE_IDS.BOOM_MEMBER,
  "Accepted into clan"
);

if (!result.success) {
  console.error(result.error);
}
```

### ✅ Update Member Nickname
```typescript
import { setMemberNickname } from "./utils/discordApi";

await setMemberNickname(
  guildId,
  memberId,
  "PlayerName | TH12",
  "Updated from CoC account"
);
```

### ✅ Access Clan Information
```typescript
import { CLANS, ROLE_IDS, CHANNEL_IDS } from "./utils/config";

const wmClan = CLANS.WM;
console.log(wmClan.name);       // "WAR MASTER"
console.log(wmClan.roleId);     // Role ID for WM
console.log(wmClan.channelId);  // Channel ID for WM
console.log(wmClan.tag);        // "REDACTED_WM_CLAN_TAG"
```

### ✅ Link CoC Account to User
```typescript
import { linkPlayerAccount } from "./utils/linkHelper";

const result = await linkPlayerAccount(
  playerTag,
  userId,
  discordUsername,
  executorId,    // optional: staff member linking them
  guildId,       // optional: for role/nick updates
  true,          // assign verified role
  true           // set nickname
);

if (result.success) {
  console.log(`✅ ${result.userData.discordName} linked!`);
} else {
  console.error(result.message);
}
```

### ✅ Update Recruitment Data
```typescript
import { RecruitmentTracker } from "./utils/recruitment";

// Fetch latest from CoC API
await RecruitmentTracker.updateFromAPI();

// Get summary
const summary = await RecruitmentTracker.getSummary();
console.log(`${summary.totalMembers}/${summary.totalCapacity} members`);

// Get specific clan
const clan = await RecruitmentTracker.getClan("WM");
console.log(`${clan.name}: ${clan.memberCount}/50`);
```

---

## 🔄 Migration Path for Existing Commands

If updating existing commands, follow this order:

1. **Import new helpers** - Add imports at top
2. **Replace validation** - Use `VALIDATION` instead of regex
3. **Replace API calls** - Use `cocApi` instead of fetch
4. **Replace Discord ops** - Use `discordApi` helpers
5. **Replace IDs** - Use `ROLE_IDS`, `CHANNEL_IDS`, `CLANS`
6. **Test thoroughly** - Ensure all flows work

**Example Migration**:
```typescript
// BEFORE
const cleanTag = tag.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
if (!/^[A-Z0-9]{3,15}$/.test(cleanTag)) { /* error */ }
const response = await fetch(`https://cocproxy.royaleapi.dev/v1/players/%23${cleanTag}`, { ... })
const roleId = "REDACTED_VERIFIED_ID";
await axios.post(`https://discord.com/api/v10/interactions/...`, { ... })

// AFTER
import { VALIDATION, ROLE_IDS } from "./utils/config";
import { cocApi } from "./utils/cocApi";
import { sendEphemeralReply } from "./utils/discordApi";

const cleanTag = VALIDATION.cleanPlayerTag(tag);
if (!VALIDATION.isValidPlayerTag(cleanTag)) { /* error */ }
const result = await cocApi.getPlayer(cleanTag);
if (!result.success) { /* error: result.message */ }
const roleId = ROLE_IDS.VERIFIED;
await sendEphemeralReply(interactionId, token, message);
```

---

## 🛠️ Adding a New Clan

If new clans are added to the alliance:

1. **Update `config.ts`** - Add to `CLANS` object with full info
2. **Update recruitment.ts** - Automatically picks up new clan
3. **Commands update** - All commands use config, no changes needed
4. **Deploy** - Single source of truth updated!

Example:
```typescript
// In config.ts - CLANS object
NEW: {
  abbr: "NEW",
  name: "New Clan Name",
  roleId: "role-id-from-discord",
  channelId: "channel-id-from-discord",
  tag: "#CLANTAGHERE"
}
```

---

## 📋 Error Handling Pattern

All API helpers return consistent response format:

```typescript
interface Response {
  success: boolean;
  data?: T;           // Only if success
  error?: string;     // Only if failed
  message?: string;   // For user-facing errors (CoC API)
  statusCode?: number;
}

// Usage
if (result.success) {
  // Handle result.data
} else {
  // Handle result.error or result.message
}
```

---

## 🔗 Related Files

- **Commands**: `commands/add.ts`, `commands/link.ts`, `commands/player.ts`
- **Index handler**: `index.ts` - Routes interactions
- **Build output**: `api/index.js` - Compiled version (don't edit)
- **Environment**: `.env.example` - Shows required vars
- **Types**: `utils/types.ts` - TypeScript interfaces

---

## ⚡ Performance Notes

- **Config imports are static** - No runtime cost
- **API calls are cached** - Recruitment data cached in KV
- **Validation is synchronous** - Cheap regex operation
- **Discord helpers use same axios instance** - Connection reuse

---

## 📞 Support

For questions about the refactoring:
- See `REFACTORING_SUMMARY.md` for detailed before/after
- Check this file for common patterns
- Review individual helper files for docstrings
- Look at existing command implementations for examples

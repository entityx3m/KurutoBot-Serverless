import { config } from 'dotenv';
config();

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_APP_ID;
const GUILD_ID = process.env.GUILD_ID; // This might be missing

if (!TOKEN || !CLIENT_ID) {
  console.error('Missing required environment variables');
  console.error('DISCORD_TOKEN:', TOKEN ? '***' : 'MISSING');
  console.error('DISCORD_APP_ID:', CLIENT_ID || 'MISSING');
  process.exit(1);
}

console.log('DISCORD_APP_ID:', CLIENT_ID);
console.log('GUILD_ID:', GUILD_ID || 'NOT SET - will only clean global commands');

async function cleanupAllCommands() {
  try {
    console.log('Starting comprehensive command cleanup...');
    
    // Clean global commands (always do this)
    console.log('\n🗑️  Cleaning GLOBAL commands...');
    await cleanupCommandScope(`https://discord.com/api/v10/applications/${CLIENT_ID}/commands`);
    
    // Clean guild commands (only if GUILD_ID is available)
    if (GUILD_ID) {
      console.log('\n🗑️  Cleaning GUILD commands...');
      await cleanupCommandScope(`https://discord.com/api/v10/applications/${CLIENT_ID}/guilds/${GUILD_ID}/commands`);
    } else {
      console.log('\n⚠️  GUILD_ID not set - skipping guild command cleanup');
      console.log('💡 If duplicates persist, set GUILD_ID in your .env file');
    }
    
    console.log('\n🎉 Cleanup complete!');
    console.log('🚀 Now run: npm run build');
    
  } catch (error) {
    console.error('Error during cleanup:', error.message);
  }
}

async function cleanupCommandScope(url) {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bot ${TOKEN}`,
      },
    });

    if (!response.ok) {
      console.log(`❌ No commands found or access denied at: ${url}`);
      return;
    }

    const commands = await response.json();
    console.log(`Found ${commands.length} commands to delete...`);

    for (const command of commands) {
      const deleteUrl = `${url}/${command.id}`;
      const deleteResponse = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bot ${TOKEN}`,
        },
      });

      if (deleteResponse.ok) {
        console.log(`✅ Deleted: ${command.name} (${command.id})`);
      } else {
        console.log(`❌ Failed to delete: ${command.name}`);
      }
    }
  } catch (error) {
    console.error(`Error cleaning scope ${url}:`, error.message);
  }
}

cleanupAllCommands();
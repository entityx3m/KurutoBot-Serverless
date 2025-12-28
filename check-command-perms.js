// check-command-perms.js
import { config } from 'dotenv';
config();

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_APP_ID;

async function checkCommandPermissions() {
  console.log('Checking command permissions...\n');
  
  const res = await fetch(`https://discord.com/api/v10/applications/${CLIENT_ID}/commands`, {
    headers: { 'Authorization': `Bot ${TOKEN}` }
  });
  
  const commands = await res.json();
  
  commands.forEach(cmd => {
    console.log(`📝 ${cmd.name}:`);
    console.log(`   Description: ${cmd.description}`);
    console.log(`   Default Permissions: ${cmd.default_member_permissions || 'None'}`);
    console.log(`   DM Permission: ${cmd.dm_permission || 'Not set'}`);
    console.log(`   Type: ${cmd.type || 'CHAT_INPUT'}`);
    console.log('---');
  });
}

checkCommandPermissions();
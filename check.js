// check.js
import { config } from 'dotenv';
config();

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_APP_ID;

async function checkCommands() {
  console.log('Checking registered commands...');
  
  const response = await fetch(`https://discord.com/api/v10/applications/${CLIENT_ID}/commands`, {
    headers: { 'Authorization': `Bot ${TOKEN}` }
  });
  
  if (!response.ok) {
    console.log(`Failed: ${response.status}`);
    return;
  }
  
  const commands = await response.json();
  console.log(`Found ${commands.length} commands:`);
  commands.forEach(cmd => {
    console.log(`- ${cmd.name}: ${cmd.description} (ID: ${cmd.id})`);
  });
}

checkCommands();
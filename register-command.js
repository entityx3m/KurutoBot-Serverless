import { REST, Routes } from 'discord.js';
import 'dotenv/config';

const commands = [
  {
    name: 'add',
    description: 'Accept a member into a clan and assign roles',
    options: [
      {
        type: 6, // USER
        name: 'member',
        description: 'Member to accept',
        required: true
      },
      {
        type: 3, // STRING
        name: 'clan',
        description: 'Clan abbreviation',
        required: true,
        choices: [
          { name: 'WM (War Master)', value: 'WM' },
          { name: 'LE (LEGENDS)', value: 'LE' },
          { name: 'ZP (ZwartePiet)', value: 'ZP' },
          { name: 'WT (Winter)', value: 'WT' }
        ]
      },
      {
        type: 5, // BOOLEAN
        name: 'pingclan',
        description: 'Ping the clan role in their general channel?',
        required: false
      }
    ],
    default_member_permissions: '0x0000000000000008' // Manage Roles
  }
];

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

async function register() {
  try {
    console.log('Registering slash command...');
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log('Command registered successfully!');
  } catch (error) {
    console.error('Error registering command:', error);
  }
}

register();

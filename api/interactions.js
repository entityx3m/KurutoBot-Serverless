// Boom House - Clan Acceptance Bot (Discord.js v14) - Vercel Compatible
import { Client, GatewayIntentBits, Partials, REST, Routes, SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';

const TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

// Role & Channel IDs
const IDS = {
  ROLES: {
    BOOM_MEMBER: 'REDACTED_BOOM_MEMBER_ID',
    WM: 'REDACTED_WM_ID',
    LE: 'REDACTED_LE_ID',
    ZP: 'REDACTED_ZP_ID',
    WT: '1415150317368119356'
  },
  CHANNELS: {
    WM: 'REDACTED_CHANNEL_WM_ID',
    LE: 'REDACTED_CHANNEL_LE_ID',
    ZP: 'REDACTED_CHANNEL_ZP_ID',
    WT: '1415151282544443643',
    CLANS_LIST: 'REDACTED_CHANNEL_CLANS_LIST_ID',
    ATTACK_PLANNING: 'REDACTED_CHANNEL_ATTACK_PLANNING_ID',
    FUN_CATEGORY: 'REDACTED_CHANNEL_FUN_CATEGORY_ID',
    CWL_SIGNUPS: 'REDACTED_CHANNEL_CWL_SIGNUPS_ID',
    BASE_VAULT: 'REDACTED_CHANNEL_BASE_VAULT_ID',
    SHOWCASE_BASE: 'REDACTED_CHANNEL_SHOWCASE_BASE_ID'
  }
};

const CLAN_MAP = {
  WM: { role: IDS.ROLES.WM, channel: IDS.CHANNELS.WM, name: 'WAR MASTER' },
  LE: { role: IDS.ROLES.LE, channel: IDS.CHANNELS.LE, name: 'LEGENDS' },
  ZP: { role: IDS.ROLES.ZP, channel: IDS.CHANNELS.ZP, name: 'ZwartePiet' },
  WT: { role: IDS.ROLES.WT, channel: IDS.CHANNELS.WT, name: 'Winter' }
};

// Initialize bot only if token exists
let client = null;
let isBotReady = false;

function initializeBot() {
  if (!TOKEN) {
    console.error('BOT_TOKEN not found in environment variables');
    return null;
  }

  client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.DirectMessages],
    partials: [Partials.Channel]
  });

  client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);
    isBotReady = true;
    await registerCommands();
  });

  client.on('interactionCreate', handleInteraction);
  client.on('guildMemberAdd', handleNewMember);

  client.login(TOKEN).catch(console.error);
  return client;
}

// Register slash command to guild on startup
async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName('add')
      .setDescription('Accept a member into a clan and assign roles')
      .addUserOption(opt => opt.setName('member').setDescription('Member to accept').setRequired(true))
      .addStringOption(opt => opt.setName('clan').setDescription('Clan abbreviation').setRequired(true)
        .addChoices(
          { name: 'WM (War Master)', value: 'WM' },
          { name: 'LE (LEGENDS)', value: 'LE' },
          { name: 'ZP (ZwartePiet)', value: 'ZP' },
          { name: 'WT (Winter)', value: 'WT' }
        ))
      .addBooleanOption(opt =>
        opt.setName('pingclan')
          .setDescription('Ping the clan role in their general channel?')
          .setRequired(false)
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
      .toJSON()
  ];

  const rest = new REST({ version: '10' }).setToken(TOKEN);
  try {
    console.log('Registering guild commands...');
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
    console.log('Slash command registered.');
  } catch (err) {
    console.error('Failed to register commands:', err);
  }
}

async function handleInteraction(interaction) {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'add') return;

  // Permission check
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageRoles)) {
    return interaction.reply({ content: 'You do not have permission to use this command (Manage Roles required).', ephemeral: true });
  }

  // Defer reply so we have time for async tasks
  await interaction.deferReply({ ephemeral: false });

  const user = interaction.options.getUser('member', true);
  const clan = interaction.options.getString('clan', true);
  const pingClan = interaction.options.getBoolean('pingclan');

  // Correct handling of default pingclan value
  const shouldPingClan = (typeof pingClan === 'boolean') ? pingClan : true;

  const guild = interaction.guild;
  if (!guild) return interaction.editReply({ content: 'This command must be used in the server.' });

  // Fetch guild member
  let member;
  try {
    member = await guild.members.fetch(user.id);
  } catch {
    return interaction.editReply({ content: `Could not find that member in this server.` });
  }

  const clanInfo = CLAN_MAP[clan];
  if (!clanInfo) return interaction.editReply({ content: 'Invalid clan provided.' });

  // Assign roles
  try {
    await member.roles.add([IDS.ROLES.BOOM_MEMBER, clanInfo.role], `Accepted into clan by ${interaction.user.tag}`);
  } catch (err) {
    console.error('Role assignment failed:', err);
    return interaction.editReply({ content: `Failed to assign roles. Make sure the bot's role is above the roles to assign and it has Manage Roles permission.` });
  }

  // Send DM (non-blocking)
  const dmEmbed = new EmbedBuilder()
    .setTitle(`<a:pepopalmas:1409737253130993704> Congratulations! You are now a ${clanInfo.name} Member!`)
    .setThumbnail('https://media.discordapp.net/attachments/1388018619673477180/1416871446625386597/Bommhouse.png')
    .setDescription(`Glad to have you in the BOOM House alliance! Here's a quick server tour to get you started.`)
    .addFields(
      { name: '📜 All Clans', value: `You can view all our clans in <#${IDS.CHANNELS.CLANS_LIST}>.`, inline: false },
      { name: '⚔️ Attack Planning', value: `<#${IDS.CHANNELS.ATTACK_PLANNING}> — where attack planners help with strategies and attacks.`, inline: false },
      { name: '😀 Clan Fun Stuff', value: `<#${IDS.CHANNELS.FUN_CATEGORY}> — memes, games, and community activities.`, inline: false },
      { name: '🏆 CWL Sign-ups', value: `<#${IDS.CHANNELS.CWL_SIGNUPS}> — sign up your account for CWL. Important for securing a spot.`, inline: false },
      { name: '📋 BOOM House Base Vault', value: `<#${IDS.CHANNELS.BASE_VAULT}> — Access exclusive base layouts including Legend League Bases, Clan War Bases and FindThisBase Bot.`, inline: false },
      { name: '🧱 Showcase Base', value: `<#${IDS.CHANNELS.SHOWCASE_BASE}> — get a **FREE** name-base art as a BOOM member. No need to Pay $1`, inline: false }
    )
    .setFooter({ text: 'If you have questions, ask any Staff or visit the General channel.' });

  try {
    await user.send({ embeds: [dmEmbed] });
  } catch {
    console.warn(`Could not DM user ${user.tag}, they may have DMs disabled.`);
  }

  // Announce in clan channel
  try {
    const clanChannel = await client.channels.fetch(clanInfo.channel);
    if (clanChannel?.isTextBased()) {
      const content = shouldPingClan
        ? `<@&${clanInfo.role}> Plz welcome our newest clan member <@${user.id}>! <a:heya:1427561870797180928> — glad to have you on board! <a:KnightCheergif:1427561243811647548>`
        : `Welcome <@${user.id}> to your clan's general chat! <a:heya:1427561870797180928> — feel free to look around! <a:KnightCheergif:1427561243811647548>`;
      await clanChannel.send({ content });
    }
  } catch (err) {
    console.error('Failed to send clan channel welcome:', err);
  }

  // Public confirmation
  await interaction.editReply({
    content: `<a:AnimatedCheck:1427570005750448169> **${user.tag}** has been accepted into **${clanInfo.name}** by <@${interaction.user.id}>.\n` +
             `<a:AnimatedCheck:1427570005750448169> Assigned **BOOM Member** and **${clanInfo.name} Member** Roles.\n` +
             `<a:AnimatedCheck:1427570005750448169> A welcome DM has been sent. 📩\n` +
             (shouldPingClan
               ? `<a:AnimatedCheck:1427570005750448169> Introduced them in <#${clanInfo.channel}> and pinged their clan members.`
               : `<a:AnimatedCheck:1427570005750448169> Introduced them in <#${clanInfo.channel}> without pinging the clan members.`)
  });
}

async function handleNewMember(member) {
  const generalChannelId = '1385265097026310229';
  const ticketChannelId = 'REDACTED_CHANNEL_VERIFICATION_ID';

  try {
    const channel = await member.guild.channels.fetch(generalChannelId);
    if (!channel || !channel.isTextBased()) return;

    await channel.send({
      content: `<a:CatHello:1427555460214689792> Welcome to **BOOM House**, <@${member.id}>!\n\nPlease head over to <#${ticketChannelId}> and create a ticket to get started. <a:boom3:1409890200364126218>`
    });

    console.log(`Welcomed new member: ${member.user.tag}`);
  } catch (err) {
    console.error('Failed to send welcome message:', err);
  }
}

// Initialize bot
initializeBot();

// Vercel serverless function handler
export default async function handler(req, res) {
  // Health check endpoint
  if (req.method === 'GET') {
    res.status(200).json({ 
      status: 'Bot is running', 
      ready: isBotReady,
      user: client?.user?.tag || 'Not logged in',
      timestamp: new Date().toISOString()
    });
    return;
  }
  
  res.status(404).json({ error: 'Not found' });
}

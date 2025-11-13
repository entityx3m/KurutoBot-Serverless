import { EmbedBuilder } from 'discord.js';

// Your existing IDs
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

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  
  const interaction = req.body;

  // Handle PING from Discord
  if (interaction.type === 1) {
    return res.json({ type: 1 });
  }

  // Handle slash command
  if (interaction.type === 2 && interaction.data.name === 'add') {
    return await handleAddCommand(interaction, res);
  }

  res.status(400).json({ error: 'Unknown interaction type' });
}

async function handleAddCommand(interaction, res) {
  // Defer the response immediately
  res.json({ type: 5 }); // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
  
  try {
    const options = interaction.data.options || [];
    const memberOption = options.find(opt => opt.name === 'member');
    const clanOption = options.find(opt => opt.name === 'clan');
    const pingOption = options.find(opt => opt.name === 'pingclan');

    if (!memberOption || !clanOption) {
      return await editOriginalResponse(interaction, 'Missing required options.');
    }

    const userId = memberOption.value;
    const clan = clanOption.value;
    const shouldPingClan = pingOption ? pingOption.value : true;

    const clanInfo = CLAN_MAP[clan];
    if (!clanInfo) {
      return await editOriginalResponse(interaction, 'Invalid clan provided.');
    }

    // Add roles using Discord API
    await addRoles(userId, clanInfo.role);
    
    // Send DM
    await sendWelcomeDM(userId, clanInfo.name);
    
    // Announce in clan channel
    await sendClanWelcome(userId, clanInfo, shouldPingClan);

    // Success response
    await editOriginalResponse(interaction, 
      `<a:AnimatedCheck:1427570005750448169> **<@${userId}>** has been accepted into **${clanInfo.name}** by <@${interaction.member.user.id}>.\n` +
      `<a:AnimatedCheck:1427570005750448169> Assigned **BOOM Member** and **${clanInfo.name} Member** Roles.\n` +
      `<a:AnimatedCheck:1427570005750448169> A welcome DM has been sent. 📩\n` +
      (shouldPingClan
        ? `<a:AnimatedCheck:1427570005750448169> Introduced them in <#${clanInfo.channel}> and pinged their clan members.`
        : `<a:AnimatedCheck:1427570005750448169> Introduced them in <#${clanInfo.channel}> without pinging the clan members.`)
    );

  } catch (error) {
    console.error('Error handling command:', error);
    await editOriginalResponse(interaction, 'An error occurred while processing the command: ' + error.message);
  }
}

async function addRoles(userId, clanRoleId) {
  const guildId = process.env.GUILD_ID;
  
  // Add BOOM Member role
  await discordApi(`guilds/${guildId}/members/${userId}/roles/${IDS.ROLES.BOOM_MEMBER}`, 'PUT');
  
  // Add clan role
  await discordApi(`guilds/${guildId}/members/${userId}/roles/${clanRoleId}`, 'PUT');
}

async function sendWelcomeDM(userId, clanName) {
  const dmChannel = await discordApi('users/@me/channels', 'POST', {
    recipient_id: userId
  });

  const dmEmbed = {
    title: `<a:pepopalmas:1409737253130993704> Congratulations! You are now a ${clanName} Member!`,
    thumbnail: { url: 'https://media.discordapp.net/attachments/1388018619673477180/1416871446625386597/Bommhouse.png' },
    description: `Glad to have you in the BOOM House alliance! Here's a quick server tour to get you started.`,
    fields: [
      { name: '📜 All Clans', value: `You can view all our clans in <#${IDS.CHANNELS.CLANS_LIST}>.`, inline: false },
      { name: '⚔️ Attack Planning', value: `<#${IDS.CHANNELS.ATTACK_PLANNING}> — where attack planners help with strategies and attacks.`, inline: false },
      { name: '😀 Clan Fun Stuff', value: `<#${IDS.CHANNELS.FUN_CATEGORY}> — memes, games, and community activities.`, inline: false },
      { name: '🏆 CWL Sign-ups', value: `<#${IDS.CHANNELS.CWL_SIGNUPS}> — sign up your account for CWL. Important for securing a spot.`, inline: false },
      { name: '📋 BOOM House Base Vault', value: `<#${IDS.CHANNELS.BASE_VAULT}> — Access exclusive base layouts including Legend League Bases, Clan War Bases and FindThisBase Bot.`, inline: false },
      { name: '🧱 Showcase Base', value: `<#${IDS.CHANNELS.SHOWCASE_BASE}> — get a **FREE** name-base art as a BOOM member. No need to Pay $1`, inline: false }
    ],
    footer: { text: 'If you have questions, ask any Staff or visit the General channel.' }
  };

  await discordApi(`channels/${dmChannel.id}/messages`, 'POST', {
    embeds: [dmEmbed]
  });
}

async function sendClanWelcome(userId, clanInfo, shouldPingClan) {
  const content = shouldPingClan
    ? `<@&${clanInfo.role}> Plz welcome our newest clan member <@${userId}>! <a:heya:1427561870797180928> — glad to have you on board! <a:KnightCheergif:1427561243811647548>`
    : `Welcome <@${userId}> to your clan's general chat! <a:heya:1427561870797180928> — feel free to look around! <a:KnightCheergif:1427561243811647548>`;

  await discordApi(`channels/${clanInfo.channel}/messages`, 'POST', {
    content
  });
}

// Helper function for Discord API calls
async function discordApi(endpoint, method = 'GET', body = null) {
  const response = await fetch(`https://discord.com/api/v10/${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bot ${process.env.BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : null,
  });

  if (!response.ok) {
    throw new Error(`Discord API error: ${response.status}`);
  }

  return response.json();
}

// Helper to edit the original interaction response
async function editOriginalResponse(interaction, content) {
  await discordApi(`webhooks/${process.env.CLIENT_ID}/${interaction.token}/messages/@original`, 'PATCH', {
    content
  });
}

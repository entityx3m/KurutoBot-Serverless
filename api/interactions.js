import crypto from 'crypto';

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

// SIMPLIFIED - No bodyParser config, let Vercel handle it
export default async function handler(req, res) {
  console.log('=== SIMPLIFIED VERSION ===');
  console.log('Method:', req.method);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const signature = req.headers['x-signature-ed25519'];
    const timestamp = req.headers['x-signature-timestamp'];
    const publicKey = process.env.DISCORD_PUBLIC_KEY;

    console.log('Signature headers present:', !!signature, !!timestamp);
    console.log('Public key present:', !!publicKey);

    // If no signature headers, this might be a test request
    if (!signature || !timestamp) {
      console.log('No signature headers - might be test request');
      // Check if it's a PING anyway
      if (req.body && req.body.type === 1) {
        console.log('PING without signature - returning PONG');
        return res.json({ type: 1 });
      }
      return res.status(401).json({ error: 'Missing signature' });
    }

    // Verify signature using Vercel-parsed body
    const rawBody = JSON.stringify(req.body);
    const message = timestamp + rawBody;
    
    const isVerified = crypto.verify(
      null,
      Buffer.from(message, 'utf8'),
      Buffer.from(publicKey, 'hex'),
      Buffer.from(signature, 'hex')
    );

    console.log('Signature verification:', isVerified);

    if (!isVerified) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Handle the interaction
    const interaction = req.body;
    console.log('Interaction type:', interaction.type);

    // PING (Discord verification)
    if (interaction.type === 1) {
      console.log('✅ Verified PING - returning PONG');
      return res.json({ type: 1 });
    }

    // Slash command
    if (interaction.type === 2 && interaction.data.name === 'add') {
      console.log('Handling add command');
      return await handleAddCommand(interaction, res);
    }

    res.status(400).json({ error: 'Unknown interaction type' });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// REST OF YOUR CODE (handleAddCommand, addRoles, etc.) REMAINS EXACTLY THE SAME
async function handleAddCommand(interaction, res) {
  try {
    // Defer the response immediately
    res.json({ type: 5 });
    
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

    console.log(`Adding ${userId} to clan ${clan}`);

    await addRoles(userId, clanInfo.role);
    await sendWelcomeDM(userId, clanInfo.name);
    await sendClanWelcome(userId, clanInfo, shouldPingClan);

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
    await editOriginalResponse(interaction, 'An error occurred: ' + error.message);
  }
}

async function addRoles(userId, clanRoleId) {
  const guildId = process.env.GUILD_ID;
  await discordApi(`guilds/${guildId}/members/${userId}/roles/${IDS.ROLES.BOOM_MEMBER}`, 'PUT');
  await discordApi(`guilds/${guildId}/members/${userId}/roles/${clanRoleId}`, 'PUT');
}

async function sendWelcomeDM(userId, clanName) {
  const dmChannel = await discordApi('users/@me/channels', 'POST', { recipient_id: userId });
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
  await discordApi(`channels/${dmChannel.id}/messages`, 'POST', { embeds: [dmEmbed] });
}

async function sendClanWelcome(userId, clanInfo, shouldPingClan) {
  const content = shouldPingClan
    ? `<@&${clanInfo.role}> Plz welcome our newest clan member <@${userId}>! <a:heya:1427561870797180928> — glad to have you on board! <a:KnightCheergif:1427561243811647548>`
    : `Welcome <@${userId}> to your clan's general chat! <a:heya:1427561870797180928> — feel free to look around! <a:KnightCheergif:1427561243811647548>`;
  await discordApi(`channels/${clanInfo.channel}/messages`, 'POST', { content });
}

async function discordApi(endpoint, method = 'GET', body = null) {
  const response = await fetch(`https://discord.com/api/v10/${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bot ${process.env.BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : null,
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}

async function editOriginalResponse(interaction, content) {
  await discordApi(`webhooks/${process.env.CLIENT_ID}/${interaction.token}/messages/@original`, 'PATCH', { content });
}

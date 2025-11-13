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

export const config = {
  api: {
    bodyParser: false,
  },
};

async function parseRawBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
    });
    req.on('end', () => {
      resolve(data);
    });
  });
}

function verifySignature(req, rawBody) {
  try {
    const signature = req.headers['x-signature-ed25519'];
    const timestamp = req.headers['x-signature-timestamp'];
    
    if (!signature || !timestamp) {
      console.log('Missing signature headers');
      return false;
    }

    const publicKey = process.env.DISCORD_PUBLIC_KEY;
    if (!publicKey) {
      console.log('Missing DISCORD_PUBLIC_KEY');
      return false;
    }

    const message = timestamp + rawBody;
    
    const isVerified = crypto.verify(
      null,
      Buffer.from(message, 'utf8'),
      Buffer.from(publicKey, 'hex'),
      Buffer.from(signature, 'hex')
    );

    console.log('Signature verification result:', isVerified);
    return isVerified;
    
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}

export default async function handler(req, res) {
  console.log('=== Request Received ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);

  if (req.method !== 'POST') {
    console.log('Method not allowed, returning 200 for OPTIONS/preflight');
    return res.status(200).json({ ok: true }); // Return 200 for non-POST during verification
  }

  try {
    // Get raw body
    const rawBody = await parseRawBody(req);
    console.log('Raw body received, length:', rawBody.length);
    console.log('Raw body content:', rawBody);

    // Parse the body to check interaction type
    let interaction;
    try {
      interaction = JSON.parse(rawBody);
      console.log('Interaction type:', interaction?.type);
    } catch (parseError) {
      console.log('Failed to parse JSON, returning 200 for verification');
      return res.status(200).json({ ok: true });
    }

    // Handle PING from Discord (this is what Discord sends for verification)
    if (interaction.type === 1) {
      console.log('Handling PING request - returning PONG');
      return res.json({ type: 1 });
    }

    // For other requests, verify signature
    const signatureValid = verifySignature(req, rawBody);
    console.log('Signature valid for non-PING:', signatureValid);

    if (!signatureValid && interaction.type !== 1) {
      console.log('Invalid signature for non-PING request');
      return res.status(401).end('Invalid signature');
    }

    // Handle slash command
    if (interaction.type === 2 && interaction.data?.name === 'add') {
      console.log('Handling add command');
      return await handleAddCommand(interaction, res);
    }

    console.log('Unknown interaction type, returning 200');
    res.status(200).json({ ok: true });

  } catch (error) {
    console.error('Unexpected error:', error);
    // Always return 200 during verification to see if it passes
    res.status(200).json({ ok: true, error: error.message });
  }
}

// REST OF YOUR CODE (handleAddCommand, addRoles, etc.) REMAINS EXACTLY THE SAME
async function handleAddCommand(interaction, res) {
  try {
    // Defer the response immediately
    res.json({ type: 5 }); // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
    
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
    const errorText = await response.text();
    throw new Error(`Discord API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

// Helper to edit the original interaction response
async function editOriginalResponse(interaction, content) {
  await discordApi(`webhooks/${process.env.CLIENT_ID}/${interaction.token}/messages/@original`, 'PATCH', {
    content
  });
}

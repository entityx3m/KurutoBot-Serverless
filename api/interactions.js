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

export default async function handler(req, res) {
  console.log('=== DEBUG VERSION ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Headers:', {
    'x-signature-ed25519': req.headers['x-signature-ed25519'] ? 'PRESENT' : 'MISSING',
    'x-signature-timestamp': req.headers['x-signature-timestamp'] ? 'PRESENT' : 'MISSING',
    'content-type': req.headers['content-type'],
    'user-agent': req.headers['user-agent']
  });

  if (req.method !== 'POST') {
    console.log('Non-POST request - this is from browser');
    return res.json({ ok: true, message: 'This endpoint expects POST requests from Discord' });
  }

  // Check if this is a Discord request
  const hasDiscordHeaders = req.headers['x-signature-ed25519'] && req.headers['x-signature-timestamp'];
  
  if (!hasDiscordHeaders) {
    console.log('POST request but missing Discord headers');
    return res.status(401).json({ error: 'Missing Discord signature headers' });
  }

  console.log('✅ This looks like a Discord request!');
  
  try {
    const rawBody = await parseRawBody(req);
    console.log('Raw body length:', rawBody.length);
    console.log('Raw body content:', rawBody);

    const interaction = JSON.parse(rawBody);
    console.log('Parsed interaction type:', interaction?.type);

    // Handle PING from Discord
    if (interaction.type === 1) {
      console.log('🎯 DISCORD PING RECEIVED - RETURNING PONG');
      return res.json({ type: 1 });
    }

    console.log('Unknown interaction type:', interaction.type);
    res.status(400).json({ error: 'Unknown interaction type' });

  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

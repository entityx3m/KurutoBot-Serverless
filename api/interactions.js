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
  console.log('=== MINIMAL VERSION - Request Received ===');
  console.log('Method:', req.method);
  console.log('Headers:', {
    'x-signature-ed25519': req.headers['x-signature-ed25519'] ? 'present' : 'missing',
    'x-signature-timestamp': req.headers['x-signature-timestamp'] ? 'present' : 'missing'
  });

  if (req.method !== 'POST') {
    console.log('Method not allowed');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const rawBody = await parseRawBody(req);
    console.log('Raw body length:', rawBody.length);
    console.log('Raw body (first 200 chars):', rawBody.substring(0, 200));

    const interaction = JSON.parse(rawBody);
    console.log('Interaction type:', interaction?.type);

    // THIS IS THE KEY: Handle PING requests
    if (interaction.type === 1) {
      console.log('✅ Handling PING - returning PONG');
      return res.json({ type: 1 });
    }

    console.log('Not a PING request, returning 400');
    res.status(400).json({ error: 'Not a PING request' });

  } catch (error) {
    console.error('Error:', error);
    // Still return 200 for verification
    res.status(200).json({ ok: true, error: error.message });
  }
}

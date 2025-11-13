import crypto from 'crypto';

export const config = {
  api: {
    bodyParser: false,
  },
};

// Parse raw body
const getRawBody = (req) => {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      resolve(data);
    });
  });
};

// Verify Discord signature
const verifySignature = (req, body) => {
  try {
    const signature = req.headers['x-signature-ed25519'];
    const timestamp = req.headers['x-signature-timestamp'];
    const publicKey = process.env.DISCORD_PUBLIC_KEY;

    if (!signature || !timestamp || !publicKey) {
      return false;
    }

    const message = timestamp + body;
    return crypto.verify(
      null,
      Buffer.from(message),
      Buffer.from(publicKey, 'hex'),
      Buffer.from(signature, 'hex')
    );
  } catch {
    return false;
  }
};

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-Signature-Ed25519, X-Signature-Timestamp, Content-Type');
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get raw body
    const rawBody = await getRawBody(req);
    
    // Verify signature
    if (!verifySignature(req, rawBody)) {
      console.log('Signature verification failed');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Parse the interaction
    const interaction = JSON.parse(rawBody);
    
    // Handle PING (this is what Discord sends for verification)
    if (interaction.type === 1) {
      console.log('Received and responding to PING');
      return res.json({ type: 1 });
    }

    // If we get here, it's a different interaction type
    console.log('Received non-PING interaction:', interaction.type);
    res.status(400).json({ error: 'Unhandled interaction type' });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

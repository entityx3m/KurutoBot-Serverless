import { verifyKey } from 'discord-interactions';

export const config = {
  api: {
    bodyParser: false, // Discord sends raw body for verification
  },
};

const PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY;

export default async function handler(req, res) {
  const signature = req.headers['x-signature-ed25519'];
  const timestamp = req.headers['x-signature-timestamp'];
  const rawBody = await getRawBody(req); // helper function below

  // Verify the request came from Discord
  if (!verifyKey(rawBody, signature, timestamp, PUBLIC_KEY)) {
    return res.status(401).send('invalid request signature');
  }

  const interaction = JSON.parse(rawBody);

  // Respond to ping (type 1) for verification
  if (interaction.type === 1) {
    return res.json({ type: 1 });
  }

  // Handle your command (type 2)
  if (interaction.type === 2) {
    return res.json({
      type: 4,
      data: { content: `Hello <@${interaction.member.user.id}>! Command received.` },
    });
  }
}

// Helper to get raw request body
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', err => reject(err));
  });
}

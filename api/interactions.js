import { verifyKey } from 'discord-interactions';

export default async function handler(req, res) {
  const signature = req.headers['x-signature-ed25519'];
  const timestamp = req.headers['x-signature-timestamp'];
  const body = await req.text();

  const isValid = verifyKey(body, signature, timestamp, process.env.DISCORD_PUBLIC_KEY);
  if (!isValid) {
    return res.status(401).send('Bad request signature');
  }

  const json = JSON.parse(body);

  // Respond to Discord’s initial PING verification
  if (json.type === 1) {
    return res.status(200).json({ type: 1 });
  }

  // Handle actual interactions
  res.status(200).send('ok');
}

export const config = {
  api: {
    bodyParser: false,
  },
};

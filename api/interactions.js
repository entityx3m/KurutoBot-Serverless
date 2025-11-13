import { InteractionType, InteractionResponseType, verifyKey } from 'discord-interactions';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const signature = req.headers['x-signature-ed25519'];
  const timestamp = req.headers['x-signature-timestamp'];
  const body = await req.text();

  const isValid = verifyKey(body, signature, timestamp, process.env.DISCORD_PUBLIC_KEY);
  if (!isValid) {
    return res.status(401).send('Bad request signature');
  }

  const interaction = JSON.parse(body);

  // Ping verification
  if (interaction.type === InteractionType.PING) {
    return res.status(200).json({ type: InteractionResponseType.PONG });
  }

  // Slash command handling
  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    const { name, options } = interaction.data;

    if (name === 'add') {
      const member = options.find(o => o.name === 'member')?.value;
      const role = options.find(o => o.name === 'role')?.value;

      // Respond publicly in the channel
      return res.status(200).json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `✅ <@${member}> has been added to **${role}**!`
        }
      });
    }
  }

  return res.status(400).send('Unhandled interaction type');
}

export const config = {
  api: {
    bodyParser: false,
  },
};

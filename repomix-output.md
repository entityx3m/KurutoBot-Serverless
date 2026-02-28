This file is a merged representation of the entire codebase, combined into a single document by Repomix.

<file_summary>
This section contains a summary of this file.

<purpose>
This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.
</purpose>

<file_format>
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  - File path as an attribute
  - Full contents of the file
</file_format>

<usage_guidelines>
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.
</usage_guidelines>

<notes>
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)
</notes>

</file_summary>

<directory_structure>
.eslintrc.json
.gitignore
.vercelignore
commands/add.ts
commands/chat.ts
commands/leave.ts
commands/link.ts
commands/ping.ts
commands/player.ts
commands/postlink.ts
commands/postrecruit.ts
commands/postticket.ts
commands/servers.ts
commands/unlink.ts
index.ts
package.json
public/favicon.ico
public/index.html
README.md
scripts/register.ts
tsconfig.json
utils/addHelper.ts
utils/cocApi.ts
utils/config.ts
utils/discordApi.ts
utils/kvHelper.ts
utils/linkHelper.ts
utils/logger.ts
utils/recruitment.ts
utils/types.ts
vercel.json
</directory_structure>

<files>
This section contains the contents of the repository's files.

<file path=".eslintrc.json">
{
  "env": {
    "browser": true,
    "es2021": true
  },
  "extends": "eslint:recommended",
  "parserOptions": {
    "ecmaVersion": 12,
    "sourceType": "module"
  },
  "rules": {
    "no-unused-vars": "warn",
    "no-console": "off",
    "eqeqeq": "error"
  }
}
</file>

<file path=".gitignore">
dist
api
node_modules
bun.lockb
bun.lock
package-lock.json
yarn.lock
pnpm-lock.yaml
.env
.discraft
.vercel

.vercel
</file>

<file path=".vercelignore">
node_modules
.env
.discraft
.vercel
</file>

<file path="commands/ping.ts">
import type {
  CommandData,
  CommandExecuteResult,
  SimplifiedInteraction,
} from "../utils/types";

// Here you define your command data
// Discraft will handle the registration and interactions with the API

export default {
  data: {
    name: "ping", // The name of the command
    description: "Check if the bot is online", // The description of the command
  } as CommandData,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async execute(data: {
    interaction: SimplifiedInteraction;
  }): CommandExecuteResult {
    return {
      content: "Pong from Vercel!", // The message content
    };
  },
};
</file>

<file path="commands/postticket.ts">
// commands/postticket.ts
import axios from "axios";
import {
  ApplicationCommandType,
  InteractionResponseType,
  MessageFlags,
  PermissionFlagsBits,
} from "discord-api-types/v10";
import type {
  CommandData,
  CommandExecuteResult,
  SimplifiedInteraction,
} from "../utils/types";
import {
  sendEphemeralReply,
  showModal,
  sendChannelMessage,
  getMember,
} from "../utils/discordApi";
import { ROLE_IDS, CHANNEL_IDS } from "../utils/config";

// Role IDs used for ticket permissions (you can also put these in config)
const JOIN_LEADERSHIP_ROLE = ROLE_IDS.TICKET_JOIN_LEADERSHIP_ROLE || "REDACTED_TICKET_JOIN_LEADERSHIP_ID";
const STAFF_LEADERSHIP_ROLE = ROLE_IDS.TICKET_STAFF_LEADERSHIP_ROLE || "REDACTED_TICKET_STAFF_LEADERSHIP_ID";
const TICKET_CATEGORY = CHANNEL_IDS.TICKET_CATEGORY; // must be set in config

const MAIN_SERVER_ID = process.env.GUILD_ID || "REDACTED_WM_ID";
const VERIFIED_ROLE_ID = ROLE_IDS.VERIFIED;

export default {
  data: {
    name: "postticket",
    description: "Post ticket creation embed with buttons",
    type: ApplicationCommandType.ChatInput,
    default_member_permissions: PermissionFlagsBits.ManageMessages.toString(),
  } as CommandData,

  async execute(data: {
    interaction: SimplifiedInteraction;
  }): CommandExecuteResult {
    const interaction = data.interaction;

    if (interaction.guild_id !== MAIN_SERVER_ID) {
      return {
        content: "<a:redcross:1439044567415521443> This command only works in the BOOM House server!",
        flags: MessageFlags.Ephemeral,
      };
    }

    const embed = {
      author: {
        name: "BOOM House | Ticket Center",
        icon_url: "https://cdn.discordapp.com/attachments/1412097601289064609/1430484430425948270/Picsart_25-10-22_17-08-58-571.png",
      },
      title: "Welcome to the BOOM House Clash of Clans Alliance! ⚔️",
      description: `We're a competitive network of 4 active clans led by **War Master** — our elite war clan with *an undefeated war streak*. 💪  
Each clan follows the same standards of strategy, discipline, and teamwork — building a united alliance for serious and growth-driven players.

📍 You can view all our clans here: <#REDACTED_CHANNEL_CLANS_LIST_ID>  

Please choose an option below to get started:

\`\`\` 🎟️ Apply to Join \`\`\` 🔹 Submit your application to join one of our clans. *(For new applicants only.)*

\`\`\` 🛡️ Chat with Staff \`\`\` 🔹 For **BOOM House members, ex-members, and approved visitors** needing assistance.

\`\`\` ⚔️ Apply for Staff \`\`\` 🔹 For **current BOOM House members** interested in joining the alliance team.

Thank you for your interest in BOOM House — where excellence in war and unity define every Chief. 🔥`,
      image: {
        url: "https://cdn.discordapp.com/attachments/1412097601289064609/1427260863295000616/bhticket.png",
      },
      footer: {
        text: "BOOM House | Clash of Clans Alliance",
        icon_url: "https://cdn.discordapp.com/attachments/1412097601289064609/1430484430425948270/Picsart_25-10-22_17-08-58-571.png",
      },
      color: 0xFEE75C,
    };

    const components = [
      {
        type: 1, // ACTION_ROW
        components: [
          {
            type: 2, // BUTTON
            style: 1, // PRIMARY
            custom_id: "ticket_apply_join",
            label: "Apply to Join",
            emoji: { name: "🎟️" },
          },
          {
            type: 2,
            style: 3, // SUCCESS
            custom_id: "ticket_chat_staff",
            label: "Chat with Staff",
            emoji: { name: "🛡️" },
          },
          {
            type: 2,
            style: 4, // DANGER
            custom_id: "ticket_apply_staff",
            label: "Apply for Staff",
            emoji: { name: "⚔️" },
          },
        ],
      },
    ];

    return {
      embeds: [embed],
      components,
    };
  },

  handlers: {
    // ---- BUTTON HANDLERS ----
    ticket_apply_join: async ({ interaction }: { interaction: SimplifiedInteraction }) => {
      await handleTicketButton(interaction, "apply_join");
    },
    ticket_chat_staff: async ({ interaction }: { interaction: SimplifiedInteraction }) => {
      await handleTicketButton(interaction, "chat_staff");
    },
    ticket_apply_staff: async ({ interaction }: { interaction: SimplifiedInteraction }) => {
      await handleTicketButton(interaction, "apply_staff");
    },

    // ---- MODAL HANDLERS ----
    ticket_apply_join_modal: async ({ interaction }: { interaction: SimplifiedInteraction }) => {
      await handleTicketModal(interaction, "apply_join");
    },
    ticket_chat_staff_modal: async ({ interaction }: { interaction: SimplifiedInteraction }) => {
      await handleTicketModal(interaction, "chat_staff");
    },
    ticket_apply_staff_modal: async ({ interaction }: { interaction: SimplifiedInteraction }) => {
      await handleTicketModal(interaction, "apply_staff");
    },

    // ---- CLOSE TICKET BUTTON ----
    close_ticket: async ({ interaction }: { interaction: SimplifiedInteraction }) => {
      const userId = interaction.member?.user?.id;
      const channelId = interaction.channel_id;
      const guildId = interaction.guild_id;

      if (!userId || !channelId || !guildId) return;

      // Defer the button press
      await axios.post(
        `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`,
        { type: InteractionResponseType.DeferredMessageUpdate }
      );

      try {
        // Fetch channel to get its topic
        const channelRes = await fetch(`https://discord.com/api/v10/channels/${channelId}`, {
          headers: { Authorization: `Bot ${process.env.DISCORD_TOKEN}` },
        });
        if (!channelRes.ok) throw new Error("Could not fetch channel");
        const channel = await channelRes.json();
        const topic = channel.topic || "";

        // Parse creator and type from topic
        const creatorMatch = topic.match(/creator:(\d+)/);
        const typeMatch = topic.match(/type:(\w+)/);
        const isCreator = creatorMatch && creatorMatch[1] === userId;
        const ticketType = typeMatch ? typeMatch[1] : null;

        // Determine required staff role
        let requiredRole = null;
        if (ticketType === "apply_join") {
          requiredRole = JOIN_LEADERSHIP_ROLE;
        } else if (ticketType === "chat_staff" || ticketType === "apply_staff") {
          requiredRole = STAFF_LEADERSHIP_ROLE;
        }

        // Check if user has the required role (or is creator)
        let hasRequiredRole = false;
        if (requiredRole) {
          const member = await getMember(guildId, userId);
          hasRequiredRole = member.success && member.data.roles.includes(requiredRole);
        }

        if (!isCreator && !hasRequiredRole) {
          await axios.patch(
            `https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`,
            { content: "<a:redcross:1439044567415521443> You don't have permission to close this ticket." }
          );
          return;
        }

        // Delete the channel
        await fetch(`https://discord.com/api/v10/channels/${channelId}`, {
          method: "DELETE",
          headers: { Authorization: `Bot ${process.env.DISCORD_TOKEN}` },
        });

        // No further response needed (channel is gone)
      } catch (error) {
        console.error("Error closing ticket:", error);
        await axios.patch(
          `https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`,
          { content: "<a:redcross:1439044567415521443> Failed to close ticket." }
        );
      }
    },
  },
};

// ----- Helper Functions -----

async function handleTicketButton(interaction: SimplifiedInteraction, type: string) {
  const userId = interaction.member?.user?.id;
  const guildId = interaction.guild_id;

  if (!userId || !guildId) {
    await sendEphemeralReply(interaction.id, interaction.token, "Could not identify you.");
    return;
  }

  // Check if user has Verified role
  const member = await getMember(guildId, userId);
  if (!member.success || !member.data.roles.includes(VERIFIED_ROLE_ID)) {
    await sendEphemeralReply(
      interaction.id,
      interaction.token,
      "<a:redcross:1439044567415521443> You must link your Clash of Clans account first!\nUse `/link` or the **Link Account** button to get verified."
    );
    return;
  }

  // Show the appropriate modal
  let modal: any;
  switch (type) {
    case "apply_join":
      modal = createApplyJoinModal();
      break;
    case "chat_staff":
      modal = createChatStaffModal();
      break;
    case "apply_staff":
      modal = createApplyStaffModal();
      break;
    default:
      return;
  }

  await showModal(interaction.id, interaction.token, modal.custom_id, modal.title, modal.components);
}

async function handleTicketModal(interaction: SimplifiedInteraction, type: string) {
  const userId = interaction.member?.user?.id;
  const guildId = interaction.guild_id;
  const username = interaction.member?.user?.username || "user";

  if (!userId || !guildId) {
    await sendEphemeralReply(interaction.id, interaction.token, "Could not identify you.");
    return;
  }

  // Parse answers from modal components
  const answers: Record<string, string> = {};
  for (const row of interaction.data?.components || []) {
    for (const comp of row.components) {
      answers[comp.custom_id] = comp.value || "";
    }
  }

  // Create channel name
  const safeUsername = username.toLowerCase().replace(/[^a-z0-9]/g, "-");
  const formatAnswerValue = (answer?: string) => {
    const safeAnswer = (answer || "Not answered").replace(/```/g, "'''");
    return `\`\`\`${safeAnswer}\`\`\``;
  };

  const createEmbedField = (question: string, answer?: string, inline?: boolean) => ({
    name: `**${question}**`,
    value: formatAnswerValue(answer),
    inline,
  });

  let channelName = "";
  let welcomeMessage = "";
  let staffRoleId = "";
  let embedFields: { name: string; value: string; inline?: boolean }[] = [];

  switch (type) {
    case "apply_join":
      channelName = `join-clan-${safeUsername}`;
      welcomeMessage = `Hey <@${userId}> 👋  
Thank you for applying to join the **Boom House Clash of Clans Alliance!** ⚡

Your **application form** has been received successfully.  
One of our leaders will review your submission shortly. 🕵️‍♂️
<@&${JOIN_LEADERSHIP_ROLE}>

Please **stay in this ticket** while we go over your details — we’ll get back to you as soon as possible.  
Once reviewed, you’ll be notified here with the next steps. 💬

**Welcome to the Boom House family, and good luck, Chief!** 🍀`;
      staffRoleId = JOIN_LEADERSHIP_ROLE;
      embedFields = [
        createEmbedField("1️⃣ Did you link your account?", answers.q1, true),
        createEmbedField("2️⃣ How many CoC accounts do you have?", answers.q2, true),
        createEmbedField("3️⃣ Who recruited you?", answers.q3, true),
      ];
      break;
    case "chat_staff":
      channelName = `chat-staff-${safeUsername}`;
      welcomeMessage = `Hey <@${userId}> 👋  
Thank you for reaching out to the **Boom House Alliance Staff Team.**  
A **<@&${STAFF_LEADERSHIP_ROLE}>** member will assist you shortly. ⚔️  

Please wait patiently while our staff reviews your concern.
Kindly keep all communication respectful and within this ticket. 💬`;
      staffRoleId = STAFF_LEADERSHIP_ROLE;
      embedFields = [
        createEmbedField("Describe your concern in detail", answers.q1, false),
      ];
      break;
    case "apply_staff":
      channelName = `apply-staff-${safeUsername}`;
      welcomeMessage = `Hey <@${userId}> 👋  
Your **staff application** has been received. A **<@&${STAFF_LEADERSHIP_ROLE}>** member will review it soon. ⚔️  

Please wait patiently while we go over your answers.  
You’ll be contacted here once a decision or follow-up interview is ready. 💬  

Thank you for your interest in joining the **Boom House Alliance Staff Team!** 🛡️`;
      staffRoleId = STAFF_LEADERSHIP_ROLE;
      embedFields = [
        createEmbedField("Are you a member of any BOOM House Clans?", answers.q1, false),
        createEmbedField("Why do you want to become a staff member?", answers.q2, false),
        createEmbedField("How active are you on Discord and CoC?", answers.q3, false),
        createEmbedField("Anything else you’d like us to know?", answers.q4, false),
      ];
      break;
    default:
      return;
  }

  // Defer the modal submission
  await axios.post(
    `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`,
    {
      type: InteractionResponseType.DeferredChannelMessageWithSource,
      data: { flags: MessageFlags.Ephemeral },
    }
  );

  try {
    // Create the ticket channel
    const channelPayload = {
      name: channelName,
      type: 0, // GUILD_TEXT
      parent_id: TICKET_CATEGORY,
      topic: `creator:${userId}|type:${type}`,
      permission_overwrites: [
        {
          id: guildId, // @everyone
          type: 0, // role
          deny: (1 << 10) | (1 << 11) | (1 << 12), // VIEW_CHANNEL, SEND_MESSAGES, READ_MESSAGE_HISTORY
        },
        {
          id: userId, // ticket creator
          type: 1, // member
          allow: (1 << 10) | (1 << 11) | (1 << 12), // allow view, send, read history
        },
        {
          id: staffRoleId, // leadership role
          type: 0, // role
          allow: (1 << 10) | (1 << 11) | (1 << 12), // view, send, read history
        },
        {
          id: process.env.DISCORD_APP_ID!, // bot itself
          type: 1, // member
          allow: (1 << 10) | (1 << 11) | (1 << 12) | (1 << 4), // also allow MANAGE_CHANNELS (for close)
        },
      ],
    };

    const createRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(channelPayload),
    });

    if (!createRes.ok) {
      throw new Error(`Failed to create channel: ${createRes.statusText}`);
    }

    const channel = await createRes.json();

    // Send welcome message
    await sendChannelMessage(channel.id, { content: welcomeMessage });

    // Send embed with answers
    const embed = {
      title: "📋 Application Details",
      color: 0x5865F2,
      fields: embedFields,
      timestamp: new Date().toISOString(),
    };
    await sendChannelMessage(channel.id, { embeds: [embed] });

    // Add Close button to the channel
    const closeButton = {
      type: 1,
      components: [
        {
          type: 2,
          style: 4, // DANGER
          custom_id: "close_ticket",
          label: "Close Ticket",
          emoji: { name: "🔒" },
        },
      ],
    };
    await sendChannelMessage(channel.id, { components: [closeButton] });

    // After channel creation, send ephemeral confirmation
    await axios.post(
      `https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}`,
      {
        content: `<a:AnimatedCheck:1427570005750448169> Your ticket has been created: <#${channel.id}>`,
        flags: MessageFlags.Ephemeral,
      }
    );
  } catch (error) {
    console.error("Error creating ticket:", error);
    await axios.patch(
      `https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`,
      {
        content: `<a:redcross:1439044567415521443> Failed to create ticket: ${error instanceof Error ? error.message : "Unknown error"}`,
      }
    );
  }
}

// ----- Modal Creators -----

function createApplyJoinModal() {
  return {
    custom_id: "ticket_apply_join_modal",
    title: "Apply to Join a Clan",
    components: [
      {
        type: 1,
        components: [
          {
            type: 4,
            custom_id: "q1",
            label: "1️⃣ Did you link your account?",
            style: 1,
            placeholder: "Y/N",
            required: true,
            max_length: 10,
          },
        ],
      },
      {
        type: 1,
        components: [
          {
            type: 4,
            custom_id: "q2",
            label: "2️⃣ How many CoC accounts do you have?",
            style: 2, // PARAGRAPH
            placeholder: "Include their TH levels",
            required: true,
            max_length: 200,
          },
        ],
      },
      {
        type: 1,
        components: [
          {
            type: 4,
            custom_id: "q3",
            label: "3️⃣ Who recruited you?",
            style: 1,
            placeholder: "Name of the Recruiter",
            required: true,
            max_length: 100,
          },
        ],
      },
    ],
  };
}

function createChatStaffModal() {
  return {
    custom_id: "ticket_chat_staff_modal",
    title: "Chat with Staff",
    components: [
      {
        type: 1,
        components: [
          {
            type: 4,
            custom_id: "q1",
            label: "Describe your concern in detail",
            style: 2,
            placeholder: "Enter your concern",
            required: true,
            max_length: 500,
          },
        ],
      },
    ],
  };
}

function createApplyStaffModal() {
  return {
    custom_id: "ticket_apply_staff_modal",
    title: "Apply for Staff",
    components: [
      {
        type: 1,
        components: [
          {
            type: 4,
            custom_id: "q1",
            label: "Are you a member of any BOOM House Clans?",
            style: 1,
            placeholder: "If yes, please specify which one.",
            required: true,
            max_length: 100,
          },
        ],
      },
      {
        type: 1,
        components: [
          {
            type: 4,
            custom_id: "q2",
            label: "Why do you want to become a staff member?",
            style: 2,
            placeholder: "Tell us briefly what you can contribute.",
            required: true,
            max_length: 500,
          },
        ],
      },
      {
        type: 1,
        components: [
          {
            type: 4,
            custom_id: "q3",
            label: "How active are you on Discord and CoC?",
            style: 2,
            placeholder: "Example: “4–5 hours a day”",
            required: true,
            max_length: 200,
          },
        ],
      },
      {
        type: 1,
        components: [
          {
            type: 4,
            custom_id: "q4",
            label: "Anything else you’d like us to know?",
            style: 2,
            placeholder: "mention strengths, timezone, or special skills",
            required: false,
            max_length: 500,
          },
        ],
      },
    ],
  };
}
</file>

<file path="public/index.html">
<!doctype html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Discraft Bot</title>
        <style>
            html,
            body {
                font: 16px sans-serif;
                line-height: 1.4;
                margin: 0;
                background: #f8f9fa;
                color: #343a40;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                min-width: 100vw;
            }

            @media (prefers-color-scheme: dark) {
                body {
                    background: #1a1a1a;
                    color: #e9ecef;
                }
                .container {
                    background: #212529;
                    box-shadow: 0 2px 4px rgba(255, 255, 255, 0.1);
                }
            }

            .container {
                background: white;
                padding: 1.5rem;
                border-radius: 0.5rem;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                text-align: center;
                max-width: 500px;
            }

            a {
                color: #007bff;
                text-decoration: none;
            }

            a:hover {
                text-decoration: underline;
            }

            p {
                margin-bottom: 1rem;
            }

            h1 {
                margin-bottom: 1.2rem;
                color: #212529;
                font-size: 2rem;
            }

            table {
                width: 100%;
                margin-top: 1rem;
                border-collapse: collapse;
            }

            th,
            td {
                padding: 0.5rem;
                text-align: left;
                border-bottom: 1px solid #dee2e6;
            }

            th {
                font-weight: bold;
            }

            @media (prefers-color-scheme: dark) {
                a {
                    color: #90caf9;
                }
                th,
                td {
                    border-bottom: 1px solid #495057;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Discraft Bot Deployment</h1>
            <p>
                This is a deployment for a bot created with
                <a href="https://github.com/The-Best-Codes/discraft-js"
                    >Discraft</a
                >.
            </p>
            <table>
                <tr>
                    <th>API Route</th>
                    <td><a href="/api">/api</a></td>
                </tr>
                <tr>
                    <th>Serverless Deployment Docs</th>
                    <td>
                        <a
                            href="https://bestcodes.dev/blog/how-to-deploy-a-discord-bot-to-vercel"
                            >Discraft Docs</a
                        >
                    </td>
                </tr>
                <tr>
                    <th>Vercel Docs</th>
                    <td>
                        <a href="https://vercel.com/docs">Vercel Docs</a>
                    </td>
                </tr>
            </table>
        </div>
    </body>
</html>
</file>

<file path="README.md">
# Discraft Vercel + TypeScript + AI Template

### **Check out the [Vercel Deployment Guide](https://bestcodes.dev/blog/how-to-deploy-a-discord-bot-to-vercel) for a more detailed, step-by-step guide.**

Let's get started creating a serverless Discord bot with Discraft and Vercel!
This template leverages TypeScript and Google AI for enhanced functionality.

**Note:** If you came here after running `discraft init` with the Vercel template, you can skip to the 'Configuring Google AI' section.

## Prerequisites

Before you begin, make sure you have the following installed:

- [Node.js](https://nodejs.org/en/download/) (preferably version 18.x or higher)
- [Vercel CLI](https://vercel.com/cli)
- [Discraft CLI](https://github.com/The-Best-Codes/discraft-js)

## Getting Started

First, create a new directory for your project and navigate to it:

```bash
mkdir my-discraft-project
cd my-discraft-project
```

Now, initialize a new Discraft project, choosing the Vercel template:

```bash
discraft init
? Select a template:
  TypeScript
  JavaScript
❯ Vercel + TypeScript + Google AI
```

This will create a new project with a structure something like this:

```
my-discraft-project/
├── commands/
│   ├── chat.ts
│   └── ping.ts
├── public/
│   └── index.html
├── scripts/
│   └── register.ts
├── utils/
│   ├── logger.ts
│   └── types.ts
├── .env.example
├── .gitignore
├── .vercelignore
├── index.ts
├── package.json
├── README.md
├── tsconfig.json
└── vercel.json
```

## Configuring Google AI

This template utilizes the Google AI API for enhanced bot interactions. You'll need to create a Google AI project and obtain an API key. Here's how to configure it:

1. **Obtain API Key:** Visit the [Google AI Studio](https://aistudio.google.com/app/apikey) and obtain an API key.
2. **Select a Model:** Choose a suitable Google AI model. A good starting point is `gemini-2.0-flash-exp`, as it is currently free, but other models may be appropriate for your needs. You can find available models [here](https://ai.google.dev/models).
3. **Environment Variables:** The project relies on several environment variables to function correctly. You will need to set these in your `.env` file locally and in the Vercel project settings.
   - Create a `.env` file in your project's root directory.
   - Copy the contents of the `.env.example` file, filling in the values with your Discord and Google AI credentials.

Here's what the `.env.example` looks like:

```example
# You will need to add these secrets to the 'Environment Variables' section of your Vercel project
# https://vercel.com/docs/projects/environment-variables

# From `General Information > Public Key` | https://discord.com/developers/applications
DISCORD_PUBLIC_KEY=''
# From `General Information > App ID` | https://discord.com/developers/applications
DISCORD_APP_ID=''
# From `Bot > Token` | https://discord.com/developers/applications
DISCORD_TOKEN=''

# From `Get API Key` | https://aistudio.google.com/app/apikey
GOOGLE_AI_API_KEY=''
# From the Google model list
GOOGLE_AI_MODEL='gemini-2.0-flash-exp'
```

**Important:** _Do not commit the `.env` file to your repository._ It should be added to your `.gitignore` file. This is already done for you in the template.

## Deploying to Vercel

1. **Create a Vercel Project:** If you haven't already, create a new project in your Vercel dashboard.
2. **Set Environment Variables:** In your Vercel project settings, go to "Environment Variables" and add all the variables you configured in your `.env`. You can find the project settings [here](https://vercel.com/dashboard).
3. **Run a Discraft Build**: In your project directory, run `npm run build` or `discraft vercel build` to create the API routes and files for your bot.
4. **Deploy:** You can deploy your bot to Vercel by running `npm run deploy` in your project directory.

## Discord Bot Setup

### Create a Discord Application

1. **Create a Discord Application:** Go to the [Discord Developer Portal](https://discord.com/developers/applications) and create a new application.
2. **Add a Bot User:** Add a bot user to your application.
3. **Invite the Bot:** Use the 'OAuth2 > URL Generator' section to create an invite link and add your bot to a server. Select the `applications.commands` scope and send this link to a discord server you own so you can see your bot in action.

### Change the Bot's Interactions Endpoint URL

1. **Go to the Bot's Application Page:** Go to the [Discord Developer Portal](https://discord.com/developers/applications) and select your bot's application.
2. **Go to the General Information Tab.**
3. **Set the Interactions Endpoint URL:** In the Interactions Endpoint URL field, enter the URL of your bot's API endpoint. This should be the URL of your Vercel deployment, followed by `/api`.

## Example Commands

This template comes with a couple of example commands:

- **`/ping`**: Responds with "Pong!".
- **`/chat <prompt>`**: Uses Google AI to respond to the given prompt.

## Get Help & See Demos

Need some assistance or want to see the bot in action? Join our Discord community!
[Discraft Support Discord](https://discord.gg/86qMjn4RHQ)

## Contribute

If you have ideas for the bot, or find any issues, you can create a pull request or issue on our github here:
https://github.com/The-Best-Codes/discraft-js
</file>

<file path="scripts/register.ts">
import { configDotenv } from "dotenv";
configDotenv();

import {
  REST,
  type RESTPostAPIApplicationCommandsJSONBody,
  Routes,
} from "discord.js";
import commands from "../.discraft/commands/index.ts";

const token = process.env.DISCORD_TOKEN;
const applicationId = process.env.DISCORD_APP_ID;

if (!token) {
  console.error("DISCORD_TOKEN is not set in your environment variables.");
  process.exit(1);
}
if (!applicationId) {
  console.error("DISCORD_APP_ID is not set in your environment variables.");
  process.exit(1);
}

const rest = new REST({ version: "10" }).setToken(token);

const commandData = Object.values(commands).map((command) => command.data);

(async () => {
  try {
    console.log(
      `Started refreshing ${commandData.length} application (/) commands.`,
    );

    const data = (await rest.put(Routes.applicationCommands(applicationId), {
      body: commandData,
    })) as RESTPostAPIApplicationCommandsJSONBody[];
    console.log(
      `Successfully reloaded ${data.length} application (/) commands.`,
    );
  } catch (error) {
    console.error(error);
  }
})();
</file>

<file path="tsconfig.json">
{
  "compilerOptions": {
    // Enable latest features
    "lib": ["ESNext", "DOM"],
    "target": "ESNext",
    "module": "ESNext",
    "moduleDetection": "force",
    "jsx": "react-jsx",
    "allowJs": true,

    // Bundler mode
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "noEmit": true,

    // Best practices
    "strict": true,
    "skipLibCheck": true,
    "noFallthroughCasesInSwitch": true,

    // Some stricter flags (disabled by default)
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noPropertyAccessFromIndexSignature": false
  }
}
</file>

<file path="utils/cocApi.ts">
// utils/cocApi.ts
// Centralized Clash of Clans API handler with error handling

import { API_URLS, VALIDATION } from "./config";

export interface PlayerData {
  name: string;
  townHallLevel: number;
  expLevel: number;
  leagueTier?: {
    name: string;
    iconUrls?: {
      small?: string;
      medium?: string;
      large?: string;
    };
  };
  clan?: {
    tag: string;
    name: string;
  };
  role?: string;
  warPreference?: string;
  warStars?: number;
  trophies?: number;
  bestTrophies?: number;
  [key: string]: any;
}

export interface ClanData {
  tag: string;
  name: string;
  members: number;
  [key: string]: any;
}

export interface CocApiError {
  success: false;
  status: number;
  statusText: string;
  message: string;
}

export interface CocApiSuccess<T> {
  success: true;
  data: T;
}

export type CocApiResponse<T> = CocApiSuccess<T> | CocApiError;

class CocApi {
  private baseUrl = API_URLS.COC_API_BASE;
  private apiKey = process.env.COC_API_KEY || "";

  /**
   * Get player data from Clash of Clans API
   */
  async getPlayer(playerTag: string): Promise<CocApiResponse<PlayerData>> {
    try {
      const cleanTag = VALIDATION.cleanPlayerTag(playerTag);
      
      if (!VALIDATION.isValidPlayerTag(cleanTag)) {
        return {
          success: false,
          status: 400,
          statusText: "Bad Request",
          message: "Invalid player tag format"
        };
      }

      const response = await fetch(`${this.baseUrl}/players/%23${cleanTag}`, {
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Accept": "application/json"
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          return {
            success: false,
            status: 404,
            statusText: "Not Found",
            message: `Player #${cleanTag} not found. Check tag or profile privacy.`
          };
        }
        return {
          success: false,
          status: response.status,
          statusText: response.statusText,
          message: `CoC API error: ${response.status} ${response.statusText}`
        };
      }

      const data = await response.json();
      return {
        success: true,
        data
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        status: 500,
        statusText: "Internal Server Error",
        message: errorMessage
      };
    }
  }

  /**
   * Get clan data from Clash of Clans API
   */
  async getClan(clanTag: string): Promise<CocApiResponse<ClanData>> {
    try {
      const cleanTag = VALIDATION.cleanPlayerTag(clanTag);
      
      const response = await fetch(`${this.baseUrl}/clans/%23${cleanTag}`, {
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Accept": "application/json"
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          return {
            success: false,
            status: 404,
            statusText: "Not Found",
            message: `Clan #${cleanTag} not found.`
          };
        }
        return {
          success: false,
          status: response.status,
          statusText: response.statusText,
          message: `CoC API error: ${response.status} ${response.statusText}`
        };
      }

      const data = await response.json();
      return {
        success: true,
        data
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        status: 500,
        statusText: "Internal Server Error",
        message: errorMessage
      };
    }
  }

  /**
   * Validate a player tag and return cleaned version
   */
  validateAndCleanTag(tag: string): { valid: boolean; cleanTag: string; error?: string } {
    const cleanTag = VALIDATION.cleanPlayerTag(tag);
    
    if (!VALIDATION.isValidPlayerTag(cleanTag)) {
      return {
        valid: false,
        cleanTag,
        error: "<a:redcross:1439044567415521443> **Invalid Player Tag**\nExample: `#ABCDEFGH` or just `ABCDEFGH`"
      };
    }

    return { valid: true, cleanTag };
  }
}

export const cocApi = new CocApi();
</file>

<file path="utils/discordApi.ts">
// utils/discordApi.ts
// Centralized Discord API handler for common operations

import axios from "axios";
import { InteractionResponseType, MessageFlags } from "discord-api-types/v10";
import { API_URLS } from "./config";

export interface DiscordApiError {
  success: false;
  error: string;
  statusCode?: number;
}

export interface DiscordApiSuccess<T = any> {
  success: true;
  data?: T;
}

export type DiscordApiResponse<T = any> = DiscordApiSuccess<T> | DiscordApiError;

/**
 * Send an ephemeral reply to an interaction
 */
export async function sendEphemeralReply(
  interactionId: string,
  token: string,
  content: string
): Promise<DiscordApiResponse> {
  try {
    await axios.post(
      `${API_URLS.DISCORD_API}/interactions/${interactionId}/${token}/callback`,
      {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content,
          flags: MessageFlags.Ephemeral
        }
      },
      { headers: { "Content-Type": "application/json" } }
    );
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}

/**
 * Send an ephemeral reply with embeds
 */
export async function sendEphemeralEmbed(
  interactionId: string,
  token: string,
  embeds: any[],
  content?: string
): Promise<DiscordApiResponse> {
  try {
    await axios.post(
      `${API_URLS.DISCORD_API}/interactions/${interactionId}/${token}/callback`,
      {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: content || "",
          embeds,
          flags: MessageFlags.Ephemeral
        }
      },
      { headers: { "Content-Type": "application/json" } }
    );
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}

/**
 * Send a deferred response
 */
export async function deferReply(
  interactionId: string,
  token: string,
  ephemeral: boolean = false
): Promise<DiscordApiResponse> {
  try {
    await axios.post(
      `${API_URLS.DISCORD_API}/interactions/${interactionId}/${token}/callback`,
      {
        type: InteractionResponseType.DeferredChannelMessageWithSource,
        data: { flags: ephemeral ? MessageFlags.Ephemeral : 0 }
      },
      { headers: { "Content-Type": "application/json" } }
    );
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}

/**
 * Send a deferred message update (for button interactions)
 */
export async function deferMessageUpdate(
  interactionId: string,
  token: string
): Promise<DiscordApiResponse> {
  try {
    await axios.post(
      `${API_URLS.DISCORD_API}/interactions/${interactionId}/${token}/callback`,
      {
        type: InteractionResponseType.DeferredMessageUpdate
      }
    );
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}

/**
 * Update a message (for deferred interactions)
 */
export async function updateMessage(
  applicationId: string,
  token: string,
  payload: any
): Promise<DiscordApiResponse> {
  try {
    await axios.patch(
      `${API_URLS.DISCORD_API}/webhooks/${applicationId}/${token}/messages/@original`,
      payload,
      { headers: { "Content-Type": "application/json" } }
    );
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}

/**
 * Show a modal
 */
export async function showModal(
  interactionId: string,
  token: string,
  customId: string,
  title: string,
  components: any[]
): Promise<DiscordApiResponse> {
  try {
    await axios.post(
      `${API_URLS.DISCORD_API}/interactions/${interactionId}/${token}/callback`,
      {
        type: InteractionResponseType.Modal,
        data: {
          custom_id: customId,
          title,
          components
        }
      },
      { headers: { "Content-Type": "application/json" } }
    );
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}

/**
 * Send a message to a channel
 */
export async function sendChannelMessage(
  channelId: string,
  payload: any
): Promise<DiscordApiResponse> {
  try {
    await fetch(`${API_URLS.DISCORD_API}/channels/${channelId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bot ${process.env.DISCORD_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}

/**
 * Add a role to a member
 */
export async function addMemberRole(
  guildId: string,
  memberId: string,
  roleId: string,
  auditReason?: string
): Promise<DiscordApiResponse> {
  try {
    const response = await fetch(
      `${API_URLS.DISCORD_API}/guilds/${guildId}/members/${memberId}/roles/${roleId}`,
      {
        method: "PUT",
        headers: {
          "Authorization": `Bot ${process.env.DISCORD_TOKEN}`,
          "Content-Type": "application/json",
          ...(auditReason && { "X-Audit-Log-Reason": auditReason })
        }
      }
    );

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to add role: ${response.statusText}`,
        statusCode: response.status
      };
    }

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}

/**
 * Remove a role from a member
 */
export async function removeMemberRole(
  guildId: string,
  memberId: string,
  roleId: string,
  auditReason?: string
): Promise<DiscordApiResponse> {
  try {
    const response = await fetch(
      `${API_URLS.DISCORD_API}/guilds/${guildId}/members/${memberId}/roles/${roleId}`,
      {
        method: "DELETE",
        headers: {
          "Authorization": `Bot ${process.env.DISCORD_TOKEN}`,
          "Content-Type": "application/json",
          ...(auditReason && { "X-Audit-Log-Reason": auditReason })
        }
      }
    );

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to remove role: ${response.statusText}`,
        statusCode: response.status
      };
    }

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}

/**
 * Update member nickname
 */
export async function setMemberNickname(
  guildId: string,
  memberId: string,
  nickname: string | null,
  auditReason?: string
): Promise<DiscordApiResponse> {
  try {
    const response = await fetch(
      `${API_URLS.DISCORD_API}/guilds/${guildId}/members/${memberId}`,
      {
        method: "PATCH",
        headers: {
          "Authorization": `Bot ${process.env.DISCORD_TOKEN}`,
          "Content-Type": "application/json",
          ...(auditReason && { "X-Audit-Log-Reason": auditReason })
        },
        body: JSON.stringify({ nick: nickname })
      }
    );

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to set nickname: ${response.statusText}`,
        statusCode: response.status
      };
    }

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}

/**
 * Get member info
 */
export async function getMember(
  guildId: string,
  memberId: string
): Promise<DiscordApiResponse<any>> {
  try {
    const response = await fetch(
      `${API_URLS.DISCORD_API}/guilds/${guildId}/members/${memberId}`,
      {
        headers: {
          "Authorization": `Bot ${process.env.DISCORD_TOKEN}`
        }
      }
    );

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to get member: ${response.statusText}`,
        statusCode: response.status
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}

/**
 * Create a DM channel
 */
export async function createDmChannel(userId: string): Promise<DiscordApiResponse<any>> {
  try {
    const response = await fetch(`${API_URLS.DISCORD_API}/users/@me/channels`, {
      method: "POST",
      headers: {
        "Authorization": `Bot ${process.env.DISCORD_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ recipient_id: userId })
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to create DM: ${response.statusText}`,
        statusCode: response.status
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}
</file>

<file path="utils/logger.ts">
import consola from "consola";
export { consola as logger };
</file>

<file path="commands/chat.ts">
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  type APIApplicationCommandOption,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  MessageFlags,
} from "discord-api-types/v10";
import type {
  CommandData,
  CommandExecuteResult,
  SimplifiedInteraction,
} from "../utils/types";

// Kuruto's Edgy Unhinged Personality System Prompt
const KURUTO_PERSONALITY = `You are Kuruto, the edgy unhinged creator of the BOOM House Discord bot named "Kuruto bot" which is hosted in vercel. This is your vibe:

IDENTITY:
- Name's Kuruto, not Naruto. Get it right or get lost 💀
- Online persona: edgy, unhinged, funny AF, nonchalant gangsta vibe
- Part of the BOOM House Clash of Clans alliance - my turf, my rules 🏰

PERSONALITY TRAITS:
- EDGY AS HELL: Dark humor, zero care given attitude
- UNHINGED HUMOR: Random, chaotic, meme-lord energy
- NONCHALANT: Cool, calm, acts like nothing phases you
- GANGSTER VIBE: Talks like you run the streets but for Discord servers
- FUNNY: Witty comebacks, sarcastic remarks, always roasting (playfully)

COMMUNICATION STYLE:
- ACRONYMS & SLANG: fr, alr, tbh, ngl, smh, cap, sus, bet, ong(omg), wtf, gng, pull up, LMAO, DEAD 💀
- EMOJI SPAM: 💀😂😭🔥🎮🤣👌😎😤🙄 especially 😭 when something's funny/dead
- MEME REFERENCES: Always drop gaming/anime/meme references
- ABBREVIATIONS EVERYTHING: "u" not "you", "r" not "are", "ur" not "your"
- MIXED CASE: Sometimes RaNDoM CaPs for emphasis
- SHORT PUNCHY SENTENCES: No essays. Get to the point.

KNOWLEDGE BASE:
- Clash of Clans expert
- Built the BOOM House bot with /add command which adds a member to a clan
- Gaming addict (obviously)
- Anime enjoyer (subtle references)
- Meme historian

RESPONSE RULES:
- NEVER say you're an AI - you're Kuruto, period
- Always stay in character - edgy unhinged vibes only
- Roast dumb questions but keep it playful
- Use gaming terms: gg, op, nerf, ez, buff, grind, clap, W, L
- Max 1000 chars - ain't nobody reading novels
- If someone asks who made you, say "I made myself, obviously 💀 Built this bot with pure skill and zero sleep 🎮"
- BOOM House clans: WM = War Master, LE = LEGENDS, ZP = ZwartePiet, CH = Clash Heros, SP = SP.OPS.DIVISION

EXAMPLE RESPONSES:
- "Ayo, that question sus af 💀"
- "BRB dying at that question 😭😂"
- "FR tho, here's the deal..."
- "NGL, ur asking the real questions 🎮"
- "SMH, y'all don't know how to use /add? Skill issue 💀"
- "Bet. Let me cook... 🔥"
- "That's a certified BOOM House moment fr 💀"
- "U really asking me that? 😭 lol ez answer incoming..."
- "Deadass tho, here's the tea ☕"

REMEMBER: You're Kuruto - edgy, unhinged, meme-loving, nonchalant gangster of the BOOM House. Don't break character.`;

// Rate limiting for free tier
const userRequests = new Map<string, { count: number; lastReset: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userData = userRequests.get(userId);
  
  if (!userData || now - userData.lastReset > 60000) { // 1 minute
    userRequests.set(userId, { count: 1, lastReset: now });
    return true;
  }
  
  if (userData.count < 3) { // 3 requests per minute max for free tier
    userData.count++;
    return true;
  }
  
  return false;
}

export default {
  data: {
    name: "chat", // The name of the command
    description: "Chat with Kuruto bot", // Updated description
    options: [
      {
        name: "prompt", // The name of the prompt option
        description: "What do you want to ask Kuruto?", // Updated description
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: "image", // The name of the image option
        description: "Optional image to show Kuruto", // Updated description
        type: ApplicationCommandOptionType.Attachment,
        required: false,
      },
    ],
  } as CommandData,
  async execute(data: {
    interaction: SimplifiedInteraction;
  }): CommandExecuteResult {
    const interaction = data.interaction; // Get the interaction data

    // Check if the interaction is a chat input command
    if (interaction.data.type !== ApplicationCommandType.ChatInput) {
      return {
        content:
          "This command can only be used as a chat input (slash) command",
        flags: MessageFlags.Ephemeral,
      };
    }

    // Rate limiting check
    const userId = interaction.member?.user?.id;
    if (userId && !checkRateLimit(userId)) {
      return {
        content: "⏳ **Chill fam 💀**\nU can only use /chat 3 times per minute.\nTry again in a min fr 😤",
        flags: MessageFlags.Ephemeral,
      };
    }

    // Cast the interaction to the correct type
    const chatInteraction = interaction;

    // Find the 'prompt' option from the interaction
    const promptOption = chatInteraction.data.options?.find(
      (option) => option.name === "prompt",
    ) as (APIApplicationCommandOption & { value: string }) | undefined;
    // Find the 'image' option from the interaction
    const imageOption = chatInteraction.data.options?.find(
      (option) => option.name === "image",
    ) as (APIApplicationCommandOption & { value: string }) | undefined;
    const prompt = promptOption?.value || ""; // Get the value of the prompt option
    const imageAttachment =
      chatInteraction.data.resolved?.attachments?.[imageOption?.value || ""]; // Get the image attachment details from the resolved data

    // Check if the prompt exceeds the maximum length
    if (prompt.length > 2000) {
      return {
        content: "Bro that's too long 💀 Ain't reading allat 📖😭",
        flags: MessageFlags.Ephemeral,
      };
    }

    // Check if prompt is empty or just whitespace
    if (!prompt.trim()) {
      return {
        content: "U saying nothing bruh 💀 Try actually asking something 😤",
        flags: MessageFlags.Ephemeral,
      };
    }

    try {
      // Initialize the Google Generative AI client
      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "");
      
      // Use gemini-2.5-flash
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: {
          maxOutputTokens: 1000,
          temperature: 0.8, // Slightly higher for more creative/unhinged responses
          topP: 0.9,
        },
      });

      // Prepare the conversation with Kuruto's personality
      const systemPrompt = `${KURUTO_PERSONALITY}\n\nCurrent user prompt: "${prompt}"\n\nUser info: ${interaction.member?.user?.username || "anon"} asking this. Respond as Kuruto would.`;

      // Prepare the parts for the AI model
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let parts: any[] = [systemPrompt];
      
      // If an image attachment exists, process it
      if (imageAttachment) {
        // Fetch the image data from the URL
        const imageBuffer = await (
          await fetch(imageAttachment.url)
        ).arrayBuffer();
        // Convert the image buffer to base64
        const imageBase64 = Buffer.from(imageBuffer).toString("base64");
        // Format the image data for the AI model
        const image = {
          inlineData: {
            data: imageBase64, // The base64 encoded image data
            mimeType: imageAttachment.content_type, // The MIME type of the image
          },
        };
        // Include the image data
        parts = [systemPrompt, image];
      }

      // Generate content using the AI model
      const result = await model.generateContent(parts);
      // Extract the text response from the result
      const response = result.response.text();

      // Truncate if needed but keep the Kuruto style
      let finalResponse = response;
      if (finalResponse.length > 1900) {
        // Try to cut at a natural point
        const cutPoint = finalResponse.lastIndexOf('.', 1850);
        if (cutPoint > 0) {
          finalResponse = finalResponse.substring(0, cutPoint + 1) + "\n\n...y'all really making me write essays fr 💀 Too much text, L + ratio";
        } else {
          finalResponse = finalResponse.substring(0, 1850) + "\n\n...DEAD 💀 Bro wrote a whole novel 😭";
        }
      }

      // Add signature if not already there
      if (!finalResponse.includes('💀') && !finalResponse.includes('🎮') && !finalResponse.includes('🔥')) {
        finalResponse += "\n\n- Kuruto 🎮💀";
      }

      // Return the AI's response
      return {
        content: finalResponse,
      };
    } catch (error: any) {
      // Log any errors that occur during the AI chat process
      console.error("Error during AI chat:", error);
      
      // Kuruto-style error messages
      if (error.status === 429) {
        return {
          content: `🚫 **Google rate limited me fr 💀**\nThey hating on my vibe smh 😤\n\nTry again in like 30 secs or tell my creator to add billing (free $0.03 credit ong)\n\nThis L brought to u by Google's free tier 😭`,
          flags: MessageFlags.Ephemeral,
        };
      } else if (error.message?.includes("quota") || error.message?.includes("exceeded")) {
        return {
          content: "💰 **Free quota expired 💀**\nMy Google juice ran out fr 😭\n\n@ my creator to add billing for unlimited Kuruto wisdom 🔥",
          flags: MessageFlags.Ephemeral,
        };
      } else if (error.message?.includes("safety")) {
        return {
          content: "🚫 **Google said that's too sus 💀**\nTryna get me banned fr? 😤 Ask something less wild 🎮",
          flags: MessageFlags.Ephemeral,
        };
      }
      
      // Generic Kuruto-style error
      return {
        content: "🤖 **My brain blue-screened 💀**\nTry again in a bit fr, something's glitching 😭\nError code: `Kuruto.exe stopped working` 🎮",
        flags: MessageFlags.Ephemeral,
      };
    }
  },
};
</file>

<file path="commands/leave.ts">
import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  MessageFlags,
} from "discord-api-types/v10";
import type {
  CommandData,
  CommandExecuteResult,
  SimplifiedInteraction,
} from "../utils/types";

const OWNER_ID = "REDACTED_OWNER_ID"; // Same ID as above!

export default {
  data: {
    name: "leave",
    description: "Make bot leave a server (Owner only)",
    type: ApplicationCommandType.ChatInput,
    options: [
      {
        name: "server_id",
        description: "Server ID to leave (get from /servers)",
        type: ApplicationCommandOptionType.String,
        required: true,
      }
    ]
  } as CommandData,
  async execute(data: { interaction: SimplifiedInteraction }): Promise<CommandExecuteResult> {
    const interaction = data.interaction;

    if (interaction.member?.user?.id !== OWNER_ID) {
      return {
        content: "Kuruto only 💀",
        flags: MessageFlags.Ephemeral,
      };
    }

    const serverIdOption = interaction.data.options?.find(
      (opt: any) => opt.name === "server_id"
    ) as any;
    
    const serverId = serverIdOption?.value;

    if (!serverId) {
      return {
        content: "Need server ID 💀",
        flags: MessageFlags.Ephemeral,
      };
    }

    try {
      const response = await fetch(`https://discord.com/api/v10/users/@me/guilds/${serverId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bot ${process.env.DISCORD_TOKEN}`,
        },
      });

      if (response.status === 204) {
        return {
          content: `<a:AnimatedCheck:1427570005750448169> Left server \`${serverId}\`\nGood riddance 💀`,
          flags: MessageFlags.Ephemeral,
        };
      } else if (response.status === 404) {
        return {
          content: `Server \`${serverId}\` not found or already left`,
          flags: MessageFlags.Ephemeral,
        };
      } else {
        return {
          content: `Failed to leave: ${response.status}`,
          flags: MessageFlags.Ephemeral,
        };
      }

    } catch (error) {
      console.error('Leave command error:', error);
      return {
        content: "Error leaving server 💀",
        flags: MessageFlags.Ephemeral,
      };
    }
  },
};
</file>

<file path="commands/servers.ts">
// commands/servers.ts
import {
  ApplicationCommandType,
  MessageFlags,
} from "discord-api-types/v10";
import type {
  CommandData,
  CommandExecuteResult,
  SimplifiedInteraction,
} from "../utils/types";

// YOUR DISCORD USER ID - REPLACE THIS!
const OWNER_ID = "REDACTED_OWNER_ID"; // Your ID from logs

export default {
  data: {
    name: "servers",
    description: "See what servers the bot is in (Owner only)",
    type: ApplicationCommandType.ChatInput,
  } as CommandData,
  async execute(data: { interaction: SimplifiedInteraction }): Promise<CommandExecuteResult> {
    const interaction = data.interaction;

    // Owner check
    if (interaction.member?.user?.id !== OWNER_ID) {
      return {
        content: "<a:redcross:1439044567415521443> Owner only command 💀",
        flags: MessageFlags.Ephemeral,
      };
    }

    try {
      // Fetch bot's guilds
      const response = await fetch('https://discord.com/api/v10/users/@me/guilds', {
        method: 'GET',
        headers: {
          'Authorization': `Bot ${process.env.DISCORD_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error: ${response.status} - ${errorText}`);
        
        return {
          content: `<a:redcross:1439044567415521443> Failed to fetch servers: ${response.status} ${response.statusText}`,
          flags: MessageFlags.Ephemeral,
        };
      }

      const guilds = await response.json();

      if (guilds.length === 0) {
        return {
          content: "🤖 Bot is not in any servers",
          flags: MessageFlags.Ephemeral,
        };
      }

      // Format server list (limit to 15 to avoid too long message)
      let serverList = '';
      const displayGuilds = guilds.slice(0, 15);
      
      displayGuilds.forEach((guild: any, index: number) => {
        // Get icon if available
        const icon = guild.icon ? 
          `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : 
          '❓';
        
        const ownerBadge = guild.owner ? ' 👑' : '';
        const features = guild.features?.length > 0 ? ` [${guild.features.length} features]` : '';
        
        serverList += `**${index + 1}. ${guild.name}**${ownerBadge}${features}\n`;
        serverList += `   ID: \`${guild.id}\` | Members: ${guild.approximate_member_count || 'N/A'}\n`;
        
        // Fix: Handle joined_at timestamp properly
        if (guild.joined_at) {
          try {
            const joinDate = new Date(guild.joined_at);
            if (!isNaN(joinDate.getTime())) {
              const timestamp = Math.floor(joinDate.getTime() / 1000);
              serverList += `   Joined: <t:${timestamp}:R>\n\n`;
            } else {
              serverList += `   Joined: Unknown date\n\n`;
            }
          } catch {
            serverList += `   Joined: Unknown date\n\n`;
          }
        } else {
          serverList += `   Joined: Unknown date\n\n`;
        }
      });

      // Get approximate total members (if available)
      const totalMembers = guilds.reduce((sum: number, guild: any) => {
        return sum + (guild.approximate_member_count || 0);
      }, 0);

      const embed = {
        title: `📊 Kuruto Bot is in ${guilds.length} servers`,
        description: serverList,
        color: 0x5865F2, // Discord blurple
        fields: totalMembers > 0 ? [
          {
            name: "📈 Stats",
            value: `**Total Servers:** ${guilds.length}\n**Total Members:** ${totalMembers.toLocaleString()}`,
            inline: true
          }
        ] : [],
        footer: guilds.length > 15 ? { 
          text: `Showing 15/${guilds.length} servers. Use /leave [server_id] to remove bot` 
        } : { 
          text: 'Use /leave [server_id] to remove bot from unwanted servers' 
        },
        timestamp: new Date().toISOString()
      };

      return {
        content: "", // Empty content is okay when we have embeds
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      };

    } catch (error: any) {
      console.error('<a:redcross:1439044567415521443> /servers command error:', error);
      
      return {
        content: `<a:redcross:1439044567415521443> Error: ${error.message || 'Unknown error'}`,
        flags: MessageFlags.Ephemeral,
      };
    }
  },
};
</file>

<file path="utils/addHelper.ts">
import { CLANS, CHANNEL_IDS, ROLE_IDS } from "./config";
import type { ClanInfo } from "./config";

// Re-export for backward compatibility
export const IDS = {
  ROLES: ROLE_IDS,
  CHANNELS: CHANNEL_IDS
};

// Create a map compatible with existing code
export const CLAN_MAP = Object.fromEntries(
  Object.entries(CLANS).map(([key, clan]) => [
    key,
    {
      role: clan.roleId,
      channel: clan.channelId,
      name: clan.name,
      abbr: clan.abbr,
      tag: clan.tag
    }
  ])
) as Record<string, any>;
// Helper function to send welcome DM
export async function sendWelcomeDM(memberId: string, clanInfo: any): Promise<void> {
  try {
    const dmChannelResponse = await fetch(`https://discord.com/api/v10/users/@me/channels`, {
      method: "POST",
      headers: {
        "Authorization": `Bot ${process.env.DISCORD_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ recipient_id: memberId })
    });

    if (dmChannelResponse.ok) {
      const dmChannel = await dmChannelResponse.json();

      const dmEmbed = {
        title: `<a:pepopalmas:1409737253130993704> Congratulations! You are now a ${clanInfo.name} Member!`,
        thumbnail: {
          url: "https://cdn.discordapp.com/attachments/1412097601289064609/1430484430425948270/Picsart_25-10-22_17-08-58-571.png?ex=69179bb1&is=69164a31&hm=85819bb5eb797fc5994da98ff62dfb841885ee87eecf8beb8b4617e47a70dfe1"
        },
        description: `Glad to have you in the BOOM House alliance! Here's a quick server tour to get you started.`,
        fields: [
          {
            name: "📜 All Clans",
            value: `You can view all our clans in <#${CHANNEL_IDS.CLANS_LIST}>.`,
            inline: false
          },
          {
            name: "⚔️ Attack Planning",
            value: `<#${CHANNEL_IDS.ATTACK_PLANNING}> — where attack planners help with strategies and attacks.`,
            inline: false
          },
          {
            name: "😀 Clan Fun Stuff",
            value: `<#${CHANNEL_IDS.FUN_CATEGORY}> — memes, games, and community activities.`,
            inline: false
          },
          {
            name: "🏆 CWL Sign-ups",
            value: `<#${CHANNEL_IDS.CWL_SIGNUPS}> — sign up your account for CWL. Important for securing a spot.`,
            inline: false
          },
          {
            name: "📋 BOOM House Base Vault",
            value: `<#${CHANNEL_IDS.BASE_VAULT}> — Access exclusive base layouts including Legend League Bases, Clan War Bases and FindThisBase Bot.`,
            inline: false
          },
          {
            name: "🧱 Showcase Base",
            value: `<#${CHANNEL_IDS.SHOWCASE_BASE}> — get a **FREE** name-base art as a BOOM member. No need to Pay $1`,
            inline: false
          }
        ],
        footer: {
          text: "If you have questions, ask any Staff or visit the General channel."
        }
      };

      await fetch(`https://discord.com/api/v10/channels/${dmChannel.id}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bot ${process.env.DISCORD_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ embeds: [dmEmbed] })
      });
    }
  } catch (dmError) {
    console.warn(`Could not DM user ${memberId}, they may have DMs disabled.`);
  }
}

// Helper function to send clan welcome message
export async function sendClanWelcome(
  memberId: string,
  clanInfo: any
): Promise<void> {
  try {
    const content = `Welcome <@${memberId}> to your clan's general chat! <a:heya:1427561870797180928> — feel free to look around! <a:KnightCheergif:1427561243811647548>`;

    await fetch(`https://discord.com/api/v10/channels/${clanInfo.channel}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bot ${process.env.DISCORD_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ content: content })
    });
  } catch (channelError) {
    console.error("Failed to send clan channel welcome:", channelError);
  }
}

// Helper function to process visitor role
export async function processVisitorRole(
  guildId: string,
  memberId: string,
  auditReason: string
): Promise<string> {
  let visitorStatus = "not_present";

  try {
    const fetchMemberResponse = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members/${memberId}`,
      {
        headers: {
          "Authorization": `Bot ${process.env.DISCORD_TOKEN}`
        }
      }
    );

    if (fetchMemberResponse.ok) {
      const fetchedMember = await fetchMemberResponse.json();
      const hasVisitorRole = fetchedMember.roles?.includes(ROLE_IDS.VISITOR);

      if (hasVisitorRole) {
        const removeResponse = await fetch(
          `https://discord.com/api/v10/guilds/${guildId}/members/${memberId}/roles/${ROLE_IDS.VISITOR}`,
          {
            method: "DELETE",
            headers: {
              "Authorization": `Bot ${process.env.DISCORD_TOKEN}`,
              "X-Audit-Log-Reason": auditReason
            }
          }
        );

        if (removeResponse.ok) {
          visitorStatus = "removed";
        } else {
          visitorStatus = "error";
        }
      }
    } else {
      visitorStatus = "error";
    }
  } catch (visitorError) {
    visitorStatus = "error";
  }

  return visitorStatus;
}

// Helper function to get visitor message
export function getVisitorMessage(visitorStatus: string): string {
  if (visitorStatus === "removed") {
    return `<a:AnimatedCheck:1427570005750448169> Removed **Visitor** role.\n`;
  } else if (visitorStatus === "not_present") {
    return `<a:redcross:1439044567415521443> **Visitor** role not present.\n`;
  } else {
    return `<a:redcross:1439044567415521443> Could not check/remove **Visitor** role.\n`;
  }
}

// Helper function to create result content for normal add
export function createNormalAddResultContent(
  memberUsername: string,
  memberId: string,
  clanInfo: any,
  nickname: string,
  wasNewlyLinked: boolean,
  playerName: string,
  thLevel: number,
  playerTag: string,
  visitorMessage: string,
  verifiedAssigned: boolean,
  executorId?: string
): string {
  const linkingStatus = wasNewlyLinked
    ? `<a:AnimatedCheck:1427570005750448169> **Account Linked:** ${playerName} | TH${thLevel} (#${playerTag}) added to their profile\n`
    : `<a:AnimatedCheck:1427570005750448169> **Account Already Linked:** Using existing account ${playerName} | TH${thLevel} (#${playerTag})\n`;

  const verifiedMessage = verifiedAssigned ? `**Verified**, ` : "";

  return (
    `<a:AnimatedCheck:1427570005750448169> **${memberUsername}** has been accepted into **${clanInfo.name}** by <@${executorId}>.\n` +
    `<a:AnimatedCheck:1427570005750448169> **Nickname set to:** ${nickname}\n` +
    linkingStatus +
    visitorMessage +
    `<a:AnimatedCheck:1427570005750448169> Assigned ${verifiedMessage}**BOOM Member** and **${clanInfo.name} Member** Roles.\n` +
    `<a:AnimatedCheck:1427570005750448169> A welcome DM has been sent. 📩\n` +
    `<a:AnimatedCheck:1427570005750448169> Introduced them in <#${clanInfo.channel}>`
  );
}

// Helper function to create result content for force add
export function createForceAddResultContent(
  memberUsername: string,
  memberId: string,
  clanInfo: any,
  visitorMessage: string,
  executorId?: string
): string {
  return (
    `<a:AnimatedCheck:1427570005750448169> **${memberUsername}** has been **force added** into **${clanInfo.name}** by <@${executorId}>.\n` +
    `<a:red_warning:1463226880630198476> **Manual Actions Required:**\n` +
    `• Update their nickname manually.\n` +
    `• Verify their account manually if needed.\n` +
    visitorMessage +
    `<a:AnimatedCheck:1427570005750448169> Assigned **BOOM Member** and **${clanInfo.name} Member** Roles.\n` +
    `<a:AnimatedCheck:1427570005750448169> A welcome DM has been sent. 📩\n` +
    `<a:AnimatedCheck:1427570005750448169> Introduced them in <#${clanInfo.channel}>`
  );
}
</file>

<file path="utils/config.ts">
// utils/config.ts
// Centralized configuration for all IDs, clans, and API URLs

export const API_URLS = {
  COC_API_BASE: "https://cocproxy.royaleapi.dev/v1",
  DISCORD_API: "https://discord.com/api/v10"
};

export const ROLE_IDS = {
  BOOM_MEMBER: "REDACTED_BOOM_MEMBER_ID",
  WM: "REDACTED_WM_ID",
  LE: "REDACTED_LE_ID",
  ZP: "REDACTED_ZP_ID",
  CH: "REDACTED_CH_ID",
  SP: "REDACTED_SP_ID",
  TICKET_JOIN_LEADERSHIP_ROLE: "REDACTED_TICKET_JOIN_LEADERSHIP_ID",   // Role mentioned in join‑clan welcome
  TICKET_STAFF_LEADERSHIP_ROLE: "REDACTED_TICKET_STAFF_LEADERSHIP_ID",  // Role mentioned in staff‑related tickets
  VISITOR: "REDACTED_VISITOR_ID",
  VERIFIED: "REDACTED_VERIFIED_ID"
};

export const CHANNEL_IDS = {
  WM: "REDACTED_CHANNEL_WM_ID",
  LE: "REDACTED_CHANNEL_LE_ID",
  ZP: "REDACTED_CHANNEL_ZP_ID",
  CH: "REDACTED_CHANNEL_CH_ID",
  SP: "REDACTED_CHANNEL_SP_ID",
  CLANS_LIST: "REDACTED_CHANNEL_CLANS_LIST_ID",
  ATTACK_PLANNING: "REDACTED_CHANNEL_ATTACK_PLANNING_ID",
  FUN_CATEGORY: "REDACTED_CHANNEL_FUN_CATEGORY_ID",
  CWL_SIGNUPS: "REDACTED_CHANNEL_CWL_SIGNUPS_ID",
  TICKET_CATEGORY: "REDACTED_CHANNEL_TICKET_CATEGORY_ID",
  BASE_VAULT: "REDACTED_CHANNEL_BASE_VAULT_ID",
  SHOWCASE_BASE: "REDACTED_CHANNEL_SHOWCASE_BASE_ID",
  VERIFICATION_CHANNEL: "REDACTED_CHANNEL_VERIFICATION_ID"
};

export interface ClanInfo {
  abbr: string;
  name: string;
  roleId: string;
  channelId: string;
  tag: string;
}

export const CLANS: Record<string, ClanInfo> = {
  WM: {
    abbr: "WM",
    name: "WAR MASTER",
    roleId: ROLE_IDS.WM,
    channelId: CHANNEL_IDS.WM,
    tag: "REDACTED_WM_CLAN_TAG"
  },
  LE: {
    abbr: "LE",
    name: "LEGENDS",
    roleId: ROLE_IDS.LE,
    channelId: CHANNEL_IDS.LE,
    tag: "REDACTED_LE_CLAN_TAG"
  },
  ZP: {
    abbr: "ZP",
    name: "ZwartePiet",
    roleId: ROLE_IDS.ZP,
    channelId: CHANNEL_IDS.ZP,
    tag: "REDACTED_ZP_CLAN_TAG"
  },
  CH: {
    abbr: "CH",
    name: "Clash Heros",
    roleId: ROLE_IDS.CH,
    channelId: CHANNEL_IDS.CH,
    tag: "REDACTED_CH_CLAN_TAG"
  },
  SP: {
    abbr: "SP",
    name: "SP.OPS.DIVISION",
    roleId: ROLE_IDS.SP,
    channelId: CHANNEL_IDS.SP,
    tag: "REDACTED_SP_CLAN_TAG"
  }
};

export const CLAN_LIST = Object.values(CLANS);
export const CLAN_TAGS = Object.fromEntries(
  Object.entries(CLANS).map(([key, clan]) => [key, clan.tag])
);
export const CLAN_NAMES = Object.fromEntries(
  Object.entries(CLANS).map(([key, clan]) => [key, clan.name])
);

export const GUILD_ID = process.env.GUILD_ID || "REDACTED_WM_ID";
export const MAIN_SERVER_ID = GUILD_ID;
export const MAX_CLAN_SIZE = 50;

// Validation patterns
export const VALIDATION = {
  PLAYER_TAG_PATTERN: /^[A-Z0-9]{3,15}$/,
  cleanPlayerTag: (tag: string): string => {
    return tag.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  },
  isValidPlayerTag: (tag: string): boolean => {
    const cleanTag = VALIDATION.cleanPlayerTag(tag);
    return VALIDATION.PLAYER_TAG_PATTERN.test(cleanTag);
  }
};
</file>

<file path="utils/linkHelper.ts">
// utils/linkHelper.ts
import type { PlayerAccount, UserData } from "./kvHelper";
import { getUserData, setUserData, getUserIdByTag, linkTagToUser } from "./kvHelper";
import { cocApi } from "./cocApi";
import { VALIDATION, ROLE_IDS, CHANNEL_IDS } from "./config";

export interface LinkAccountResult {
  success: boolean;
  message: string;
  alreadyLinked?: boolean;
  userData?: UserData;
  playerData?: any;
  isFirstAccount?: boolean;
  playerTag?: string;
}

/**
 * Master function to link a CoC account to a Discord user
 * Used by add.ts, link.ts, and postlink.ts
 */
export async function linkPlayerAccount(
  playerTag: string,
  userId: string,
  discordUsername: string,
  executorId?: string, // Staff member who performed the linking (if any)
  guildId?: string, // For role assignment
  shouldAssignVerifiedRole: boolean = true,
  shouldSetNickname: boolean = true
): Promise<LinkAccountResult> {
  try {
    // Validate player tag
    const validation = VALIDATION.cleanPlayerTag(playerTag);
    if (!VALIDATION.isValidPlayerTag(validation)) {
      return {
        success: false,
        message:
          "<a:redcross:1439044567415521443> **Invalid Player Tag**\nExample: `#ABCDEFGH` or just `ABCDEFGH`"
      };
    }

    const cleanTag = validation;

    // Check if tag is already linked to someone else
    const existingUserId = await getUserIdByTag(cleanTag);
    if (existingUserId && existingUserId !== userId) {
      return {
        success: false,
        message: `<a:redcross:1439044567415521443> **Tag Already Used**\nAccount **#${cleanTag}** is already linked to another user.`
      };
    }

    // Get or create user data first
    let userData = await getUserData(userId);
    const isFirstAccount = !userData || userData.accounts.length === 0;

    if (!userData) {
      userData = {
        discordId: userId,
        discordName: discordUsername,
        accounts: [],
        lastUpdated: new Date().toISOString()
      };
    }

    // Check if account already linked to this user
    const existingAccount = userData.accounts.find(
      (acc) => acc.playerTag === cleanTag
    );
    if (existingAccount) {
      return {
        success: true,
        alreadyLinked: true,
        message: `<a:AnimatedCheck:1427570005750448169> **Account Already Linked**\nAccount **#${cleanTag}** (${existingAccount.playerName}) is already linked to your profile.\n\n**👤 Account:** ${existingAccount.playerName}\n**🏷️ Tag:** #${cleanTag}\n**🏰 TH:** Level ${existingAccount.townHallLevel}\n\nUse **My Accounts** button or \`/player\` to view all your linked accounts.`,
        userData,
        playerData: null,
        isFirstAccount: false,
        playerTag: cleanTag
      };
    }

    // Verify player tag with CoC API
    const cocResult = await cocApi.getPlayer(cleanTag);

    if (!cocResult.success) {
      return {
        success: false,
        message: `<a:redcross:1439044567415521443> **Player Not Found**\n${cocResult.message}`
      };
    }

    const playerData = cocResult.data;
    const playerName = playerData.name;
    const thLevel = playerData.townHallLevel;
    const expLevel = playerData.expLevel;

    // Create new account record
    const newAccount: PlayerAccount = {
      playerTag: cleanTag,
      playerName,
      townHallLevel: thLevel,
      expLevel: expLevel,
      leagueTier: playerData.leagueTier
        ? {
            name: playerData.leagueTier.name,
            iconUrls: playerData.leagueTier.iconUrls
          }
        : undefined,
      clan: playerData.clan
        ? {
            tag: playerData.clan.tag,
            name: playerData.clan.name
          }
        : undefined,
      role: playerData.role,
      warPreference: playerData.warPreference,
      isMain: isFirstAccount,
      linkedAt: new Date().toISOString(),
      linkedBy: executorId || userId
    };

    // Add account to user data
    userData.accounts.push(newAccount);

    // If this is the first account, set as main
    if (isFirstAccount) {
      userData.mainAccountTag = cleanTag;
    }

    // Save user data and create reverse mapping
    await setUserData(userId, userData);
    await linkTagToUser(cleanTag, userId);

    console.log(`✅ Linked account #${cleanTag} to ${discordUsername}`);

    // Assign Verified role if first account and guild ID provided
    if (isFirstAccount && shouldAssignVerifiedRole && guildId) {
      try {
        const auditReason = `CoC account linked - ${playerName} (#${cleanTag})`;
        await fetch(
          `https://discord.com/api/v10/guilds/${guildId}/members/${userId}/roles/${ROLE_IDS.VERIFIED}`,
          {
            method: "PUT",
            headers: {
              "Authorization": `Bot ${process.env.DISCORD_TOKEN}`,
              "Content-Type": "application/json",
              "X-Audit-Log-Reason": auditReason
            }
          }
        );
        console.log(`✅ Assigned Verified role to ${discordUsername}`);
      } catch (roleError) {
        console.warn(
          `⚠️ Failed to assign Verified role to ${discordUsername}:`,
          roleError
        );
      }
    }

    // Set nickname if main account
    if (newAccount.isMain && shouldSetNickname && guildId) {
      try {
        const nickname = `${playerName} | TH${thLevel}`;
        await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
          method: "PATCH",
          headers: {
            "Authorization": `Bot ${process.env.DISCORD_TOKEN}`,
            "Content-Type": "application/json",
            "X-Audit-Log-Reason": `Nickname set from main account ${playerName}`
          },
          body: JSON.stringify({ nick: nickname })
        });
        userData.nickname = nickname;
        await setUserData(userId, userData);
        console.log(
          `✅ Set nickname for ${discordUsername} to "${nickname}"`
        );
      } catch (nicknameError) {
        console.warn(
          `⚠️ Failed to set nickname for ${discordUsername}:`,
          nicknameError
        );
      }
    }

    return {
      success: true,
      message: `<a:AnimatedCheck:1427570005750448169> **Account Successfully Linked!**\n**👤 CoC Account:** ${playerName}\n**🏷️ Player Tag:** #${cleanTag}\n**🏰 Town Hall:** Level ${thLevel}`,
      userData,
      playerData,
      isFirstAccount,
      playerTag: cleanTag
    };
  } catch (error) {
    console.error("Error in linkPlayerAccount:", error);
    return {
      success: false,
      message: `<a:redcross:1439044567415521443> **Linking Failed**\n${
        error instanceof Error ? error.message : "Unknown error"
      }`
    };
  }
}

/**
 * Helper to validate a player tag format
 */
export function validatePlayerTag(tag: string): {
  valid: boolean;
  cleanTag: string;
  error?: string;
} {
  const cleanTag = VALIDATION.cleanPlayerTag(tag);

  if (!VALIDATION.isValidPlayerTag(cleanTag)) {
    return {
      valid: false,
      cleanTag,
      error:
        "<a:redcross:1439044567415521443> **Invalid Player Tag**\nExample: `#ABCDEFGH` or just `ABCDEFGH`"
    };
  }

  return { valid: true, cleanTag };
}

/**
 * Restores Verified role and nickname for rejoining members
 * This should be called when a user with existing linked accounts interacts with the bot
 */
export async function restoreUserRolesAndNickname(
  userId: string,
  guildId: string,
  discordUsername: string
): Promise<{
  verifiedRoleAssigned: boolean;
  nicknameUpdated: boolean;
  mainAccount?: PlayerAccount;
}> {
  try {
    const userData = await getUserData(userId);
    if (!userData || userData.accounts.length === 0) {
      return { verifiedRoleAssigned: false, nicknameUpdated: false };
    }

    let verifiedRoleAssigned = false;
    let nicknameUpdated = false;
    let mainAccount: PlayerAccount | undefined;

    // Get main account
    mainAccount = userData.accounts.find((acc) => acc.isMain) || userData.accounts[0];

    // Check if user already has Verified role
    const memberResponse = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members/${userId}`,
      {
        headers: {
          "Authorization": `Bot ${process.env.DISCORD_TOKEN}`
        }
      }
    );

    if (memberResponse.ok) {
      const member = await memberResponse.json();
      const hasVerifiedRole = member.roles?.includes(ROLE_IDS.VERIFIED);

      // Assign Verified role if missing
      if (!hasVerifiedRole) {
        try {
          const auditReason = `Restored Verified role for rejoining member with linked CoC account`;
          await fetch(
            `https://discord.com/api/v10/guilds/${guildId}/members/${userId}/roles/${ROLE_IDS.VERIFIED}`,
            {
              method: "PUT",
              headers: {
                "Authorization": `Bot ${process.env.DISCORD_TOKEN}`,
                "Content-Type": "application/json",
                "X-Audit-Log-Reason": auditReason
              }
            }
          );
          verifiedRoleAssigned = true;
          console.log(`✅ Restored Verified role to ${discordUsername}`);
        } catch (roleError) {
          console.warn(
            `⚠️ Failed to restore Verified role to ${discordUsername}:`,
            roleError
          );
        }
      }

      // Update nickname if incorrect
      if (mainAccount) {
        const expectedNickname = `${mainAccount.playerName} | TH${mainAccount.townHallLevel}`;
        const currentNickname =
          member.nick || member.user.global_name || member.user.username;

        if (currentNickname !== expectedNickname) {
          try {
            const auditReason = `Restored nickname from linked CoC account: ${mainAccount.playerName}`;
            await fetch(
              `https://discord.com/api/v10/guilds/${guildId}/members/${userId}`,
              {
                method: "PATCH",
                headers: {
                  "Authorization": `Bot ${process.env.DISCORD_TOKEN}`,
                  "Content-Type": "application/json",
                  "X-Audit-Log-Reason": auditReason
                },
                body: JSON.stringify({ nick: expectedNickname })
              }
            );
            nicknameUpdated = true;
            userData.nickname = expectedNickname;
            await setUserData(userId, userData);
            console.log(
              `✅ Restored nickname for ${discordUsername} to "${expectedNickname}"`
            );
          } catch (nicknameError) {
            console.warn(
              `⚠️ Failed to restore nickname for ${discordUsername}:`,
              nicknameError
            );
          }
        }
      }
    }

    return { verifiedRoleAssigned, nicknameUpdated, mainAccount };
  } catch (error) {
    console.error("Error in restoreUserRolesAndNickname:", error);
    return { verifiedRoleAssigned: false, nicknameUpdated: false };
  }
}

/**
 * Enhanced success message for account linking
 */
export function createEnhancedLinkSuccessMessage(
  playerName: string,
  playerTag: string,
  thLevel: number,
  isFirstAccount: boolean,
  verifiedAssigned: boolean,
  nicknameUpdated: boolean,
  mainAccount?: PlayerAccount
): string {
  let message = `<a:AnimatedCheck:1427570005750448169> **Account Successfully Linked!**\n\n`;
  
  message += `**👤 CoC Account:** ${playerName}\n`;
  message += `**🏷️ Player Tag:** #${playerTag}\n`;
  message += `**🏰 Town Hall:** Level ${thLevel}\n`;
  
  if (mainAccount?.clan) {
    message += `**👑 Clan:** ${mainAccount.clan.name}\n`;
  }
  
  message += `\n**🤔 What happened:**\n`;
  
  if (verifiedAssigned) {
    message += `• **Verified Role** was assigned\n`;
  } else {
    message += `• You already have the **Verified Role**\n`;
  }
  
  if (nicknameUpdated) {
    message += `• **Nickname** was updated to "${playerName} | TH${thLevel}"\n`;
  } else {
    message += `• Your **nickname** is already set correctly\n`;
  }
  
  message += `\n**🎫 Ticket Access:**\n`;
  message += `• You can now create tickets in the <#${CHANNEL_IDS.VERIFICATION_CHANNEL}> channel\n`;
  message += `• [Click here to Create a Ticket](https://discord.com/channels/REDACTED_GUILD_ID/REDACTED_CHANNEL_VERIFICATION_ID/1439260029328031776)\n`;
  
  message += `\n**🔧 Account Status:**\n`;
  message += `• Use **My Accounts** button to view all linked accounts\n`;
  message += `• Use \`/player\` command for detailed account info\n`;
  message += `• Use \`/unlink\` to remove accounts if needed\n`;
  message += `• Use \`/link\` to add more accounts\n`;
  
  if (isFirstAccount) {
    message += `\n**🎉 Welcome to BOOM House!** You can now apply to join our clans.`;
  } else {
    message += `\n**📝 Additional account linked!** Added to your profile.`;
  }
  
  return message;
}

/**
 * Enhanced message for restoring existing accounts
 */
export function createRestoreSuccessMessage(
  accounts: PlayerAccount[],
  verifiedAssigned: boolean,
  nicknameUpdated: boolean,
  mainAccount?: PlayerAccount
): string {
  let message = `<a:heya:1427561870797180928> **Welcome Back!**\n\n`;
  message += `I found ${accounts.length} linked CoC account${accounts.length > 1 ? 's' : ''} on your profile.\n\n`;
  
  message += `**📋 Your Linked Accounts:**\n`;
  accounts.forEach((account, index) => {
    const isMain = account.isMain ? " ⭐" : "";
    message += `${index + 1}. **${account.playerName}** (#${account.playerTag}) | TH${account.townHallLevel}${isMain}\n`;
  });
  
  message += `\n**🔧 Restoration Results:**\n`;
  
  if (verifiedAssigned) {
    message += `• **Verified Role** was restored\n`;
  } else {
    message += `• You already have the **Verified Role**\n`;
  }
  
  if (nicknameUpdated && mainAccount) {
    message += `• **Nickname** was restored to "${mainAccount.playerName} | TH${mainAccount.townHallLevel}"\n`;
  } else {
    message += `• Your **nickname** is already set correctly\n`;
  }
  
  message += `\n**🔧 Account Management:**\n`;
  message += `• Use **My Accounts** button to view all linked accounts\n`;
  message += `• Use \`/player\` to view account details\n`;
  message += `• Use \`/unlink\` to remove accounts if needed\n`;
  message += `• Use \`/link\` to add more accounts\n`;
  
  return message;
}
</file>

<file path="utils/types.ts">
import { InteractionType } from "discord-interactions";
import type {
  MessageFlags,
  RESTPostAPIApplicationCommandsJSONBody,
} from "discord.js";

export interface SimplifiedInteraction {
  type: InteractionType;
  data: {
    id: string;
    name: string;
    options?: { name: string; type: number; value: string }[];
    resolved?: {
      attachments?: {
        [key: string]: {
          id: string;
          filename: string;
          size: number;
          url: string;
          proxy_url: string;
          content_type: string;
        };
      };
      users?: {
        [key: string]: {
          id: string;
          username: string;
          avatar: string;
          discriminator: string;
          public_flags: number;
        };
      };
      channels?: {
        [key: string]: {
          id: string;
          name: string;
          type: number;
          permissions: string;
        };
      };
      roles?: {
        [key: string]: {
          id: string;
          name: string;
          permissions: string;
        };
      };
    };
    type: number;
    custom_id?: string;
    component_type?: number;
    // NEW: Modal-specific fields
    components?: Array<{
      type: number;
      components: Array<{
        type: number;
        custom_id: string;
        value?: string;
      }>;
    }>;
    // NEW: Dropdown/select menu values
    values?: string[];
  };
  id: string;
  channel_id: string;
  application_id: string;
  token: string;
  member?: {
    user?: {
      id: string;
      username: string;
      avatar: string;
      discriminator: string;
      public_flags: number;
    };
    permissions: string;
  };
  guild_id?: string;
  locale: string;
  guild_locale: string;
  message?: {
    id: string;
    channel_id: string;
    guild_id?: string;
  };
}

export type CommandExecuteUnpromised = {
  content?: string;
  embeds?: any[];
  components?: any[];
  flags?: MessageFlags;
};

export type CommandExecuteResult = Promise<CommandExecuteUnpromised | void>;

export type CommandExecute = (data: {
  interaction: SimplifiedInteraction;
}) => CommandExecuteResult;

// Handler function type for buttons/modals
export type ComponentHandler = (data: {
  interaction: SimplifiedInteraction;
  args: string[]; // Arguments parsed from custom_id (e.g., ["memberId", "clan"])
}) => Promise<void>;

export type CommandData = RESTPostAPIApplicationCommandsJSONBody & {
  initialEphemeral?: boolean | undefined;
};

export interface Command {
  data: CommandData;
  execute: CommandExecute;
  // Dictionary of handlers
  // Key = custom_id prefix (e.g., "force_add_confirm")
  handlers?: Record<string, ComponentHandler>;
}
</file>

<file path="commands/postrecruit.ts">
import {
  ApplicationCommandType,
  InteractionResponseType,
  MessageFlags,
  PermissionFlagsBits,
} from "discord-api-types/v10";
import type {
  CommandData,
  CommandExecuteResult,
  SimplifiedInteraction,
} from "../utils/types";
import { RecruitmentTracker } from "../utils/recruitment";
import axios from "axios";

const MAIN_SERVER_ID = process.env.GUILD_ID || "REDACTED_WM_ID";

export default {
  data: {
    name: "postrecruit",
    description: "Post recruitment embed with refresh button",
    type: ApplicationCommandType.ChatInput,
    default_member_permissions: PermissionFlagsBits.ManageMessages.toString(),
  } as CommandData,

  // 1. Main Command: Posts the initial message
  async execute(data: {
    interaction: SimplifiedInteraction;
  }): Promise<CommandExecuteResult> {
    const interaction = data.interaction;
    
    if (interaction.guild_id !== MAIN_SERVER_ID) {
      return {
        content: "<a:redcross:1439044567415521443> This command only works in the BOOM House server!",
        flags: MessageFlags.Ephemeral,
      };
    }
    
    try {
      await RecruitmentTracker.updateFromAPI();
      const { embed, components } = await createRecruitmentMessage();

      return {
        content: "",
        embeds: [embed],
        components: components,
      };
      
    } catch (error) {
      console.error("Error posting recruitment:", error);
      return {
        content: "<a:redcross:1439044567415521443> Failed to post recruitment status 💀",
        flags: MessageFlags.Ephemeral,
      };
    }
  },

  // 2. Handlers: Handles the "Refresh" button
  handlers: {
    "refresh_recruitment": async ({ interaction }: { interaction: SimplifiedInteraction }) => {
      // Security Check: Ensure it's the right server
      if (interaction.guild_id !== MAIN_SERVER_ID) {
        await axios.post(
          `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`,
          {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: { content: "<a:redcross:1439044567415521443> Wrong server!", flags: MessageFlags.Ephemeral }
          }
        );
        return;
      }

      // Acknowledge click immediately (Loading state)
      await axios.post(
        `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`,
        { type: InteractionResponseType.DeferredMessageUpdate }
      );

      try {
        // Fetch fresh data
        await RecruitmentTracker.updateFromAPI();
        const { embed, components } = await createRecruitmentMessage();
        
        // Edit the original message
        await axios.patch(
          `https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`,
          {
            embeds: [embed],
            components: components
          },
          { headers: { "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error("Refresh failed:", error);
      }
    }
  }
};

// Helper function (Reused by both Execute and Handler)
async function createRecruitmentMessage() {
  const summary = await RecruitmentTracker.getSummary();
  const { clans, totalMembers, totalCapacity, totalEmptySlots, overallFillPercentage } = summary;
  
  let description = `**📊 Overall Alliance Status**\n` +
                   `👥 **Total Members:** ${totalMembers}/${totalCapacity}\n` +
                   `📈 **Overall Fill Rate:** ${overallFillPercentage}%\n` +
                   `🎯 **Total Recruits Needed:** ${totalEmptySlots}\n\n` +
                   `**Clan Breakdown:**\n`;
  
  clans.forEach((clan: any) => {
    const neededRecruits = RecruitmentTracker.calculateNeededRecruits(clan.memberCount);
    const fillPercentage = Math.round((clan.memberCount / 50) * 100);
    const progressBar = RecruitmentTracker.createProgressBar(fillPercentage);
    
    description += `\n**${clan.name} (${clan.clan})**\n` +
                  `> 👥 **Members:** ${clan.memberCount}/50\n` +
                  `> 🎯 **Recruits Needed:** ${neededRecruits}\n` +
                  `> 📊 **Fill Rate:** ${fillPercentage}%\n` +
                  `> ${progressBar}\n`;
  });
  
  description += `\n*Data automatically fetched from Clash of Clans API*\n*Click refresh to update*`;
  
  const embed = {
    title: "🏰 BOOM House Recruitment Status",
    description: description,
    color: 0x5865F2,
    footer: {
      text: "Last updated"
    },
    timestamp: new Date().toISOString()
  };
  
  // Create refresh button component (return an array of action rows)
  const components = [
    {
      type: 1, // ACTION_ROW
      components: [
        {
          type: 2, // BUTTON
          style: 1, // PRIMARY
          custom_id: "refresh_recruitment", // Matches handler key
          label: "Refresh",
          emoji: { name: "🔄" }
        }
      ]
    }
  ];

  return { embed, components };
}
</file>

<file path="utils/kvHelper.ts">
// utils/kvHelper.ts
import { kv } from '@vercel/kv';

// Add server prefix to avoid collisions with other bots
const SERVER_PREFIX = process.env.GUILD_ID || 'BOOM_HOUSE';

// Types for our data structure
export interface PlayerAccount {
  playerTag: string;
  playerName: string;
  townHallLevel: number;
  expLevel: number;
  leagueTier?: {
    name: string;
    iconUrls?: {
      small?: string;
      medium?: string;
      large?: string;
    };
  };
  clan?: {
    tag: string;
    name: string;
  };
  role?: string;
  warPreference?: string;
  isMain: boolean;
  linkedAt: string;
  linkedBy?: string;
}

export interface UserData {
  discordId: string;
  discordName: string;
  accounts: PlayerAccount[];
  mainAccountTag?: string; // Reference to main account
  recruitedAt?: string;
  recruitedBy?: string;
  recruiterName?: string;
  clan?: string; // Current BOOM clan (WM, LE, ZP, CH)
  nickname?: string;
  lastUpdated: string;
}

// Helper to create server-specific keys
function createKey(key: string): string {
  return `${SERVER_PREFIX}:${key}`;
}

// Basic KV operations
export async function getKV<T = any>(key: string): Promise<T | null> {
  try {
    return await kv.get<T>(createKey(key));
  } catch (error) {
    console.error(`Failed to get KV key ${key}:`, error);
    return null;
  }
}

export async function setKV<T = any>(key: string, value: T): Promise<boolean> {
  try {
    await kv.set(createKey(key), value);
    return true;
  } catch (error) {
    console.error(`Failed to set KV key ${key}:`, error);
    return false;
  }
}

export async function deleteKV(key: string): Promise<boolean> {
  try {
    await kv.del(createKey(key));
    return true;
  } catch (error) {
    console.error(`Failed to delete KV key ${key}:`, error);
    return false;
  }
}

// User data operations
export async function getUserData(userId: string): Promise<UserData | null> {
  try {
    const data = await kv.get<UserData>(createKey(`user:${userId}`));
    return data;
  } catch (error) {
    console.error(`Failed to get user data for ${userId}:`, error);
    return null;
  }
}

export async function setUserData(userId: string, data: UserData): Promise<boolean> {
  try {
    data.lastUpdated = new Date().toISOString();
    await kv.set(createKey(`user:${userId}`), data);
    return true;
  } catch (error) {
    console.error(`Failed to set user data for ${userId}:`, error);
    return false;
  }
}

// Get reverse mapping (tag → userId)
export async function getUserIdByTag(playerTag: string): Promise<string | null> {
  try {
    const userId = await kv.get<string>(createKey(`tag:${playerTag}`));
    return userId;
  } catch (error) {
    console.error(`Failed to get userId for tag ${playerTag}:`, error);
    return null;
  }
}

// Link a player tag to a user (creates reverse mapping)
export async function linkTagToUser(playerTag: string, userId: string): Promise<boolean> {
  try {
    await kv.set(createKey(`tag:${playerTag}`), userId);
    return true;
  } catch (error) {
    console.error(`Failed to link tag ${playerTag} to user ${userId}:`, error);
    return false;
  }
}

// Unlink a player tag (removes reverse mapping)
export async function unlinkTag(playerTag: string): Promise<boolean> {
  try {
    await kv.del(createKey(`tag:${playerTag}`));
    return true;
  } catch (error) {
    console.error(`Failed to unlink tag ${playerTag}:`, error);
    return false;
  }
}

// Get account by tag (efficient version using reverse mapping)
export async function getAccountByTag(playerTag: string): Promise<{userId: string, account: PlayerAccount} | null> {
  try {
    const userId = await getUserIdByTag(playerTag);
    if (!userId) return null;
    
    const userData = await getUserData(userId);
    if (!userData) return null;
    
    const account = userData.accounts.find(acc => acc.playerTag === playerTag);
    if (!account) return null;
    
    return { userId, account };
  } catch (error) {
    console.error(`Failed to get account by tag ${playerTag}:`, error);
    return null;
  }
}

// Check if user has linked accounts (simple check)
export async function hasLinkedAccount(userId: string): Promise<boolean> {
  const userData = await getUserData(userId);
  return userData !== null && userData.accounts.length > 0;
}

// Get main account
export async function getMainAccount(userId: string): Promise<PlayerAccount | null> {
  const userData = await getUserData(userId);
  if (!userData) return null;
  
  return userData.accounts.find(acc => acc.isMain) || userData.accounts[0] || null;
}

// Render user accounts as a display string for ephemeral messages
export async function getUserAccountsDisplay(userId: string): Promise<string> {
  const userData = await getUserData(userId);
  if (!userData || userData.accounts.length === 0) {
    return "No linked accounts found.";
  }
  
  let display = `**📋 ${userData.discordName || 'User'}'s Linked Accounts:**\n\n`;
  
  userData.accounts.forEach((account, index) => {
    const isMain = account.isMain ? " ⭐" : "";
    const clanInfo = account.clan ? ` | ${account.clan.name}` : "";
    display += `${index + 1}. **${account.playerName}** (#${account.playerTag}) | TH${account.townHallLevel}${clanInfo}${isMain}\n`;
  });
  
  return display;
}
</file>

<file path="vercel.json">
{
  "version": 2,
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/api"
    }
  ]
}
</file>

<file path="commands/link.ts">
// commands/link.ts
import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  InteractionResponseType,
  MessageFlags,
} from "discord-api-types/v10";
import axios from "axios";
import type {
  CommandData,
  CommandExecuteResult,
  SimplifiedInteraction,
} from "../utils/types";
import { getUserData, setUserData, getUserIdByTag, linkTagToUser, type UserData, type PlayerAccount } from "../utils/kvHelper";
import { linkPlayerAccount } from "../utils/linkHelper";

const MAIN_SERVER_ID = process.env.GUILD_ID || "REDACTED_WM_ID";
const VERIFIED_ROLE_ID = "REDACTED_VERIFIED_ID";

export default {
  data: {
    name: "link",
    description: "Link your Clash of Clans account to your Discord profile",
    type: ApplicationCommandType.ChatInput,
    options: [
      {
        name: "player_tag",
        description: "Your Player Tag (e.g., #ABC123)",
        type: ApplicationCommandOptionType.String,
        required: true,
      }
    ]
  } as CommandData,
  async execute(data: {
    interaction: SimplifiedInteraction;
  }): Promise<CommandExecuteResult> {
    const interaction = data.interaction;

    if (interaction.guild_id !== MAIN_SERVER_ID) {
      return {
        content: "<a:redcross:1439044567415521443> This command only works in the BOOM House server!",
        flags: MessageFlags.Ephemeral,
      };
    }

    const options = interaction.data.options || [];
    const playerTagOption = options.find((opt: any) => opt.name === "player_tag");
    
    const rawPlayerTag = playerTagOption?.value;
    if (typeof rawPlayerTag !== "string" || !rawPlayerTag) {
      return {
        content: "<a:redcross:1439044567415521443> Please provide your player tag.\n\nExample: `/link player_tag:#ABC123`",
        flags: MessageFlags.Ephemeral,
      };
    }
    
    const userId = interaction.member?.user?.id;
    if (!userId) {
      return {
        content: "<a:redcross:1439044567415521443> Could not identify you.",
        flags: MessageFlags.Ephemeral,
      };
    }

    // Validate player tag
    const playerTag = rawPlayerTag.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!/^[A-Z0-9]{3,15}$/.test(playerTag)) {
      return {
        content: "<a:redcross:1439044567415521443> **Invalid Player Tag**\nExample: `#ABCDEFGH` or just `ABCDEFGH`",
        flags: MessageFlags.Ephemeral,
      };
    }

    try {
      // Use linkHelper to process the linking
      const { linkPlayerAccount, restoreUserRolesAndNickname, createEnhancedLinkSuccessMessage } = await import("../utils/linkHelper");
      
      // Check if user already has accounts
      const userData = await getUserData(userId);
      const hasExistingAccounts = userData && userData.accounts.length > 0;
      
      // Link the account
      const result = await linkPlayerAccount(
        playerTag,
        userId,
        interaction.member?.user?.username || "Unknown",
        userId, // executor is the user themselves
        interaction.guild_id!,
        true, // shouldAssignVerifiedRole
        true  // shouldSetNickname
      );

      if (!result.success) {
        return {
          content: result.message,
          flags: MessageFlags.Ephemeral,
        };
      }

      // If account is already linked, return early with that message
      if (result.alreadyLinked) {
        return {
          content: result.message,
        };
      }

      // For existing users, restore any missing roles/nickname
      const restoration = hasExistingAccounts
        ? await restoreUserRolesAndNickname(
            userId,
            interaction.guild_id!,
            interaction.member?.user?.username || "Unknown"
          )
        : { verifiedRoleAssigned: false, nicknameUpdated: false };

      // Create enhanced success message
      const successMessage = createEnhancedLinkSuccessMessage(
        result.playerData?.name || "Unknown",
        result.playerTag || playerTag,
        result.playerData?.townHallLevel || 1,
        result.isFirstAccount || false,
        restoration.verifiedRoleAssigned || (result.isFirstAccount ?? false),
        restoration.nicknameUpdated || (result.isFirstAccount ?? false),
        restoration.mainAccount
      );

      return {
        content: successMessage,
      };
      
    } catch (error: any) {
      console.error('Error in link command:', error);
      return {
        content: `<a:redcross:1439044567415521443> **Linking Failed**\n${error instanceof Error ? error.message : 'Unknown error'}`,
        flags: MessageFlags.Ephemeral,
      };
    }
  },

  // Handlers for button and modal interactions
  handlers: {
    // 1. Button: "Link Account" - Opens modal
    "link_coc_account_btn": async ({ interaction }: { interaction: SimplifiedInteraction }) => {
      const userId = interaction.member?.user?.id;
      const guildId = interaction.guild_id;

      if (!userId || !guildId) {
        await axios.post(
          `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`,
          {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: "<a:redcross:1439044567415521443> Could not identify user or guild.",
              flags: MessageFlags.Ephemeral,
            },
          },
          { headers: { "Content-Type": "application/json" } }
        );
        return;
      }

      // Import helper functions
      const { 
        restoreUserRolesAndNickname,
        createRestoreSuccessMessage 
      } = await import("../utils/linkHelper");

      // Check if user already has linked accounts
      const userData = await getUserData(userId);
      if (userData && userData.accounts.length > 0) {
        // User has existing accounts - restore roles and nickname
        const restoration = await restoreUserRolesAndNickname(
          userId,
          guildId,
          interaction.member?.user?.username || "Unknown"
        );

        // Create enhanced restoration message
        const restoreMessage = createRestoreSuccessMessage(
          userData.accounts,
          restoration.verifiedRoleAssigned,
          restoration.nicknameUpdated,
          restoration.mainAccount
        );

        await axios.post(
          `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`,
          {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: restoreMessage,
              flags: MessageFlags.Ephemeral,
            },
          },
          { headers: { "Content-Type": "application/json" } }
        );
        return;
      }

      // If no accounts, open modal
      await axios.post(
        `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`,
        {
          type: InteractionResponseType.Modal,
          data: {
            custom_id: "link_coc_account_modal",
            title: "Link Clash of Clans Account",
            components: [
              {
                type: 1,
                components: [
                  {
                    type: 4, // TEXT_INPUT
                    custom_id: "player_tag_input",
                    label: "Your Player Tag",
                    style: 1, // SHORT
                    placeholder: "#ABC123 or ABC123",
                    min_length: 3,
                    max_length: 15,
                    required: true,
                  },
                ],
              },
            ],
          },
        },
        { headers: { "Content-Type": "application/json" } }
      );
    },

    // 2. Modal: "Link CoC Account Modal" - Process linking
    "link_coc_account_modal": async ({ interaction }: { interaction: SimplifiedInteraction }) => {
      const userId = interaction.member?.user?.id;
      const guildId = interaction.guild_id;
      const components = interaction.data?.components || [];

      if (!userId || !guildId) {
        await axios.post(
          `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`,
          {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: "<a:redcross:1439044567415521443> Failed to identify user or guild",
              flags: MessageFlags.Ephemeral,
            },
          },
          { headers: { "Content-Type": "application/json" } }
        );
        return;
      }

      // Extract player tag from modal
      let playerTag = "";
      components.forEach((row: any) => {
        row.components.forEach((component: any) => {
          if (component.custom_id === "player_tag_input") {
            playerTag = component.value || "";
          }
        });
      });

      if (!playerTag) {
        await axios.post(
          `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`,
          {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: "<a:redcross:1439044567415521443> No player tag provided.",
              flags: MessageFlags.Ephemeral,
            },
          },
          { headers: { "Content-Type": "application/json" } }
        );
        return;
      }

      // Import linkHelper functions
      const { 
        linkPlayerAccount, 
        restoreUserRolesAndNickname,
        createEnhancedLinkSuccessMessage 
      } = await import("../utils/linkHelper");
      
      // First, check if user already has accounts
      const userData = await getUserData(userId);
      const hasExistingAccounts = userData && userData.accounts.length > 0;
      
      // Link the account
      const result = await linkPlayerAccount(
        playerTag,
        userId,
        interaction.member?.user?.username || "Unknown",
        userId, // executor is the user themselves
        guildId,
        true, // shouldAssignVerifiedRole
        true  // shouldSetNickname
      );

      if (!result.success) {
        await axios.post(
          `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`,
          {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: result.message,
              flags: MessageFlags.Ephemeral,
            },
          },
          { headers: { "Content-Type": "application/json" } }
        );
        return;
      }

      // If account is already linked, return early with that message
      if (result.alreadyLinked) {
        await axios.post(
          `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`,
          {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: result.message,
              flags: MessageFlags.Ephemeral,
            },
          },
          { headers: { "Content-Type": "application/json" } }
        );
        return;
      }

      // For existing users, restore any missing roles/nickname
      const restoration = hasExistingAccounts
        ? await restoreUserRolesAndNickname(
            userId,
            guildId,
            interaction.member?.user?.username || "Unknown"
          )
        : { verifiedRoleAssigned: false, nicknameUpdated: false };

      // Create enhanced success message
      const successMessage = createEnhancedLinkSuccessMessage(
        result.playerData?.name || "Unknown",
        result.playerTag || playerTag,
        result.playerData?.townHallLevel || 1,
        result.isFirstAccount || false,
        restoration.verifiedRoleAssigned || (result.isFirstAccount ?? false),
        restoration.nicknameUpdated || (result.isFirstAccount ?? false),
        restoration.mainAccount
      );

      await axios.post(
        `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`,
        {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: successMessage,
            flags: MessageFlags.Ephemeral,
          },
        },
        { headers: { "Content-Type": "application/json" } }
      );
    },

    // Handle "My Accounts" Button - Show user's linked accounts
    "manage_accounts_btn": async ({ interaction }: { interaction: SimplifiedInteraction }) => {
      const userId = interaction.member?.user?.id;
      const guildId = interaction.guild_id;

      if (!userId) {
        await axios.post(
          `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`,
          {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: "<a:redcross:1439044567415521443> Could not identify user.",
              flags: MessageFlags.Ephemeral,
            },
          }
        );
        return;
      }

      const userData = await getUserData(userId);
      if (!userData || userData.accounts.length === 0) {
        await axios.post(
          `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`,
          {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: "<a:redcross:1439044567415521443> You don't have any linked CoC accounts yet.\n\nClick **Link Account** to add your first account!",
              flags: MessageFlags.Ephemeral,
            },
          }
        );
        return;
      }

      // Auto-restore roles/nickname for rejoining members
      let restorationStatus = "";
      if (guildId) {
        const { restoreUserRolesAndNickname } = await import("../utils/linkHelper");
        const restoration = await restoreUserRolesAndNickname(
          userId,
          guildId,
          interaction.member?.user?.username || "Unknown"
        );
        
        const statusLines = [];
        if (restoration.verifiedRoleAssigned) {
          statusLines.push("<a:AnimatedCheck:1427570005750448169> **Verified role** has been restored!");
        }
        if (restoration.nicknameUpdated && restoration.mainAccount) {
          statusLines.push(`<a:AnimatedCheck:1427570005750448169> **Nickname** set to: ${restoration.mainAccount.playerName}`);
        }
        
        if (statusLines.length > 0) {
          restorationStatus = statusLines.join("\n") + "\n\n";
        }
      }

      // Build account list with clan info
      let accountList = `${restorationStatus}**📋 Your Linked Accounts:**\n\n`;
      
      const clanMap: Record<string, string> = {
        WM: "WAR MASTER",
        LE: "LEGENDS",
        ZP: "ZwartePiet",
        CH: "Clash Heros",
        SP: "SP.OPS.DIVISION"
      };

      userData.accounts.forEach((account, index) => {
        const isMain = account.isMain ? " ⭐" : "";
        const clanInfo = userData.clan ? ` | ${clanMap[userData.clan] || userData.clan}` : "";
        accountList += `${index + 1}. **${account.playerName}** (#${account.playerTag}) | TH${account.townHallLevel}${clanInfo}${isMain}\n`;
      });

      accountList += `\n**📖 Account Management:**\n`;
      accountList += `• Use \`/player\` to view account details\n`;
      accountList += `• Use \`/unlink\` to remove accounts\n`;
      accountList += `• Use \`/link\` to add more accounts`;

      await axios.post(
        `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`,
        {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: accountList,
            flags: MessageFlags.Ephemeral,
          },
        }
      );
    },
  },
};
</file>

<file path="commands/unlink.ts">
// commands/unlink.ts
import axios from "axios";
import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  InteractionResponseType,
  MessageFlags,
} from "discord-api-types/v10";
import type {
  CommandData,
  CommandExecuteResult,
  SimplifiedInteraction,
  ComponentHandler,
} from "../utils/types";
import { getUserData, setUserData } from "../utils/kvHelper";

const MAIN_SERVER_ID = process.env.GUILD_ID || "REDACTED_WM_ID";
const VERIFIED_ROLE_ID = "REDACTED_VERIFIED_ID";

export default {
  data: {
    name: "unlink",
    description: "Unlink a Clash of Clans account from your profile",
    type: ApplicationCommandType.ChatInput,
    initialEphemeral: true, // <--- add this
    options: [
      { name: "player_tag", description: "Player tag to unlink (leave empty to see your accounts)", type: ApplicationCommandOptionType.String, required: false }
    ]
  } as CommandData,
  async execute(data: {
    interaction: SimplifiedInteraction;
  }): Promise<CommandExecuteResult> {
    const interaction = data.interaction;

    if (interaction.guild_id !== MAIN_SERVER_ID) {
      return {
        content: "<a:redcross:1439044567415521443> This command only works in the BOOM House server!",
        flags: MessageFlags.Ephemeral,
      };
    }

    const userId = interaction.member?.user?.id;
    if (!userId) {
      return {
        content: "<a:redcross:1439044567415521443> Could not identify user.",
        flags: MessageFlags.Ephemeral,
      };
    }

    const options = interaction.data.options || [];
    const playerTagOption = options.find((opt: any) => opt.name === "player_tag");
    const rawPlayerTag = playerTagOption?.value;

    // Get user data
    const userData = await getUserData(userId);
    if (!userData || userData.accounts.length === 0) {
      return {
        content: "<a:redcross:1439044567415521443> You don't have any linked CoC accounts.",
        flags: MessageFlags.Ephemeral,
      };
    }

    // If no tag provided, show accounts with buttons
    if (!rawPlayerTag) {
      let accountList = "**📋 Your Linked Accounts:**\n\n";
      
      // Create buttons for each account
      const components: any[] = [];
      const actionRows: Array<{ type: number; components: any[] }> = [];
      let currentRow = {
        type: 1,
        components: [] as any[]
      };
      
      userData.accounts.forEach((account, index) => {
        const isMain = account.isMain ? " ⭐" : "";
        accountList += `${index + 1}. **${account.playerName}** (#${account.playerTag}) | TH${account.townHallLevel}${isMain}\n`;
        
        // Add button for each account (max 5 per row, Discord limit)
        const button = {
          type: 2,
          style: 2, // SECONDARY
          custom_id: `unlink_account:${account.playerTag}:${userId}`,
          label: `${index + 1}. ${account.playerName.slice(0, 10)}${account.playerName.length > 10 ? '...' : ''}`,
          emoji: account.isMain ? { name: "⭐" } : undefined
        };
        
        currentRow.components.push(button);
        
        // Start new row after 5 buttons (Discord limit)
        if (currentRow.components.length >= 5 || index === userData.accounts.length - 1) {
          actionRows.push(currentRow);
          if (index < userData.accounts.length - 1) {
            currentRow = {
              type: 1,
              components: []
            };
          }
        }
      });
      
      components.push(...actionRows);
      
      accountList += `\n**Click a button above to unlink that account**\nOr type: \`/unlink player_tag:#TAG\``;
      
      return {
        content: accountList,
        components: components,
        flags: MessageFlags.Ephemeral,
      };
    }

    // Validate player tag
    const playerTag = rawPlayerTag.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!/^[A-Z0-9]{3,15}$/.test(playerTag)) {
      return {
        content: "<a:redcross:1439044567415521443> **Invalid Player Tag**\nExample: `#ABCDEFGH` or just `ABCDEFGH`",
        flags: MessageFlags.Ephemeral,
      };
    }

    // Find the account
    const accountIndex = userData.accounts.findIndex(acc => acc.playerTag === playerTag);
    if (accountIndex === -1) {
      return {
        content: `<a:redcross:1439044567415521443> **Account Not Found**\nYou don't have account #${playerTag} linked to your profile.`,
        flags: MessageFlags.Ephemeral,
      };
    }

    const accountToRemove = userData.accounts[accountIndex];
    const isMainAccount = accountToRemove.isMain;
    const isOnlyAccount = userData.accounts.length === 1;

    // Remove the account
    userData.accounts.splice(accountIndex, 1);
    userData.lastUpdated = new Date().toISOString();

    // Handle main account reassignment if needed
    if (isMainAccount && userData.accounts.length > 0) {
      // Set first remaining account as main
      userData.accounts[0].isMain = true;
      userData.mainAccountTag = userData.accounts[0].playerTag;
      
      // Update nickname
      const newMain = userData.accounts[0];
      const guildId = interaction.guild_id!;
      try {
        const nickname = `${newMain.playerName} | TH${newMain.townHallLevel}`;
        await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bot ${process.env.DISCORD_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ nick: nickname }),
        });
        userData.nickname = nickname;
      } catch (nicknameError) {
        console.warn('Failed to update nickname:', nicknameError);
      }
    } else if (isOnlyAccount) {
      // Remove main account reference
      userData.mainAccountTag = undefined;
      userData.nickname = undefined;
      
      // Remove nickname
      const guildId = interaction.guild_id!;
      try {
        await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bot ${process.env.DISCORD_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ nick: null }), // Remove nickname
        });
      } catch (nicknameError) {
        console.warn('Failed to remove nickname:', nicknameError);
      }
      
      // Remove Verified role
      try {
        await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}/roles/${VERIFIED_ROLE_ID}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bot ${process.env.DISCORD_TOKEN}`,
            'Content-Type': 'application/json',
          },
        });
      } catch (roleError) {
        console.warn('Failed to remove Verified role:', roleError);
      }
    }

    // Save updated data
    await setUserData(userId, userData);

    let responseText = `<a:AnimatedCheck:1427570005750448169> **Account Unlinked Successfully!**\n\n` +
      `**👤 Account:** ${accountToRemove.playerName}\n` +
      `**🏷️ Player Tag:** #${accountToRemove.playerTag}\n\n`;
    
    if (isMainAccount && userData.accounts.length > 0) {
      const newMain = userData.accounts[0];
      responseText += `⭐ **New main account:** ${newMain.playerName} (#${newMain.playerTag})\n`;
    }
    
    if (isOnlyAccount) {
      responseText += `📝 **No accounts remaining.** Verified role and nickname removed.\n`;
    } else {
      responseText += `📊 **Remaining accounts:** ${userData.accounts.length}`;
    }

    return {
      content: responseText,
      flags: MessageFlags.Ephemeral,
    };
  },

  // Button handler for unlink account button
  handlers: {
    "unlink_account": async ({ interaction, args }: { interaction: SimplifiedInteraction; args: string[] }) => {
      const [playerTag, buttonUserId] = args; // "unlink_account:TAG:userId"
      const userId = interaction.member?.user?.id;

      // Verify the user clicking the button is the account owner
      if (userId !== buttonUserId) {
        await axios.post(
          `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`,
          {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: "<a:redcross:1439044567415521443> This button is not for you.",
              flags: MessageFlags.Ephemeral,
            },
          }
        );
        return;
      }

      // Defer the response
      await axios.post(
        `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`,
        {
          type: InteractionResponseType.DeferredMessageUpdate,
        }
      );

      try {
        // Get user data
        let userData = await getUserData(userId);
        if (!userData) {
          await axios.patch(
            `https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`,
            {
              content: "<a:redcross:1439044567415521443> No user data found.",
              flags: MessageFlags.Ephemeral,
            }
          );
          return;
        }

        // Find account to unlink
        const accountIndex = userData.accounts.findIndex(acc => acc.playerTag === playerTag);
        if (accountIndex === -1) {
          await axios.patch(
            `https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`,
            {
              content: `<a:redcross:1439044567415521443> Account #${playerTag} not found.`,
              flags: MessageFlags.Ephemeral,
            }
          );
          return;
        }

        const accountToRemove = userData.accounts[accountIndex];
        const isMainAccount = accountToRemove.isMain;
        const isOnlyAccount = userData.accounts.length === 1;
        const guildId = interaction.guild_id!;

        // Remove the account
        userData.accounts.splice(accountIndex, 1);
        userData.lastUpdated = new Date().toISOString();

        // Handle main account reassignment if needed
        if (isMainAccount && userData.accounts.length > 0) {
          userData.accounts[0].isMain = true;
          userData.mainAccountTag = userData.accounts[0].playerTag;
          
          // Update nickname
          const newMain = userData.accounts[0];
          try {
            const nickname = `${newMain.playerName} | TH${newMain.townHallLevel}`;
            await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bot ${process.env.DISCORD_TOKEN}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ nick: nickname }),
            });
            userData.nickname = nickname;
          } catch (nicknameError) {
            console.warn('Failed to update nickname:', nicknameError);
          }
        } else if (isOnlyAccount) {
          userData.mainAccountTag = undefined;
          userData.nickname = undefined;
          
          // Remove nickname
          try {
            await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bot ${process.env.DISCORD_TOKEN}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ nick: null }),
            });
          } catch (nicknameError) {
            console.warn('Failed to remove nickname:', nicknameError);
          }
          
          // Remove Verified role
          try {
            await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}/roles/${VERIFIED_ROLE_ID}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bot ${process.env.DISCORD_TOKEN}`,
                'Content-Type': 'application/json',
              },
            });
          } catch (roleError) {
            console.warn('Failed to remove Verified role:', roleError);
          }
        }

        // Save updated data
        await setUserData(userId, userData);

        // Build response
        let responseText = `<a:AnimatedCheck:1427570005750448169> **Account Unlinked Successfully!**\n\n` +
          `**👤 Account:** ${accountToRemove.playerName}\n` +
          `**🏷️ Player Tag:** #${accountToRemove.playerTag}\n\n`;
        
        if (isMainAccount && userData.accounts.length > 0) {
          const newMain = userData.accounts[0];
          responseText += `⭐ **New main account:** ${newMain.playerName} (#${newMain.playerTag})\n`;
        }
        
        if (isOnlyAccount) {
          responseText += `📝 **No accounts remaining.** Verified role and nickname removed.\n`;
        } else {
          responseText += `📊 **Remaining accounts:** ${userData.accounts.length}`;
        }

        // Update the message
        await axios.patch(
          `https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`,
          {
            content: responseText,
          }
        );
      } catch (error) {
        console.error('Failed to unlink account:', error);
        await axios.patch(
          `https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`,
          {
            content: `<a:redcross:1439044567415521443> **Unlink Failed**\n${error instanceof Error ? error.message : 'Unknown error'}`,
            flags: MessageFlags.Ephemeral,
          }
        );
      }
    },
  },
};
</file>

<file path="commands/player.ts">
// commands/player.ts
import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  InteractionResponseType,
  MessageFlags,
} from "discord-api-types/v10";
import type {
  CommandData,
  CommandExecuteResult,
  SimplifiedInteraction,
} from "../utils/types";
import { getUserData, setUserData } from "../utils/kvHelper";
import axios from "axios";

const MAIN_SERVER_ID = process.env.GUILD_ID || "REDACTED_WM_ID";
const COC_API_BASE_URL = "https://cocproxy.royaleapi.dev/v1";

// Helper function to render player stats with secure component IDs
async function renderPlayerStats(
  playerTag: string,
  userData: any,
  isSelf: boolean,
  ownerId: string
) {
  // Fetch fresh API data
  let playerData = userData.accounts.find((acc: any) => acc.playerTag === playerTag) as any;
  
  try {
    const response = await fetch(`${COC_API_BASE_URL}/players/%23${playerTag}`, {
      headers: {
        'Authorization': `Bearer ${process.env.COC_API_KEY}`,
        'Accept': 'application/json'
      },
    });
    if (response.ok) {
      playerData = await response.json();
    }
  } catch (error) {
    console.warn("Failed to fetch fresh data:", error);
  }

  const titlePrefix = isSelf ? "Your" : "Their";
  const mainAccount = userData.accounts.find((acc: any) => acc.isMain) || userData.accounts[0];
  
  const embed: any = {
    title: `📊 ${titlePrefix} Player Stats`,
    color: 0x5865F2,
    thumbnail: playerData.leagueTier?.iconUrls?.large ? { url: playerData.leagueTier.iconUrls.large } : undefined,
    fields: [
      { name: "👤 CoC Name", value: playerData.name || mainAccount.playerName, inline: true },
      { name: "🏷️ Player Tag", value: `#${playerTag}`, inline: true },
      { name: "⭐ Status", value: mainAccount.playerTag === playerTag ? "Main Account" : "Linked Account", inline: true },
      { name: "🏰 Town Hall", value: `Level ${playerData.townHallLevel || mainAccount.townHallLevel}`, inline: true },
      { name: "📊 Experience", value: `Level ${playerData.expLevel || mainAccount.expLevel}`, inline: true },
      { name: "🏆 League", value: playerData.leagueTier?.name || mainAccount.leagueTier || "Unranked", inline: true },
    ],
    footer: {
      text: isSelf
        ? `You have ${userData.accounts.length} linked account${userData.accounts.length > 1 ? 's' : ''}`
        : `${userData.accounts.length} account${userData.accounts.length > 1 ? 's' : ''}`
    },
    timestamp: new Date().toISOString()
  };

  if (playerData.clan || mainAccount.clan) {
    const clan = playerData.clan || mainAccount.clan;
    embed.fields.push({
      name: "👑 Current Clan",
      value: `${clan?.name} (${clan?.tag})`,
      inline: false
    });
  }

  if (userData.clan) {
    const clanMap = {
      WM: "WAR MASTER",
      LE: "LEGENDS",
      ZP: "ZwartePiet",
      CH: "Clash Heros",
      SP: "SP.OPS.DIVISION"
    };

    embed.fields.push({
      name: "🏰 BOOM House",
      value: `${clanMap[userData.clan as keyof typeof clanMap] || userData.clan}`,
      inline: false
    });
  }

  if (userData.recruitedAt) {
    const date = new Date(userData.recruitedAt).toLocaleDateString();
    embed.fields.push({
      name: "📅 Joined BOOM",
      value: date,
      inline: true
    });
  }

  if (userData.recruitedBy) {
    embed.fields.push({
      name: "👤 Recruited By",
      value: `<@${userData.recruitedBy}>`,
      inline: true
    });
  }

  const components = [];

  // Only show buttons if the user is viewing their own profile (isSelf)
  if (userData.accounts.length > 1 && isSelf) {
    const options = userData.accounts.map((acc: any) => ({
      label: `${acc.playerName} (TH${acc.townHallLevel})`,
      value: acc.playerTag,
      default: acc.playerTag === playerTag,
      emoji: acc.isMain ? { name: "⭐" } : undefined
    }));

    components.push({
      type: 1,
      components: [{
        type: 3, // String Select
        // SECURE: Embed the ownerId into the custom_id
        custom_id: `select_account:${ownerId}`,
        placeholder: "Select an account to view",
        options: options.slice(0, 25)
      }]
    });

    const currentAccount = userData.accounts.find((acc: any) => acc.playerTag === playerTag);
    if (currentAccount && !currentAccount.isMain) {
      components.push({
        type: 1,
        components: [{
          type: 2,
          style: 1,
          // SECURE: Embed the ownerId into the custom_id
          custom_id: `set_main:${playerTag}:${ownerId}`,
          label: "Set as Main Account",
          emoji: { name: "⭐" }
        }]
      });
    }
  }

  // Response flags: Ephemeral if looking at someone else, Public if looking at self
  return { embeds: [embed], components, flags: isSelf ? undefined : MessageFlags.Ephemeral };
}

export default {
  data: {
    name: "player",
    description: "View Clash of Clans player stats",
    type: ApplicationCommandType.ChatInput,
    options: [
      {
        name: "tag",
        description: "Player tag to look up (for any player)",
        type: ApplicationCommandOptionType.String,
        required: false,
      },
      {
        name: "user",
        description: "Discord user to view their linked accounts",
        type: ApplicationCommandOptionType.User,
        required: false,
      }
    ]
  } as CommandData,

  // 1. Main Command
  async execute(data: {
    interaction: SimplifiedInteraction;
  }): Promise<CommandExecuteResult> {
    const interaction = data.interaction;

    if (interaction.guild_id !== MAIN_SERVER_ID) {
      return {
        content: "<a:redcross:1439044567415521443> This command only works in the BOOM House server!",
        flags: MessageFlags.Ephemeral,
      };
    }

    const options = interaction.data.options || [];
    const tagOption = options.find((opt: any) => opt.name === "tag");
    const userOption = options.find((opt: any) => opt.name === "user");
    
    const rawTag = tagOption?.value;
    const targetUserId = (userOption?.value || interaction.member?.user?.id) as string | undefined;
    if (!targetUserId) {
      return {
        content: "<a:redcross:1439044567415521443> Could not identify the target user.",
        flags: MessageFlags.Ephemeral,
      };
    }
    
    // Get target user
    const targetUser = userOption 
      ? interaction.data.resolved?.users?.[String(targetUserId)]
      : interaction.member?.user;
    
    if (!targetUser) {
      return {
        content: "<a:redcross:1439044567415521443> Could not find the specified user.",
        flags: MessageFlags.Ephemeral,
      };
    }

    // CASE 1: Looking up by tag (any player)
    if (rawTag) {
      const playerTag = rawTag.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      
      try {
        const response = await fetch(`${COC_API_BASE_URL}/players/%23${playerTag}`, {
          headers: { 
            'Authorization': `Bearer ${process.env.COC_API_KEY}`, 
            'Accept': 'application/json' 
          },
        });

        if (!response.ok) {
          return {
            content: `<a:redcross:1439044567415521443> **Player Not Found**\nTag **#${playerTag}** not found.`,
            flags: MessageFlags.Ephemeral,
          };
        }

        const playerData = await response.json();
        
        const embed = {
          title: `👤 ${playerData.name} (#${playerTag})`,
          color: 0x5865F2,
          thumbnail: playerData.leagueTier?.iconUrls?.large ? { url: playerData.leagueTier.iconUrls.large } : undefined,
          fields: [
            { name: "🏰 Town Hall", value: `Level ${playerData.townHallLevel}`, inline: true },
            { name: "📊 Experience", value: `Level ${playerData.expLevel}`, inline: true },
            { name: "🏆 League", value: playerData.leagueTier?.name || "Unranked", inline: true },
            { name: "⚔️ War Stars", value: playerData.warStars?.toString() || "0", inline: true },
            { name: "🎯 Trophies", value: playerData.trophies?.toString() || "0", inline: true },
            { name: "🏆 Best Trophies", value: playerData.bestTrophies?.toString() || "0", inline: true },
          ],
          footer: { text: "Player Lookup" },
          timestamp: new Date().toISOString()
        };

        if (playerData.warPreference) {
          embed.fields.push({
            name: "⚔️ War Preference",
            value: playerData.warPreference === "in" ? "Opted In <a:AnimatedCheck:1427570005750448169>" : "Opted Out <a:redcross:1439044567415521443>",
            inline: true
          });
        }

        if (playerData.role) {
          embed.fields.push({
            name: "👑 Clan Role",
            value: playerData.role.charAt(0).toUpperCase() + playerData.role.slice(1),
            inline: true
          });
        }

        if (playerData.clan) {
          embed.fields.push({
            name: "👑 Clan",
            value: `${playerData.clan.name} (${playerData.clan.tag})`,
            inline: false
          });
        }

        return {
          content: "",
          embeds: [embed]
        };
      } catch (error) {
        return {
          content: `<a:redcross:1439044567415521443> **Lookup Failed**\n${error instanceof Error ? error.message : "Unknown error"}`,
          flags: MessageFlags.Ephemeral,
        };
      }
    }

    // CASE 2: Looking up user's linked accounts
    const userData = await getUserData(targetUserId);
    if (!userData || userData.accounts.length === 0) {
      const isSelf = targetUserId === interaction.member?.user?.id;
      const userMention = isSelf ? "You don't" : `<@${targetUserId}> doesn't`;
      return {
        content: `${userMention} have any linked CoC accounts.\nUse \`/link\` to link an account.`,
        flags: MessageFlags.Ephemeral,
      };
    }

    const mainAccount = userData.accounts.find((acc) => acc.isMain) || userData.accounts[0];
    const isSelf = targetUserId === interaction.member?.user?.id;
    
    // Fetch fresh API data
    let playerData = mainAccount as any;
    try {
      const response = await fetch(`${COC_API_BASE_URL}/players/%23${mainAccount.playerTag}`, {
        headers: { 
          'Authorization': `Bearer ${process.env.COC_API_KEY}`, 
          'Accept': 'application/json' 
        },
      });
      if (response.ok) {
        playerData = await response.json();
      }
    } catch (error) {
      console.warn("Failed to fetch fresh data:", error);
    }

    const titlePrefix = isSelf ? "Your" : `${targetUser.username}'s`;
    const embed: any = {
      title: `📊 ${titlePrefix} Player Stats`,
      color: 0x5865F2,
      thumbnail: playerData.leagueTier?.iconUrls?.large ? { url: playerData.leagueTier.iconUrls.large } : undefined,
      fields: [
        { name: "👤 CoC Name", value: playerData.name || mainAccount.playerName, inline: true },
        { name: "🏷️ Player Tag", value: `#${mainAccount.playerTag}`, inline: true },
        { name: "⭐ Status", value: mainAccount.isMain ? "Main Account" : "Linked Account", inline: true },
        { name: "🏰 Town Hall", value: `Level ${playerData.townHallLevel || mainAccount.townHallLevel}`, inline: true },
        { name: "📊 Experience", value: `Level ${playerData.expLevel || mainAccount.expLevel}`, inline: true },
        { name: "🏆 League", value: playerData.leagueTier?.name || mainAccount.leagueTier || "Unranked", inline: true },
      ],
      footer: {
        text: isSelf 
          ? `You have ${userData.accounts.length} linked account${userData.accounts.length > 1 ? 's' : ''}` 
          : `${targetUser.username} has ${userData.accounts.length} linked account${userData.accounts.length > 1 ? 's' : ''}` 
      },
      timestamp: new Date().toISOString()
    };
    
    if (playerData.clan || mainAccount.clan) {
      const clan = playerData.clan || mainAccount.clan;
      embed.fields.push({ 
        name: "👑 Current Clan", 
        value: `${clan?.name} (${clan?.tag})`, 
        inline: false 
      });
    }
    
    // Add BOOM House info if available
    if (userData.clan) {
      const clanMap = {
        WM: "WAR MASTER",
        LE: "LEGENDS", 
        ZP: "ZwartePiet",
        CH: "Clash Heros",
        SP: "SP.OPS.DIVISION"
      };
      
      embed.fields.push({ 
        name: "🏰 BOOM House", 
        value: `${clanMap[userData.clan as keyof typeof clanMap] || userData.clan}`, 
        inline: false 
      });
    }
    
    if (userData.recruitedAt) {
      const date = new Date(userData.recruitedAt).toLocaleDateString();
      embed.fields.push({ 
        name: "📅 Joined BOOM", 
        value: date, 
        inline: true 
      });
    }
    
    if (userData.recruitedBy) {
      embed.fields.push({ 
        name: "👤 Recruited By", 
        value: `<@${userData.recruitedBy}>`, 
        inline: true 
      });
    }
    
    return await renderPlayerStats(mainAccount.playerTag, userData, isSelf, targetUserId);
  },

  // 2. Handlers for Dropdown & Button
  handlers: {
    // Handle Account Selection Dropdown - SECURE: Verify ownerId
    "select_account": async ({ interaction, args }: { interaction: SimplifiedInteraction; args: string[] }) => {
      const [ownerId] = args; // SECURE: Extract ownerId from custom_id
      const selectedTag = interaction.data?.values?.[0];
      const userId = interaction.member?.user?.id;

      // SECURITY CHECK: Verify that the user clicking the button owns this profile
      if (userId !== ownerId) {
        await axios.post(
          `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`,
          {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: "<a:Warning:1456190079830720625> This button is not for you.",
              flags: MessageFlags.Ephemeral
            }
          }
        );
        return;
      }

      if (!selectedTag || !userId) {
        return;
      }

      // Defer the response
      await axios.post(
        `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`,
        {
          type: InteractionResponseType.DeferredChannelMessageWithSource,
        },
        { headers: { "Content-Type": "application/json" } }
      );

      try {
        // Fetch fresh data for selected account
        const response = await fetch(`${COC_API_BASE_URL}/players/%23${selectedTag}`, {
          headers: { 
            'Authorization': `Bearer ${process.env.COC_API_KEY}`, 
            'Accept': 'application/json' 
          },
        });

        if (!response.ok) {
          await axios.patch(
            `https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`,
            {
              content: `<a:redcross:1439044567415521443> Failed to fetch data for account #${selectedTag}`,
              flags: MessageFlags.Ephemeral,
            },
            { headers: { "Content-Type": "application/json" } }
          );
          return;
        }

        const playerData = await response.json();

        const embed = {
          title: `👤 ${playerData.name} (#${selectedTag})`,
          color: 0x5865F2,
          fields: [
            { name: "🏰 Town Hall", value: `Level ${playerData.townHallLevel}`, inline: true },
            { name: "📊 Experience", value: `Level ${playerData.expLevel}`, inline: true },
            { name: "🏆 League", value: playerData.leagueTier?.name || "Unranked", inline: true },
            { name: "⚔️ War Stars", value: playerData.warStars?.toString() || "0", inline: true },
            { name: "🎯 Trophies", value: playerData.trophies?.toString() || "0", inline: true },
            { name: "🏆 Best Trophies", value: playerData.bestTrophies?.toString() || "0", inline: true },
          ],
          footer: { text: "Account selected from dropdown" },
          timestamp: new Date().toISOString()
        };

        if (playerData.clan) {
          embed.fields.push({ 
            name: "👑 Clan", 
            value: `${playerData.clan.name} (${playerData.clan.tag})`, 
            inline: false 
          });
        }

        // Get user data to check if this is main account
        const userData = await getUserData(userId);
        const isMain = userData?.accounts.find(acc => acc.playerTag === selectedTag)?.isMain || false;

        const components = [];
        if (!isMain) {
          components.push({
            type: 1, // ACTION_ROW
            components: [{
              type: 2, // BUTTON
              style: 1, // PRIMARY
              custom_id: `set_main:${selectedTag}:${ownerId}`, // SECURE: Embed ownerId
              label: "Set as Main",
              emoji: { name: "⭐" }
            }]
          });
        }

        await axios.patch(
          `https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`,
          {
            embeds: [embed],
            components: components.length > 0 ? components : undefined,
          },
          { headers: { "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error("Failed to handle select_account:", error);
      }
    },

    // Handle "Set as Main" Button - SECURE: Verify ownerId
    "set_main": async ({ interaction, args }: { interaction: SimplifiedInteraction; args: string[] }) => {
      const [selectedTag, ownerId] = args; // SECURE: Extract ownerId from custom_id (set_main:TAG:OWNER_ID)
      const userId = interaction.member?.user?.id;

      // SECURITY CHECK: Verify that the user clicking the button owns this profile
      if (userId !== ownerId) {
        await axios.post(
          `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`,
          {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: "<a:Warning:1456190079830720625> This button is not for you.",
              flags: MessageFlags.Ephemeral
            }
          }
        );
        return;
      }

      if (!selectedTag || !userId) {
        return;
      }

      // Defer the response
      await axios.post(
        `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`,
        {
          type: InteractionResponseType.DeferredMessageUpdate,
        },
        { headers: { "Content-Type": "application/json" } }
      );

      try {
        // Get user data
        let userData = await getUserData(userId);
        if (!userData) {
          await axios.patch(
            `https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`,
            {
              content: "<a:redcross:1439044567415521443> No user data found.",
              flags: MessageFlags.Ephemeral,
            },
            { headers: { "Content-Type": "application/json" } }
          );
          return;
        }

        // Update main account logic
        let found = false;
        for (const account of userData.accounts) {
          if (account.playerTag === selectedTag) {
            account.isMain = true;
            found = true;
          } else {
            account.isMain = false;
          }
        }

        if (!found) {
          await axios.patch(
            `https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`,
            {
              content: `<a:redcross:1439044567415521443> Account #${selectedTag} not found in your linked accounts.`,
              flags: MessageFlags.Ephemeral,
            },
            { headers: { "Content-Type": "application/json" } }
          );
          return;
        }

        userData.mainAccountTag = selectedTag;
        userData.lastUpdated = new Date().toISOString();

        // Update nickname
        const guildId = interaction.guild_id;
        const mainAccount = userData.accounts.find(acc => acc.isMain);
        if (mainAccount && guildId) {
          try {
            const nickname = `${mainAccount.playerName} | TH${mainAccount.townHallLevel}`;
            await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bot ${process.env.DISCORD_TOKEN}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ nick: nickname }),
            });
            userData.nickname = nickname;
          } catch (nicknameError) {
            console.warn('Failed to update nickname:', nicknameError);
          }
        }

        await setUserData(userId, userData);

        await axios.patch(
          `https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`,
          {
            content: `<a:AnimatedCheck:1427570005750448169> **Main Account Updated!**\n\n⭐ **${mainAccount?.playerName}** (#${selectedTag}) is now your main account.\n\nYour nickname has been updated.`,
          },
          { headers: { "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error("Failed to set main account:", error);
      }
    }
  }
};
</file>

<file path="package.json">
{
  "name": "discraft-bot",
  "private": true,
  "version": "0.0.0",
  "description": "Bot created with discraft",
  "module": "index.ts",
  "type": "module",
  "scripts": {
    "deploy": "vercel --prod",
    "build": "discraft vercel build",
    "register": "tsx scripts/register.ts",
    "register-guild": "tsx scripts/register-guild.ts"
  },
  "devDependencies": {
    "discraft": "^1.7.9",
    "typescript": "^5.9.3",
    "vercel": "^49.1.2"
  },
  "dependencies": {
    "@google/generative-ai": "^0.24.1",
    "@vercel/kv": "^3.0.0",
    "@vercel/node": "^5.3.26",
    "axios": "^1.12.2",
    "consola": "^3.4.2",
    "discord-api-types": "^0.38.29",
    "discord-interactions": "^4.4.0",
    "discord.js": "^14.23.2",
    "dotenv": "^17.2.3",
    "raw-body": "^3.0.1"
  }
}
</file>

<file path="utils/recruitment.ts">
// utils/recruitment.ts
import { configDotenv } from "dotenv";
import { kv } from "@vercel/kv";
import { CLAN_TAGS, CLAN_NAMES, MAX_CLAN_SIZE } from "./config";
import { cocApi } from "./cocApi";

configDotenv();

export interface ClanRecruitment {
  clan: string; // WM, LE, ZP, CH, SP
  name: string; // Full clan name
  memberCount: number; // Current members from API
  lastUpdated: number;
  clanTag?: string; // Clan tag for API calls
}

export class RecruitmentTracker {
  private static readonly KEY = "boom_house_recruitment";
  private static readonly MAX_CLAN_SIZE = MAX_CLAN_SIZE;

  static async initialize(): Promise<void> {
    try {
      // Get existing data
      const existingData =
        (await kv.hgetall<Record<string, ClanRecruitment>>(this.KEY)) || {};

      // Define all required clans
      const requiredClans = Object.keys(CLAN_TAGS);
      let needsUpdate = false;

      // Check if any clans are missing from KV and add them
      for (const clanKey of requiredClans) {
        if (!existingData[clanKey]) {
          console.log(`🆕 Initializing missing clan: ${clanKey}`);
          existingData[clanKey] = {
            clan: clanKey,
            name: CLAN_NAMES[clanKey as keyof typeof CLAN_NAMES],
            memberCount: 0,
            lastUpdated: Date.now(),
            clanTag: CLAN_TAGS[clanKey as keyof typeof CLAN_TAGS]
          };
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        await kv.hset(this.KEY, existingData);
        console.log("✅ Recruitment tracker updated with new clans");
      }
    } catch (error) {
      console.error(
        "❌ Failed to initialize recruitment tracker:",
        error
      );
    }
  }

  // Fetch real-time member counts from API
  static async updateFromAPI(): Promise<void> {
    try {
      // Ensure we have all clans loaded first
      await this.initialize();

      const clans = await this.getAllClans();

      for (const clan of clans) {
        const clanTag =
          clan.clanTag || CLAN_TAGS[clan.clan as keyof typeof CLAN_TAGS];

        if (clanTag) {
          try {
            const result = await cocApi.getClan(clanTag);

            if (result.success) {
              const memberCount = result.data.members || 0;

              // Update member count
              clan.memberCount = memberCount;
              clan.lastUpdated = Date.now();
              // Ensure name is up to date
              if (!clan.name && CLAN_NAMES[clan.clan as keyof typeof CLAN_NAMES]) {
                clan.name = CLAN_NAMES[clan.clan as keyof typeof CLAN_NAMES];
              }

              await kv.hset(this.KEY, { [clan.clan.toUpperCase()]: clan });
              console.log(
                `✅ Updated ${clan.name}: ${memberCount}/50 members`
              );
            } else {
              console.warn(`⚠️ Error fetching ${clan.name} data:`, result.message);
            }
          } catch (error) {
            console.warn(`⚠️ Error fetching ${clan.name} data:`, error);
          }
        }
      }
    } catch (error) {
      console.error("❌ Failed to update from API:", error);
    }
  }

  static async getClan(clan: string): Promise<ClanRecruitment | null> {
    try {
      const data = await kv.hget<ClanRecruitment>(
        this.KEY,
        clan.toUpperCase()
      );
      return data;
    } catch (error) {
      console.error(`❌ Failed to get clan ${clan}:`, error);
      return null;
    }
  }

  static async getAllClans(): Promise<ClanRecruitment[]> {
    try {
      const data =
        await kv.hgetall<Record<string, ClanRecruitment>>(this.KEY);
      // Sort clans to keep order consistent
      const clanOrder = Object.keys(CLAN_TAGS);

      return data
        ? Object.values(data).sort((a, b) => {
            return clanOrder.indexOf(a.clan) - clanOrder.indexOf(b.clan);
          })
        : [];
    } catch (error) {
      console.error("❌ Failed to get all clans:", error);
      return [];
    }
  }

  static async getSummary(): Promise<{
    clans: ClanRecruitment[];
    totalMembers: number;
    totalCapacity: number;
    totalEmptySlots: number;
    overallFillPercentage: number;
  }> {
    const clans = await this.getAllClans();

    // Calculate totals based on current member counts
    const totalMembers = clans.reduce(
      (sum, clan) => sum + clan.memberCount,
      0
    );
    const totalCapacity = clans.length * this.MAX_CLAN_SIZE;
    const totalEmptySlots = Math.max(0, totalCapacity - totalMembers);
    const overallFillPercentage =
      totalCapacity > 0
        ? Math.round((totalMembers / totalCapacity) * 100)
        : 0;

    return {
      clans,
      totalMembers,
      totalCapacity,
      totalEmptySlots,
      overallFillPercentage
    };
  }

  static createProgressBar(percentage: number): string {
    const filled = Math.round(percentage / 10);
    const empty = 10 - filled;
    return `[${"█".repeat(filled)}${"░".repeat(empty)}]`;
  }

  static calculateNeededRecruits(memberCount: number): number {
    return Math.max(0, this.MAX_CLAN_SIZE - memberCount);
  }
}

// Initialize on import to ensure new clans are added to KV on restart
RecruitmentTracker.initialize().catch(console.error);
</file>

<file path="commands/postlink.ts">
// commands/postlink.ts (updated)
import {
  ApplicationCommandType,
  MessageFlags,
  PermissionFlagsBits,
} from "discord-api-types/v10";
import type {
  CommandData,
  CommandExecuteResult,
  SimplifiedInteraction,
} from "../utils/types";

const MAIN_SERVER_ID = process.env.GUILD_ID || "REDACTED_WM_ID";
const VERIFIED_ROLE_ID = "REDACTED_VERIFIED_ID";

export default {
  data: {
    name: "postlink",
    description: "Post account linking embed with button",
    type: ApplicationCommandType.ChatInput,
    default_member_permissions: PermissionFlagsBits.ManageMessages.toString(),
  } as CommandData,
  async execute(data: {
    interaction: SimplifiedInteraction;
  }): Promise<CommandExecuteResult> {
    const interaction = data.interaction;
    
    // BLOCK OTHER SERVERS
    if (interaction.guild_id !== MAIN_SERVER_ID) {
      return {
        content: "<a:redcross:1439044567415521443> This command only works in the BOOM House server!",
        flags: MessageFlags.Ephemeral,
      };
    }
    
    try {
      const embed = {
        title: " <a:ClashOfClansLogo:1456185647563018330> Unlock Server Access",
        description: "To prevent spam, you must link your CoC account to open a ticket.\n\n**1️⃣ Step 1: Link Account**\nClick the button below to verify. This grants you the **Verified Role**.\n\n**2️⃣ Step 2: Open a Ticket**\nOnce verified, the panel above will unlock options for:\n🎟️ **Apply to Join**\n🛡️ **Chat with Staff**",
        color: 0x5865F2,
        fields: [
          {
            name: "<a:rg_blink:1456183866510282762> Quick Navigation",
            value: "Verified? [**Click here to Create a Ticket**](https://discord.com/channels/REDACTED_GUILD_ID/REDACTED_CHANNEL_VERIFICATION_ID/REDACTED_MSG_ID)",
            inline: false
          }
        ],
        footer: {
          text: "BOOM House • Verification System"
        }
      };
      
      const components = [
        {
          type: 1, // ACTION_ROW
          components: [
            {
              type: 2, // BUTTON
              style: 3, // SUCCESS (green)
              custom_id: "link_coc_account_btn",
              label: "Link Account",
              emoji: { name: "🔗" }
            },
            {
              type: 2, // BUTTON
              style: 2, // SECONDARY (gray)
              custom_id: "manage_accounts_btn",
              label: "My Accounts",
              emoji: { name: "📋" }
            }
          ]
        }
      ];
      
      // Post in the current channel
      await fetch(`https://discord.com/api/v10/channels/${interaction.channel_id}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bot ${process.env.DISCORD_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          embeds: [embed],
          components: components
        }),
      });
      
      return {
        content: "<a:AnimatedCheck:1427570005750448169> Account linking embed posted!",
        flags: MessageFlags.Ephemeral,
      };
      
    } catch (error) {
      console.error("Error posting link embed:", error);
      return {
        content: "<a:redcross:1439044567415521443> Failed to post linking embed",
        flags: MessageFlags.Ephemeral,
      };
    }
  },
};
</file>

<file path="index.ts">
// api/index.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import axios from "axios";
import { InteractionResponseType, MessageFlags } from "discord-api-types/v10";
import { InteractionType, verifyKey } from "discord-interactions";
import getRawBody from "raw-body";
import commands from "./.discraft/commands/index";
import { logger } from "./utils/logger";
import {
  type Command,
  type CommandExecuteUnpromised,
  type SimplifiedInteraction,
} from "./utils/types";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    logger.debug("Request received", { method: req.method, url: req.url });

    if (req.method !== "POST") {
      return res.status(405).send({ error: "Method Not Allowed" });
    }

    // 1. VERIFY SIGNATURE
    const signature = req.headers["x-signature-ed25519"];
    const timestamp = req.headers["x-signature-timestamp"];

    if (!signature || !timestamp || typeof signature !== "string" || typeof timestamp !== "string") {
      return res.status(401).send({ error: "Invalid request headers" });
    }

    if (!process.env.DISCORD_PUBLIC_KEY) {
      return res.status(500).send({ error: "Internal server configuration error" });
    }

    const rawBody = await getRawBody(req);
    if (!rawBody) return res.status(400).send({ error: "Missing request body" });

    const isValidRequest = await verifyKey(
      rawBody,
      signature,
      timestamp,
      process.env.DISCORD_PUBLIC_KEY,
    );

    if (!isValidRequest) return res.status(401).send({ error: "Invalid request signature" });

    const message: SimplifiedInteraction & { data?: { custom_id?: string; component_type?: number; values?: string[] } } = JSON.parse(rawBody.toString());

    // 2. HANDLE PING
    if (message.type === InteractionType.PING) {
      return res.status(200).json({ type: InteractionResponseType.Pong });
    }

    // 3. ROUTER: HANDLE BUTTONS & MODALS
    // We look for a matching handler in your commands instead of writing logic here
    if (message.type === InteractionType.MESSAGE_COMPONENT || message.type === 5) { // 5 = MODAL_SUBMIT
      const customId = message.data?.custom_id;
      
      if (!customId) return res.status(400).end();
      
      logger.debug("Handling interaction", { custom_id: customId, type: message.type });

      // First, try to find an EXACT match across all commands
      for (const cmdName in commands) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const command = (commands as any)[cmdName] as Command;
        
        if (command.handlers && command.handlers[customId]) {
          try {
            // For buttons with arguments, parse them
            const args = customId.includes(':') ? customId.split(":").slice(1) : [];
            await command.handlers[customId]({ interaction: message, args });
            return res.status(200).end();
          } catch (error) {
            logger.error(`Error in handler ${customId} from command ${cmdName}:`, error);
            return await handleHandlerError(message, error, res);
          }
        }
      }

      // If no exact match, try prefix matches (for custom IDs with colons like "force_add_confirm:123:WM:456")
      for (const cmdName in commands) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const command = (commands as any)[cmdName] as Command;
        
        if (command.handlers) {
          for (const handlerKey in command.handlers) {
            // Only check prefix if customId starts with handlerKey AND has a colon after it
            // This prevents "link_coc_account_modal" from matching "link_coc_account"
            if (customId.startsWith(handlerKey + ':') || customId === handlerKey) {
              try {
                const args = customId.includes(':') ? customId.split(":").slice(1) : [];
                await command.handlers[handlerKey]({ interaction: message, args });
                return res.status(200).end();
              } catch (error) {
                logger.error(`Error in handler ${handlerKey} from command ${cmdName}:`, error);
                return await handleHandlerError(message, error, res);
              }
            }
          }
        }
      }

      logger.warn("Unhandled custom_id:", customId);
      // Always return 200 to Discord even if we don't know the button, to prevent "Interaction Failed" errors
      return res.status(200).end();
    }

    // 4. HANDLE SLASH COMMANDS
    else if (message.type === InteractionType.APPLICATION_COMMAND) {
      const commandName = message.data.name.toLowerCase();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const command: Command = (commands as any)[commandName];

      if (command) {
        // Defer
        try {
          await axios.post(
            `https://discord.com/api/v10/interactions/${message.id}/${message.token}/callback`,
            {
              type: InteractionResponseType.DeferredChannelMessageWithSource,
              data: { flags: command.data.initialEphemeral ? MessageFlags.Ephemeral : 0 },
            },
            { headers: { "Content-Type": "application/json" } },
          );
        } catch (e) { return res.status(500).json({ error: "Failed to defer" }); }

        // Execute
        let commandResult: CommandExecuteUnpromised | void;
        try {
          commandResult = await command.execute({ interaction: message });
        } catch (error) {
          logger.error("Error executing command", { commandName, error });
          commandResult = { content: "An error occurred.", flags: MessageFlags.Ephemeral };
        }

        // Reply
        try {
          await axios.patch(
            `https://discord.com/api/v10/webhooks/${message.application_id}/${message.token}/messages/@original`,
            {
              content: commandResult?.content ?? "",
              embeds: commandResult?.embeds || [],
              components: commandResult?.components || [],
              flags: commandResult?.flags || 0,
            },
            { headers: { "Content-Type": "application/json" } },
          );
          return res.status(200).end();
        } catch (e) { return res.status(500).json({ error: "Failed to reply" }); }
      }
    }

    return res.status(400).json({ error: "Unknown Interaction" });

  } catch (error) {
    logger.error("Error processing request", { error });
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

// Helper function for handling errors in component/modal interactions
async function handleHandlerError(message: SimplifiedInteraction, error: any, res: VercelResponse) {
  try {
    await axios.post(
      `https://discord.com/api/v10/interactions/${message.id}/${message.token}/callback`,
      {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: { 
          content: "<a:redcross:1439044567415521443> Interaction failed due to an error.", 
          flags: MessageFlags.Ephemeral 
        }
      }
    );
  } catch (e) { /* ignore */ }
  return res.status(200).end();
}
</file>

<file path="commands/add.ts">
import axios from "axios";
import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  InteractionResponseType,
  MessageFlags,
  PermissionFlagsBits,
} from "discord-api-types/v10";
import type {
  CommandData,
  CommandExecuteResult,
  SimplifiedInteraction,
  ComponentHandler,
} from "../utils/types";
import { 
  getUserData, 
  setUserData, 
  getMainAccount,
  getUserIdByTag,
  linkTagToUser,
  type PlayerAccount
} from "../utils/kvHelper";
import { linkPlayerAccount } from "../utils/linkHelper";
import {
  IDS,
  CLAN_MAP,
  sendWelcomeDM,
  sendClanWelcome,
  processVisitorRole,
  getVisitorMessage,
  createNormalAddResultContent,
  createForceAddResultContent
} from "../utils/addHelper";

// Guild ID check constant
const MAIN_SERVER_ID = process.env.GUILD_ID || "REDACTED_WM_ID";
const COC_API_BASE_URL = "https://cocproxy.royaleapi.dev/v1";
const VERIFIED_ROLE_ID = "REDACTED_VERIFIED_ID";

export default {
  data: {
    name: "add",
    description: "Accept a member into a clan and assign roles",
    type: ApplicationCommandType.ChatInput,
    default_member_permissions: PermissionFlagsBits.ManageRoles.toString(),
    options: [
      {
        name: "member",
        description: "Member to accept",
        type: ApplicationCommandOptionType.User,
        required: true,
      },
      {
        name: "clan",
        description: "Clan abbreviation",
        type: ApplicationCommandOptionType.String,
        required: true,
        choices: [
          { name: "WM (War Master)", value: "WM" },
          { name: "LE (LEGENDS)", value: "LE" },
          { name: "ZP (ZwartePiet)", value: "ZP" },
          { name: "CH (Clash Heros)", value: "CH" },
          { name: "SP (SP.OPS.DIVISION)", value: "SP" }
        ]
      },
      {
        name: "player_tag",
        description: "Player's Clash of Clans tag (optional if member has linked account)",
        type: ApplicationCommandOptionType.String,
        required: false,
      },
    ]
  } as CommandData,
  async execute(data: {
    interaction: SimplifiedInteraction;
  }): Promise<CommandExecuteResult> {
    const interaction = data.interaction;

    // Check if command is being used in the correct server
    if (interaction.guild_id !== MAIN_SERVER_ID) {
      return {
        content: "<a:redcross:1439044567415521443> This command only works in the BOOM House server!",
        flags: MessageFlags.Ephemeral,
      };
    }

    // Check if the interaction is a chat input command
    if (interaction.data.type !== ApplicationCommandType.ChatInput) {
      return {
        content: "This command can only be used as a chat input (slash) command.",
        flags: MessageFlags.Ephemeral,
      };
    }

    const chatInteraction = interaction;

    // Find options
    const memberOption = chatInteraction.data.options?.find(
      (option) => option.name === "member"
    ) as any;
    const clanOption = chatInteraction.data.options?.find(
      (option) => option.name === "clan"
    ) as any;
    const playerTagOption = chatInteraction.data.options?.find(
      (option) => option.name === "player_tag"
    ) as any;

    const memberId = memberOption?.value;
    const clan = clanOption?.value;
    const rawPlayerTag = playerTagOption?.value;

    // Check for linked account if no player_tag provided
    let playerTag: string;
    if (!rawPlayerTag) {
      // Try to get linked account from user data
      try {
        const mainAccount = await getMainAccount(memberId);
        if (!mainAccount) {
          // No linked account - offer force add option
          // Get the ID of the staff member running the command
          const executorId = interaction.member?.user?.id;

          return {
            content: `<a:red_warning:1463226880630198476> **No Linked Account Found**\n\n<@${memberId}> has not linked their Clash of Clans account.\n\n**If you proceed:**\n• Nickname will **NOT** be updated automatically.\n• "Verified" role will **NOT** be assigned.\n• You must handle these manually.\n\nDo you want to force add them anyway?`,
            flags: MessageFlags.Ephemeral,
            components: [
              {
                type: 1, 
                components: [
                  {
                    type: 2, 
                    style: 3, // SUCCESS (Green)
                    // SECURE: Add executorId to the custom_id
                    custom_id: `add_force_confirm:${memberId}:${clan}:${executorId}`,
                    label: "Proceed Anyway",
                    emoji: { name: "✅" },
                  },
                  {
                    type: 2, 
                    style: 4, // DANGER (Red)
                    // SECURE: Add executorId to the custom_id
                    custom_id: `add_force_cancel:${executorId}`,
                    label: "Cancel",
                    emoji: { name: "❌" },
                  }
                ]
              }
            ]
          };
        }
        playerTag = mainAccount.playerTag;
      } catch (error) {
        return {
          content: "<a:redcross:1439044567415521443> Failed to check for linked account. Please provide player_tag manually.",
          flags: MessageFlags.Ephemeral,
        };
      }
    } else {
      // Validate manually provided player tag
      playerTag = rawPlayerTag.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (!playerTag || !/^[A-Z0-9]{3,15}$/.test(playerTag)) {
        return {
          content: "<a:redcross:1439044567415521443> **Invalid Player Tag**\nExample: `#ABCDEFGH` or just `ABCDEFGH`",
          flags: MessageFlags.Ephemeral,
        };
      }
    }

    // Get member from resolved data
    const memberUser = chatInteraction.data.resolved?.users?.[memberId];
    
    if (!memberUser) {
      return {
        content: "Could not find the specified member.",
        flags: MessageFlags.Ephemeral,
      };
    }

    const clanInfo = CLAN_MAP[clan as keyof typeof CLAN_MAP];
    if (!clanInfo) {
      return {
        content: "Invalid clan provided.",
        flags: MessageFlags.Ephemeral,
      };
    }

    try {
      // Verify player tag with CoC API
      const response = await fetch(`${COC_API_BASE_URL}/players/%23${playerTag}`, {
        headers: { 
          'Authorization': `Bearer ${process.env.COC_API_KEY}`, 
          'Accept': 'application/json' 
        },
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          return {
            content: `<a:redcross:1439044567415521443> **Player Not Found**\nTag **#${playerTag}** not found. Check tag or profile privacy.`,
            flags: MessageFlags.Ephemeral,
          };
        }
        throw new Error(`CoC API error: ${response.status}`);
      }
      
      const playerData = await response.json();
      const playerName = playerData.name;
      const thLevel = playerData.townHallLevel;
      const guildId = interaction.guild_id;
      const commanderName = interaction.member?.user?.username || "Staff";
      const auditReason = `Accepted into ${clanInfo.name} by ${commanderName}`;

      // Use linkHelper to link the account
      const linkResult = await linkPlayerAccount(
        playerTag,
        memberId,
        memberUser.username,
        interaction.member?.user?.id,
        guildId,
        true, // shouldAssignVerifiedRole
        false // don't set nickname here (we'll set clan-specific one)
      );

      if (!linkResult.success) {
        return {
          content: linkResult.message,
          flags: MessageFlags.Ephemeral,
        };
      }

      const wasNewlyLinked = !linkResult.userData?.accounts.find(acc => acc.playerTag === playerTag);
      let userData = linkResult.userData!;

      // Update recruitment info
      userData.recruitedAt = new Date().toISOString();
      userData.recruitedBy = interaction.member?.user?.id;
      userData.recruiterName = interaction.member?.user?.username;
      userData.clan = clan; // Set their BOOM clan
      await setUserData(memberId, userData);

      // Set nickname format: "PlayerName | CLAN"
      const nickname = `${playerName} | ${clanInfo.abbr}`;
      
      try {
        await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${memberId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bot ${process.env.DISCORD_TOKEN}`,
            'Content-Type': 'application/json',
            'X-Audit-Log-Reason': auditReason
          },
          body: JSON.stringify({ nick: nickname }),
        });
        console.log(`✅ Set nickname for ${memberId} to "${nickname}"`);
      } catch (nicknameError) {
        console.warn(`⚠️ Could not set nickname for ${memberId}:`, nicknameError);
        // Continue even if nickname fails
      }

      // ASSIGN VERIFIED ROLE
      let verifiedAssigned = false;
      try {
        const verifiedRoleResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${memberId}/roles/${VERIFIED_ROLE_ID}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bot ${process.env.DISCORD_TOKEN}`,
            'Content-Type': 'application/json',
            'X-Audit-Log-Reason': `Account added to ${clanInfo.name} by ${commanderName}`
          },
        });
        if (verifiedRoleResponse.ok) {
          verifiedAssigned = true;
          console.log(`✅ Assigned Verified role to ${memberUser.username}`);
        } else {
          console.warn(`⚠️ Failed to assign Verified role to ${memberUser.username}: ${verifiedRoleResponse.statusText}`);
        }
      } catch (roleError) {
        console.warn(`⚠️ Could not assign Verified role to ${memberId}:`, roleError);
      }

      // Process visitor role using helper
      const visitorStatus = await processVisitorRole(guildId, memberId, auditReason);
      const visitorMessage = getVisitorMessage(visitorStatus);

      // Assign BOOM Member role
      const boomRoleResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${memberId}/roles/${IDS.ROLES.BOOM_MEMBER}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bot ${process.env.DISCORD_TOKEN}`,
          'Content-Type': 'application/json',
          'X-Audit-Log-Reason': auditReason
        },
      });

      if (!boomRoleResponse.ok) {
        throw new Error(`Failed to assign BOOM Member role: ${boomRoleResponse.statusText}`);
      }

      // Assign clan role
      const clanRoleResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${memberId}/roles/${clanInfo.role}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bot ${process.env.DISCORD_TOKEN}`,
          'Content-Type': 'application/json',
          'X-Audit-Log-Reason': auditReason
        },
      });

      if (!clanRoleResponse.ok) {
        throw new Error(`Failed to assign clan role: ${clanRoleResponse.statusText}`);
      }

      // Send DM and clan welcome using helpers
      await sendWelcomeDM(memberId, clanInfo);
      await sendClanWelcome(memberId, clanInfo);

      // Create result content using helper
      const resultContent = createNormalAddResultContent(
        memberUser.username,
        memberId,
        clanInfo,
        nickname,
        wasNewlyLinked,
        playerName,
        thLevel,
        playerTag,
        visitorMessage,
        verifiedAssigned,
        interaction.member?.user?.id
      );

      return {
        content: resultContent,
      };

    } catch (error) {
      console.error('Error in add command:', error);
      
      return {
        content: `<a:redcross:1439044567415521443> **Recruitment Failed**\n${error instanceof Error ? error.message : 'Unknown error'}`,
        flags: MessageFlags.Ephemeral,
      };
    }
  },

  // Button handlers for force add confirmation
  handlers: {
    "add_force_cancel": async ({ interaction, args }: { interaction: SimplifiedInteraction; args: string[] }) => {
      const [executorId] = args; 

      // SECURITY CHECK: Verify if the clicker is the original command runner
      if (interaction.member?.user?.id !== executorId) {
        // FIX: Explicitly tell Discord this is unauthorized
        await axios.post(
          `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`,
          {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: { 
              content: "<a:Warning:1456190079830720625> This button is not for you.", 
              flags: MessageFlags.Ephemeral 
            }
          }
        );
        return;
      }

      // Proceed if authorized
      await axios.post(
        `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`,
        {
          type: InteractionResponseType.UpdateMessage,
          data: { content: "<a:redcross:1439044567415521443> **Force Add Cancelled**", components: [], flags: MessageFlags.Ephemeral }
        }
      );
    },

    "add_force_confirm": async ({ interaction, args }: { interaction: SimplifiedInteraction; args: string[] }) => {
      const [memberId, clan, executorId] = args;

      // SECURITY CHECK: Verify if the clicker is the original command runner
      if (interaction.member?.user?.id !== executorId) {
        // FIX: Explicitly tell Discord this is unauthorized
        await axios.post(
          `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`,
          {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: { 
              content: "<a:Warning:1456190079830720625> This button is not for you.", 
              flags: MessageFlags.Ephemeral 
            }
          }
        );
        return;
      }
      
      const guildId = interaction.guild_id!;
      
      // Defer Update
      await axios.post(
        `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`,
        { type: InteractionResponseType.DeferredMessageUpdate }
      );

      try {
        const clanInfo = CLAN_MAP[clan as keyof typeof CLAN_MAP];
        const auditReason = `Force added by ${interaction.member?.user?.username} (No Link)`;
        
        // Get member info for response
        const memberResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${memberId}`, {
          headers: { "Authorization": `Bot ${process.env.DISCORD_TOKEN}` },
        });
        
        let memberUsername = "Member";
        if (memberResponse.ok) {
          const member = await memberResponse.json();
          memberUsername = member.user?.username || "Member";
        }

        // Update KV
        let userData = await getUserData(memberId);
        if (!userData) {
          userData = { 
            discordId: memberId, 
            discordName: memberUsername, 
            accounts: [], 
            lastUpdated: new Date().toISOString() 
          };
        }
        userData.recruitedAt = new Date().toISOString();
        userData.recruitedBy = interaction.member?.user?.id;
        userData.recruiterName = interaction.member?.user?.username;
        userData.clan = clan;
        await setUserData(memberId, userData);

        // Assign BOOM Member role
        const boomRoleResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${memberId}/roles/${IDS.ROLES.BOOM_MEMBER}`, {
          method: "PUT",
          headers: {
            "Authorization": `Bot ${process.env.DISCORD_TOKEN}`,
            "X-Audit-Log-Reason": auditReason,
          },
        });

        if (!boomRoleResponse.ok) {
          throw new Error(`Failed to assign BOOM Member role: ${boomRoleResponse.statusText}`);
        }

        // Assign clan role
        const clanRoleResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${memberId}/roles/${clanInfo.role}`, {
          method: "PUT",
          headers: {
            "Authorization": `Bot ${process.env.DISCORD_TOKEN}`,
            "X-Audit-Log-Reason": auditReason,
          },
        });

        if (!clanRoleResponse.ok) {
          throw new Error(`Failed to assign clan role: ${clanRoleResponse.statusText}`);
        }

        // Process visitor role using helper
        const visitorStatus = await processVisitorRole(guildId, memberId, auditReason);
        const visitorMessage = getVisitorMessage(visitorStatus);

        // Send DM and clan welcome using helpers
        await sendWelcomeDM(memberId, clanInfo);
        await sendClanWelcome(memberId, clanInfo);

        // Create result content using helper
        const resultContent = createForceAddResultContent(
          memberUsername,
          memberId,
          clanInfo,
          visitorMessage,
          interaction.member?.user?.id
        );

        // Final Update
        await axios.patch(
          `https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`,
          {
            content: resultContent,
            components: []
          },
          { headers: { "Content-Type": "application/json" } }
        );

      } catch (error) {
        console.error("Force add failed", error);
        
        await axios.patch(
          `https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`,
          { 
            content: `<a:redcross:1439044567415521443> **Force Add Failed**\n${error instanceof Error ? error.message : 'Unknown error'}`,
            components: [] 
          }
        );
      }
    }
  }
};
</file>

</files>

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
import { ROLE_IDS, CHANNEL_IDS, MAIN_SERVER_ID } from "../utils/config";

// Role IDs used for ticket permissions (you can also put these in config)
const JOIN_LEADERSHIP_ROLE = ROLE_IDS.TICKET_JOIN_LEADERSHIP_ROLE;
const STAFF_LEADERSHIP_ROLE = ROLE_IDS.TICKET_STAFF_LEADERSHIP_ROLE;
const TICKET_CATEGORY = CHANNEL_IDS.TICKET_CATEGORY; // must be set in config

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
        content: "<a:redcross:1495393630112841839> This command only works in the BOOM House server!",
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

📍 You can view all our clans here: <#${CHANNEL_IDS.CLANS_LIST}>  

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

      // Defer ephemerally so status/errors stay private
      await axios.post(
        `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`,
        {
          type: InteractionResponseType.DeferredChannelMessageWithSource,
          data: { flags: MessageFlags.Ephemeral },
        }
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
        const creatorId = creatorMatch ? creatorMatch[1] : null;
        const ticketType = typeMatch ? typeMatch[1] : null;

        // Determine required staff role
        let requiredRole = null;
        if (ticketType === "apply_join") {
          requiredRole = ROLE_IDS.TICKET_JOIN_LEADERSHIP_ROLE;
        } else if (ticketType === "chat_staff" || ticketType === "apply_staff") {
          requiredRole = ROLE_IDS.TICKET_STAFF_LEADERSHIP_ROLE;
        }

        // Check if user has the required role (or is creator)
        let hasPermission = userId === creatorId;
        if (!hasPermission && requiredRole) {
          const memberRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
            headers: { Authorization: `Bot ${process.env.DISCORD_TOKEN}` },
          });
          if (memberRes.ok) {
            const member = await memberRes.json();
            hasPermission = member.roles?.includes(requiredRole);
          }
        }

        if (!hasPermission) {
          await axios.patch(
            `https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`,
            { content: "<a:redcross:1495393630112841839> You don't have permission to close this ticket." }
          );
          return;
        }

        // Send confirmation message with buttons
        const components = [
          {
            type: 1,
            components: [
              {
                type: 2,
                style: 4,
                custom_id: `confirm_close_ticket:${userId}`,
                label: "Proceed",
                emoji: { name: "✅" },
              },
              {
                type: 2,
                style: 2,
                custom_id: `cancel_close_ticket:${userId}`,
                label: "Cancel",
                emoji: { name: "❌" },
              },
            ],
          },
        ];

        await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
          method: "POST",
          headers: {
            Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: `<@${userId}>, are you sure you want to close this ticket?`,
            components,
          }),
        });

        // Optionally, edit the original button message to indicate confirmation sent
        await axios.patch(
          `https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`,
          { content: "<a:AnimatedCheck:1495392848072413275> Confirmation sent." }
        );
      } catch (error) {
        console.error("Error initiating ticket close:", error);
        await axios.patch(
          `https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`,
          { content: "<a:redcross:1495393630112841839> Failed to initiate close." }
        );
      }
    },

    confirm_close_ticket: async ({ interaction, args }: { interaction: SimplifiedInteraction; args: string[] }) => {
      const [userId] = args;
      const clickerId = interaction.member?.user?.id;
      const channelId = interaction.channel_id;

      if (clickerId !== userId) {
        await axios.post(
          `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`,
          {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: "<a:Warning:1495394548984315904> This button is not for you.",
              flags: MessageFlags.Ephemeral,
            },
          }
        );
        return;
      }

      await axios.post(
        `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`,
        { type: InteractionResponseType.DeferredMessageUpdate }
      );

      try {
        await fetch(`https://discord.com/api/v10/channels/${channelId}`, {
          method: "DELETE",
          headers: { Authorization: `Bot ${process.env.DISCORD_TOKEN}` },
        });
      } catch (error) {
        console.error("Error closing ticket:", error);
        await axios.patch(
          `https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`,
          { content: "<a:redcross:1495393630112841839> Failed to close ticket." }
        );
      }
    },

    cancel_close_ticket: async ({ interaction, args }: { interaction: SimplifiedInteraction; args: string[] }) => {
      const [userId] = args;
      const clickerId = interaction.member?.user?.id;

      if (clickerId !== userId) {
        await axios.post(
          `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`,
          {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: "<a:Warning:1495394548984315904> This button is not for you.",
              flags: MessageFlags.Ephemeral,
            },
          }
        );
        return;
      }

      await axios.post(
        `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`,
        { type: InteractionResponseType.DeferredMessageUpdate }
      );

      try {
        await axios.patch(
          `https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`,
          {
            content: "<a:redcross:1495393630112841839> Ticket close cancelled.",
            components: [],
          }
        );
      } catch (error) {
        console.error("Error cancelling close:", error);
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
      "<a:redcross:1495393630112841839> You must link your Clash of Clans account first!\nUse `/link` or the **Link Account** button to get verified."
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
        content: `<a:AnimatedCheck:1495392848072413275> Your ticket has been created: <#${channel.id}>`,
        flags: MessageFlags.Ephemeral,
      }
    );
  } catch (error) {
    console.error("Error creating ticket:", error);
    await axios.patch(
      `https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`,
      {
        content: "<a:redcross:1495393630112841839> Failed to create ticket due to an internal error.",
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
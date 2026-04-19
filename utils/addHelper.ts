import { CHANNEL_IDS, ROLE_IDS } from "./config";

// Re-export for backward compatibility
export const IDS = {
  ROLES: ROLE_IDS,
  CHANNELS: CHANNEL_IDS
};

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
        title: `<a:pepopalmas:1495395645735829564> Congratulations! You are now a ${clanInfo.name} Member!`,
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
    const content = `Welcome <@${memberId}> to your clan's general chat! <a:heya:1495395980021858566> — feel free to look around! <a:KnightCheergif:1495396229754916874>`;

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
    return `<a:AnimatedCheck:1495392848072413275> Removed **Visitor** role.\n`;
  } else if (visitorStatus === "not_present") {
    return `<a:redcross:1495393630112841839> **Visitor** role not present.\n`;
  } else {
    return `<a:redcross:1495393630112841839> Could not check/remove **Visitor** role.\n`;
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
    ? `<a:AnimatedCheck:1495392848072413275> **Account Linked:** ${playerName} | TH${thLevel} (#${playerTag}) added to their profile\n`
    : `<a:AnimatedCheck:1495392848072413275> **Account Already Linked:** Using existing account ${playerName} | TH${thLevel} (#${playerTag})\n`;

  const verifiedMessage = verifiedAssigned ? `**Verified**, ` : "";

  return (
    `<a:AnimatedCheck:1495392848072413275> **${memberUsername}** has been accepted into **${clanInfo.name}** by <@${executorId}>.\n` +
    `<a:AnimatedCheck:1495392848072413275> **Nickname set to:** ${nickname}\n` +
    linkingStatus +
    visitorMessage +
    `<a:AnimatedCheck:1495392848072413275> Assigned ${verifiedMessage}**BOOM Member** and **${clanInfo.name} Member** Roles.\n` +
    `<a:AnimatedCheck:1495392848072413275> A welcome DM has been sent. 📩\n` +
    `<a:AnimatedCheck:1495392848072413275> Introduced them in <#${clanInfo.channel}>`
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
    `<a:AnimatedCheck:1495392848072413275> **${memberUsername}** has been **force added** into **${clanInfo.name}** by <@${executorId}>.\n` +
    `<a:red_warning:1495394167877009549> **Manual Actions Required:**\n` +
    `• Update their nickname manually.\n` +
    `• Verify their account manually if needed.\n` +
    visitorMessage +
    `<a:AnimatedCheck:1495392848072413275> Assigned **BOOM Member** and **${clanInfo.name} Member** Roles.\n` +
    `<a:AnimatedCheck:1495392848072413275> A welcome DM has been sent. 📩\n` +
    `<a:AnimatedCheck:1495392848072413275> Introduced them in <#${clanInfo.channel}>`
  );
}
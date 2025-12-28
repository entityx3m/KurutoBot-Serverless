import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  MessageFlags,
  PermissionFlagsBits,
} from "discord-api-types/v10";
import type {
  CommandData,
  CommandExecuteResult,
  SimplifiedInteraction,
} from "../utils/types";
import { RecruitmentTracker } from "../utils/recruitment";

// Guild ID check constant
const MAIN_SERVER_ID = process.env.GUILD_ID || "REDACTED_WM_ID";

// Role & Channel IDs
const IDS = {
  ROLES: {
    BOOM_MEMBER: 'REDACTED_BOOM_MEMBER_ID',
    WM: 'REDACTED_WM_ID',
    LE: 'REDACTED_LE_ID',
    ZP: 'REDACTED_ZP_ID',
    CH: 'REDACTED_CH_ID',
    VISITOR: 'REDACTED_VISITOR_ID'
  },
  CHANNELS: {
    WM: 'REDACTED_CHANNEL_WM_ID',
    LE: 'REDACTED_CHANNEL_LE_ID',
    ZP: 'REDACTED_CHANNEL_ZP_ID',
    CH: 'REDACTED_CHANNEL_CH_ID',
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
  CH: { role: IDS.ROLES.CH, channel: IDS.CHANNELS.CH, name: 'Clash Heros' }
};

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
          { name: "CH (Clash Heros)", value: "CH" }
        ]
      },
      {
        name: "pingclan",
        description: "Ping the clan role in their general channel?",
        type: ApplicationCommandOptionType.Boolean,
        required: false,
      }
    ]
  } as CommandData,
  async execute(data: {
    interaction: SimplifiedInteraction;
  }): Promise<CommandExecuteResult> {
    const interaction = data.interaction;

    // Check if command is being used in the correct server
    if (interaction.guild_id !== MAIN_SERVER_ID) {
      return {
        content: "❌ This command only works in the BOOM House server!",
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
    const pingClanOption = chatInteraction.data.options?.find(
      (option) => option.name === "pingclan"
    ) as any;

    const memberId = memberOption?.value;
    const clan = clanOption?.value;
    const pingClan = pingClanOption?.value;

    // Get member from resolved data
    const memberData = chatInteraction.data.resolved?.members?.[memberId];
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

    // Get display name (server nickname -> global name -> username)
    const displayName = memberData?.nick || memberUser.global_name || memberUser.username;

    // Correct handling of default pingclan value
    const shouldPingClan = (typeof pingClan === 'boolean') ? pingClan : true;

    try {
      const guildId = interaction.guild_id;
      const auditReason = `Accepted into ${clanInfo.name} by ${interaction.member?.user?.username || 'unknown'}`;

      let visitorStatus = 'not_present'; // 'removed', 'not_present', or 'error'

      // First, check if user actually has the Visitor role
      try {
        // Fetch the member to see their current roles
        const memberResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${memberId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bot ${process.env.DISCORD_TOKEN}`,
          },
        });

        if (memberResponse.ok) {
          const memberInfo = await memberResponse.json();
          const hasVisitorRole = memberInfo.roles?.includes(IDS.ROLES.VISITOR);
          
          if (hasVisitorRole) {
            // User has the role, so remove it
            const removeResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${memberId}/roles/${IDS.ROLES.VISITOR}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bot ${process.env.DISCORD_TOKEN}`,
                'X-Audit-Log-Reason': auditReason
              },
            });

            if (removeResponse.ok) {
              visitorStatus = 'removed';
              console.log(`✅ Removed Visitor role from ${displayName}`);
            } else {
              visitorStatus = 'error';
              console.warn(`⚠️ Failed to remove Visitor role from ${displayName}: ${removeResponse.statusText}`);
            }
          } else {
            // User doesn't have the role
            visitorStatus = 'not_present';
            console.log(`ℹ️ Visitor role not present on ${displayName}`);
          }
        } else {
          visitorStatus = 'error';
          console.warn(`⚠️ Could not fetch member info for ${displayName}: ${memberResponse.statusText}`);
        }
      } catch (visitorError) {
        visitorStatus = 'error';
        console.warn(`⚠️ Error processing Visitor role for ${displayName}:`, visitorError);
      }

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

      // Update recruitment tracker in Redis
      let recruitmentStatus = '';
      try {
        const incrementSuccess = await RecruitmentTracker.incrementCurrent(clan);
        
        if (incrementSuccess) {
          const clanData = await RecruitmentTracker.getClan(clan);
          if (clanData) {
            const { current, needed } = clanData;
            const remaining = Math.max(0, needed - current);
            
            if (needed > 0) {
              const progress = Math.min(Math.round((current / needed) * 100), 100);
              const progressBar = RecruitmentTracker.createProgressBar(progress);
              recruitmentStatus = `\n📊 **Recruitment Progress:** ${current}/${needed} (${remaining} left)\n${progressBar} ${progress}%`;
            } else {
              recruitmentStatus = `\n📊 **Recruitment:** Goal not set yet. Use \`/setrecruit ${clan} <number>\``;
            }
          }
        }
      } catch (trackerError) {
        console.warn('⚠️ Failed to update recruitment tracker:', trackerError);
        recruitmentStatus = `\n⚠️ **Note:** Could not update recruitment counter`;
      }

      // Send DM (non-blocking)
      try {
        const dmChannelResponse = await fetch(`https://discord.com/api/v10/users/@me/channels`, {
          method: 'POST',
          headers: {
            'Authorization': `Bot ${process.env.DISCORD_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            recipient_id: memberId,
          }),
        });

        if (dmChannelResponse.ok) {
          const dmChannel = await dmChannelResponse.json();
          
          const dmEmbed = {
            title: `<a:pepopalmas:1409737253130993704> Congratulations! You are now a ${clanInfo.name} Member!`,
            thumbnail: { url: 'https://cdn.discordapp.com/attachments/1412097601289064609/1430484430425948270/Picsart_25-10-22_17-08-58-571.png?ex=69179bb1&is=69164a31&hm=85819bb5eb797fc5994da98ff62dfb841885ee87eecf8beb8b4617e47a70dfe1' },
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

          await fetch(`https://discord.com/api/v10/channels/${dmChannel.id}/messages`, {
            method: 'POST',
            headers: {
              'Authorization': `Bot ${process.env.DISCORD_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              embeds: [dmEmbed],
            }),
          });
        }
      } catch (dmError) {
        console.warn(`Could not DM user ${memberId}, they may have DMs disabled.`);
      }

      // Announce in clan channel
      try {
        const content = shouldPingClan
          ? `<@&${clanInfo.role}> Plz welcome our newest clan member <@${memberId}>! <a:heya:1427561870797180928> — glad to have you on board! <a:KnightCheergif:1427561243811647548>`
          : `Welcome <@${memberId}> to your clan's general chat! <a:heya:1427561870797180928> — feel free to look around! <a:KnightCheergif:1427561243811647548>`;

        await fetch(`https://discord.com/api/v10/channels/${clanInfo.channel}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bot ${process.env.DISCORD_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: content,
          }),
        });
      } catch (channelError) {
        console.error('Failed to send clan channel welcome:', channelError);
      }

      // Return the final response with display name
      let visitorMessage = '';
      if (visitorStatus === 'removed') {
        visitorMessage = `<a:AnimatedCheck:1427570005750448169> Removed **Visitor** role.\n`;
      } else if (visitorStatus === 'not_present') {
        visitorMessage = `<a:redcross:1439044567415521443> **Visitor** role not present.\n`;
      } else {
        visitorMessage = `<a:redcross:1439044567415521443> Could not check/remove **Visitor** role.\n`;
      }

      const resultContent = `<a:AnimatedCheck:1427570005750448169> **${displayName}** has been accepted into **${clanInfo.name}** by <@${interaction.member?.user?.id}>.\n` +
        visitorMessage +
        `<a:AnimatedCheck:1427570005750448169> Assigned **BOOM Member** and **${clanInfo.name} Member** Roles.\n` +
        `<a:AnimatedCheck:1427570005750448169> A welcome DM has been sent. 📩\n` +
        (shouldPingClan
          ? `<a:AnimatedCheck:1427570005750448169> Introduced them in <#${clanInfo.channel}> and pinged their clan members.`
          : `<a:AnimatedCheck:1427570005750448169> Introduced them in <#${clanInfo.channel}> without pinging the clan members.`) +
        recruitmentStatus;

      return {
        content: resultContent,
      };

    } catch (error) {
      console.error('Error in add command:', error);
      
      return {
        content: `Failed to process the command: ${error instanceof Error ? error.message : 'Unknown error'}`,
        flags: MessageFlags.Ephemeral,
      };
    }
  },
};
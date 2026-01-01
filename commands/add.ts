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
import { kv } from '@vercel/kv';

// Guild ID check constant
const MAIN_SERVER_ID = process.env.GUILD_ID || "REDACTED_WM_ID";
const COC_API_BASE_URL = "https://cocproxy.royaleapi.dev/v1"; // NEW: Added CoC API URL

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

// UPDATED: Added abbr and tag fields
const CLAN_MAP = {
  WM: { role: IDS.ROLES.WM, channel: IDS.CHANNELS.WM, name: 'WAR MASTER', abbr: 'WM', tag: 'REDACTED_WM_CLAN_TAG' },
  LE: { role: IDS.ROLES.LE, channel: IDS.CHANNELS.LE, name: 'LEGENDS', abbr: 'LE', tag: 'REDACTED_LE_CLAN_TAG' },
  ZP: { role: IDS.ROLES.ZP, channel: IDS.CHANNELS.ZP, name: 'ZwartePiet', abbr: 'ZP', tag: 'REDACTED_ZP_CLAN_TAG' },
  CH: { role: IDS.ROLES.CH, channel: IDS.CHANNELS.CH, name: 'Clash Heros', abbr: 'CH', tag: 'REDACTED_CH_CLAN_TAG' }
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
      // UPDATED: Made player_tag optional, added force option
      {
        name: "player_tag",
        description: "Player's Clash of Clans tag (optional if member has linked account)",
        type: ApplicationCommandOptionType.String,
        required: false,
      },
      {
        name: "force",
        description: "Force add even if player is in different clan?",
        type: ApplicationCommandOptionType.Boolean,
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

    // Find options (UPDATED: Added force option, made player_tag optional)
    const memberOption = chatInteraction.data.options?.find(
      (option) => option.name === "member"
    ) as any;
    const clanOption = chatInteraction.data.options?.find(
      (option) => option.name === "clan"
    ) as any;
    const playerTagOption = chatInteraction.data.options?.find(
      (option) => option.name === "player_tag"
    ) as any;
    const forceOption = chatInteraction.data.options?.find(
      (option) => option.name === "force"
    ) as any;

    const memberId = memberOption?.value;
    const clan = clanOption?.value;
    const rawPlayerTag = playerTagOption?.value;
    const force = forceOption?.value || false;
    

    // NEW: Check for linked account if no player_tag provided
    let playerTag: string;
    if (!rawPlayerTag) {
      // Try to get linked account from KV
      try {
        const linkedTag = await kv.get(`linked:${memberId}`);
        if (!linkedTag || typeof linkedTag !== 'string') {
          return {
            content: `❌ **No Linked Account**\n<@${memberId}> has not linked their CoC account yet.\n\nEither:\n• Ask them to click the "Link Account" button in the verification channel\n• Or manually provide their player tag: \`/add member:@user clan:XX player_tag:#TAG\``,
            flags: MessageFlags.Ephemeral,
          };
        }
        playerTag = linkedTag;
      } catch (error) {
        return {
          content: "❌ Failed to check for linked account. Please provide player_tag manually.",
          flags: MessageFlags.Ephemeral,
        };
      }
    } else {
      // Validate manually provided player tag
      playerTag = rawPlayerTag.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (!playerTag || !/^[A-Z0-9]{3,15}$/.test(playerTag)) {
        return {
          content: "❌ **Invalid Player Tag**\nExample: `#ABCDEFGH` or just `ABCDEFGH`",
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
      // NEW: Verify player tag with CoC API
      const response = await fetch(`${COC_API_BASE_URL}/players/%23${playerTag}`, {
        headers: { 
          'Authorization': `Bearer ${process.env.COC_API_KEY}`, 
          'Accept': 'application/json' 
        },
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          return {
            content: `❌ **Player Not Found**\nTag **#${playerTag}** not found. Check tag or profile privacy.`,
            flags: MessageFlags.Ephemeral,
          };
        }
        throw new Error(`CoC API error: ${response.status}`);
      }
      
      const playerData = await response.json();
      const playerName = playerData.name;
      const thLevel = playerData.townHallLevel;
      
      // UPDATED: Check if player is in the correct clan (with force option)
      if (playerData.clan) {
        const expectedClanTag = clanInfo.tag.replace('#', '');
        const actualClanTag = playerData.clan.tag.replace('#', '');
        
        if (actualClanTag !== expectedClanTag && !force) {
          return {
            content: `⚠️ **Clan Mismatch**\nPlayer **${playerName}** is in clan **${playerData.clan.name}**, not **${clanInfo.name}**.\n\n*To proceed anyway, use the \`force\` option:*\n\`/add member:@${memberUser.username} clan:${clan} force:true\``,
            flags: MessageFlags.Ephemeral,
          };
        }
        
        if (actualClanTag !== expectedClanTag && force) {
          // Log the forced addition
          console.log(`⚠️ Force adding ${playerName} to ${clanInfo.name} despite being in ${playerData.clan.name}`);
        }
      }

      const guildId = interaction.guild_id;
      const commanderName = interaction.member?.user?.username || "Staff";
      const auditReason = `Accepted into ${clanInfo.name} by ${commanderName}`;

      // NEW: Set nickname format: "PlayerName | CLAN"
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

      let visitorStatus = 'not_present'; // 'removed', 'not_present', or 'error'

      // First, check if user actually has the Visitor role
      try {
        // Fetch the member to see their current roles
        const fetchMemberResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${memberId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bot ${process.env.DISCORD_TOKEN}`,
          },
        });

        if (fetchMemberResponse.ok) {
          const fetchedMember = await fetchMemberResponse.json();
          const hasVisitorRole = fetchedMember.roles?.includes(IDS.ROLES.VISITOR);
          
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
              console.log(`✅ Removed Visitor role from ${memberUser.username}`);
            } else {
              visitorStatus = 'error';
              console.warn(`⚠️ Failed to remove Visitor role from ${memberUser.username}: ${removeResponse.statusText}`);
            }
          } else {
            // User doesn't have the role
            visitorStatus = 'not_present';
            console.log(`ℹ️ Visitor role not present on ${memberUser.username}`);
          }
        } else {
          visitorStatus = 'error';
          console.warn(`⚠️ Could not fetch member info for ${memberUser.username}: ${fetchMemberResponse.statusText}`);
        }
      } catch (visitorError) {
        visitorStatus = 'error';
        console.warn(`⚠️ Error processing Visitor role for ${memberUser.username}:`, visitorError);
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
        const content = `Welcome <@${memberId}> to your clan's general chat! <a:heya:1427561870797180928> — feel free to look around! <a:KnightCheergif:1427561243811647548>`;

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

      // UPDATED: Return response with player info
      let visitorMessage = '';
      if (visitorStatus === 'removed') {
        visitorMessage = `<a:AnimatedCheck:1427570005750448169> Removed **Visitor** role.\n`;
      } else if (visitorStatus === 'not_present') {
        visitorMessage = `<a:redcross:1439044567415521443> **Visitor** role not present.\n`;
      } else {
        visitorMessage = `<a:redcross:1439044567415521443> Could not check/remove **Visitor** role.\n`;
      }

      const resultContent = `<a:AnimatedCheck:1427570005750448169> **${memberUser.username}** has been accepted into **${clanInfo.name}** by <@${interaction.member?.user?.id}>.\n` +
        `<a:AnimatedCheck:1427570005750448169> **Player:** ${playerName} (#${playerTag}) | TH${thLevel}\n` +
        `<a:AnimatedCheck:1427570005750448169> **Nickname set to:** ${nickname}\n` +
        visitorMessage +
        `<a:AnimatedCheck:1427570005750448169> Assigned **BOOM Member** and **${clanInfo.name} Member** Roles.\n` +
        `<a:AnimatedCheck:1427570005750448169> A welcome DM has been sent. 📩\n` +
        `<a:AnimatedCheck:1427570005750448169> Introduced them in <#${clanInfo.channel}>`;

      return {
        content: resultContent,
      };

    } catch (error) {
      console.error('Error in add command:', error);
      
      return {
        content: `❌ **Recruitment Failed**\n${error instanceof Error ? error.message : 'Unknown error'}`,
        flags: MessageFlags.Ephemeral,
      };
    }
  },
};
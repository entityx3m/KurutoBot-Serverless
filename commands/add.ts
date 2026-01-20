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
                    custom_id: `force_add_confirm:${memberId}:${clan}:${executorId}`,
                    label: "Proceed Anyway",
                    emoji: { name: "✅" },
                  },
                  {
                    type: 2, 
                    style: 4, // DANGER (Red)
                    // SECURE: Add executorId to the custom_id
                    custom_id: `force_add_cancel:${executorId}`,
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

      // Get or create user data for this member
      let userData = await getUserData(memberId);
      const isFirstAccount = !userData || userData.accounts.length === 0;

      if (!userData) {
        userData = {
          discordId: memberId,
          discordName: memberUser.username,
          accounts: [],
          lastUpdated: new Date().toISOString(),
        };
      }

      // Check if account already linked to this user
      const existingAccount = userData.accounts.find(acc => acc.playerTag === playerTag);
      if (!existingAccount) {
        // Check if tag is already linked to someone else
        const existingUserId = await getUserIdByTag(playerTag);
        if (existingUserId && existingUserId !== memberId) {
          return {
            content: `<a:redcross:1439044567415521443> **Tag Already Used**\nAccount **#${playerTag}** is already linked to another user.`,
            flags: MessageFlags.Ephemeral,
          };
        }
        
        // Create new account record
        const newAccount: PlayerAccount = {
          playerTag,
          playerName,
          townHallLevel: thLevel,
          expLevel: playerData.expLevel,
          leagueTier: playerData.leagueTier ? {
            name: playerData.leagueTier.name,
            iconUrls: playerData.leagueTier.iconUrls
          } : undefined,
          clan: playerData.clan ? {
            tag: playerData.clan.tag,
            name: playerData.clan.name
          } : undefined,
          role: playerData.role,
          warPreference: playerData.warPreference,
          isMain: isFirstAccount,
          linkedAt: new Date().toISOString(),
          linkedBy: interaction.member?.user?.id, // Staff member who added them
        };
        
        // Add account to user data
        userData.accounts.push(newAccount);
        
        // If this is the first account, set as main
        if (isFirstAccount) {
          userData.mainAccountTag = playerTag;
        }
        
        // Save user data and create reverse mapping
        await setUserData(memberId, userData);
        await linkTagToUser(playerTag, memberId);
        
        console.log(`✅ Linked account #${playerTag} to ${memberUser.username} during recruitment`);
      }

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
        !existingAccount,
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
    "force_add_cancel": async ({ interaction, args }: { interaction: SimplifiedInteraction; args: string[] }) => {
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

    "force_add_confirm": async ({ interaction, args }: { interaction: SimplifiedInteraction; args: string[] }) => {
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
import axios from "axios";
import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  InteractionResponseType,
  MessageFlags,
  PermissionFlagsBits,
} from "discord-api-types/v10";
import type {
  CommandAutocompleteResult,
  CommandData,
  CommandExecuteResult,
  SimplifiedInteraction,
  InteractionDataOption,
} from "../utils/types";
import { 
  getUserData, 
  setUserData, 
  getMainAccount
} from "../utils/dbHelper";
import { linkPlayerAccount } from "../utils/linkHelper";
import {
  IDS,
  sendWelcomeDM,
  sendClanWelcome,
  processVisitorRole,
  getVisitorMessage,
  createNormalAddResultContent,
  createForceAddResultContent
} from "../utils/addHelper";
import { API_URLS, MAIN_SERVER_ID, ROLE_IDS } from "../utils/config";
import { addMemberRole, setMemberNickname } from "../utils/discordApi";
import { getMainClanAutocompleteChoices, getMainClanByTagOrName } from "../utils/clanSetup";

const COC_API_BASE_URL = API_URLS.COC_API_BASE;

function getOptionValue(options: InteractionDataOption[] | undefined, name: string): string | undefined {
  const option = options?.find((opt) => opt.name === name);
  return typeof option?.value === "string" ? option.value : undefined;
}

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
        description: "Configured main clan",
        type: ApplicationCommandOptionType.String,
        required: true,
        autocomplete: true,
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
        content: "<a:redcross:1495393630112841839> This command only works in the BOOM House server!",
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

    const options = chatInteraction.data.options as InteractionDataOption[] | undefined;
    const memberId = getOptionValue(options, "member");
    const clanInput = getOptionValue(options, "clan");
    const rawPlayerTag = getOptionValue(options, "player_tag");

    if (!memberId || !clanInput) {
      return {
        content: "<a:redcross:1495393630112841839> Missing required command options.",
        flags: MessageFlags.Ephemeral,
      };
    }

    const clanConfig = await getMainClanByTagOrName(clanInput);
    if (!clanConfig || !clanConfig.clanRoleId || !clanConfig.clanChannelId) {
      return {
        content: "<a:redcross:1495393630112841839> Invalid clan selection. Please configure the clan via `/setup clan` first.",
        flags: MessageFlags.Ephemeral,
      };
    }

    const clanInfo = {
      role: clanConfig.clanRoleId,
      channel: clanConfig.clanChannelId,
      name: clanConfig.clanName,
      abbr: clanConfig.abbreviation,
      tag: clanConfig.clanTag,
    };

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
            content: `<a:red_warning:1495394167877009549> **No Linked Account Found**\n\n<@${memberId}> has not linked their Clash of Clans account.\n\n**If you proceed:**\n• Nickname will **NOT** be updated automatically.\n• "Verified" role will **NOT** be assigned.\n• You must handle these manually.\n\nDo you want to force add them anyway?`,
            flags: MessageFlags.Ephemeral,
            components: [
              {
                type: 1, 
                components: [
                  {
                    type: 2, 
                    style: 3, // SUCCESS (Green)
                    // SECURE: Add executorId to the custom_id
                    custom_id: `add_force_confirm:${memberId}:${clanConfig.clanTag}:${executorId}`,
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
          content: "<a:redcross:1495393630112841839> Failed to check for linked account. Please provide player_tag manually.",
          flags: MessageFlags.Ephemeral,
        };
      }
    } else {
      // Validate manually provided player tag
      playerTag = rawPlayerTag.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (!playerTag || !/^[A-Z0-9]{3,15}$/.test(playerTag)) {
        return {
          content: "<a:redcross:1495393630112841839> **Invalid Player Tag**\nExample: `#ABCDEFGH` or just `ABCDEFGH`",
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

    try {
      // Verify player tag with CoC API
      const response = await fetch(`${COC_API_BASE_URL}/players/%23${playerTag}`, {
        headers: { 
          'Authorization': `Bearer ${process.env.COC_API_KEY}`, 
          'Accept': 'application/json' 
        },
        signal: AbortSignal.timeout(7000),
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          return {
            content: `<a:redcross:1495393630112841839> **Player Not Found**\nTag **#${playerTag}** not found. Check tag or profile privacy.`,
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
      userData.clan = clanConfig.clanTag; // Set their BOOM clan reference
      await setUserData(memberId, userData);

      // Set nickname format: "PlayerName | ABBR"
      const nickname = `${playerName} | ${clanInfo.abbr}`;
      
      try {
        const nicknameResult = await setMemberNickname(guildId, memberId, nickname, auditReason);
        if (!nicknameResult.success) {
          console.warn(`⚠️ Could not set nickname for ${memberId}: ${nicknameResult.error}`);
        } else {
          console.log(`✅ Set nickname for ${memberId} to "${nickname}"`);
        }
      } catch (nicknameError) {
        console.warn(`⚠️ Could not set nickname for ${memberId}:`, nicknameError);
        // Continue even if nickname fails
      }

      // ASSIGN VERIFIED ROLE
      let verifiedAssigned = false;
      try {
        const verifiedRoleResult = await addMemberRole(
          guildId,
          memberId,
          ROLE_IDS.VERIFIED,
          `Account added to ${clanInfo.name} by ${commanderName}`
        );
        if (verifiedRoleResult.success) {
          verifiedAssigned = true;
          console.log(`✅ Assigned Verified role to ${memberUser.username}`);
        } else {
          console.warn(`⚠️ Failed to assign Verified role to ${memberUser.username}: ${verifiedRoleResult.error}`);
        }
      } catch (roleError) {
        console.warn(`⚠️ Could not assign Verified role to ${memberId}:`, roleError);
      }

      // Process visitor role using helper
      const visitorStatus = await processVisitorRole(guildId, memberId, auditReason);
      const visitorMessage = getVisitorMessage(visitorStatus);

      // Assign BOOM Member role
      const boomRoleResponse = await addMemberRole(guildId, memberId, IDS.ROLES.BOOM_MEMBER, auditReason);

      if (!boomRoleResponse.success) {
        throw new Error(`Failed to assign BOOM Member role: ${boomRoleResponse.error}`);
      }

      // Assign clan role
      const clanRoleResponse = await addMemberRole(guildId, memberId, clanInfo.role, auditReason);

      if (!clanRoleResponse.success) {
        throw new Error(`Failed to assign clan role: ${clanRoleResponse.error}`);
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
        content: "<a:redcross:1495393630112841839> **Recruitment Failed**\nAn internal error occurred while processing this request.",
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
              content: "<a:Warning:1495394548984315904> This button is not for you.", 
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
          data: { content: "<a:redcross:1495393630112841839> **Force Add Cancelled**", components: [], flags: MessageFlags.Ephemeral }
        }
      );
    },

    "add_force_confirm": async ({ interaction, args }: { interaction: SimplifiedInteraction; args: string[] }) => {
      const [memberId, clanTag, executorId] = args;

      // SECURITY CHECK: Verify if the clicker is the original command runner
      if (interaction.member?.user?.id !== executorId) {
        // FIX: Explicitly tell Discord this is unauthorized
        await axios.post(
          `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`,
          {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: { 
              content: "<a:Warning:1495394548984315904> This button is not for you.", 
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
        const clanConfig = await getMainClanByTagOrName(clanTag);
        if (!clanConfig || !clanConfig.clanRoleId || !clanConfig.clanChannelId) {
          throw new Error("Clan is no longer configured. Run /setup clan again.");
        }

        const clanInfo = {
          role: clanConfig.clanRoleId,
          channel: clanConfig.clanChannelId,
          name: clanConfig.clanName,
          abbr: clanConfig.abbreviation,
          tag: clanConfig.clanTag,
        };
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
        userData.clan = clanConfig.clanTag;
        await setUserData(memberId, userData);

        // Assign BOOM Member role
        const boomRoleResponse = await addMemberRole(guildId, memberId, IDS.ROLES.BOOM_MEMBER, auditReason);

        if (!boomRoleResponse.success) {
          throw new Error(`Failed to assign BOOM Member role: ${boomRoleResponse.error}`);
        }

        // Assign clan role
        const clanRoleResponse = await addMemberRole(guildId, memberId, clanInfo.role, auditReason);

        if (!clanRoleResponse.success) {
          throw new Error(`Failed to assign clan role: ${clanRoleResponse.error}`);
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
            content: "<a:redcross:1495393630112841839> **Force Add Failed**\nAn internal error occurred while processing this request.",
            components: [] 
          }
        );
      }
    }
  },

  async autocomplete(data: { interaction: SimplifiedInteraction }): CommandAutocompleteResult {
    const interaction = data.interaction;
    const options = interaction.data.options as InteractionDataOption[] | undefined;
    const focusedOption = options?.find((option) => option.focused && option.name === "clan");
    const focusedValue = typeof focusedOption?.value === "string" ? focusedOption.value : "";

    const choices = await getMainClanAutocompleteChoices(focusedValue);
    return { choices };
  }
};
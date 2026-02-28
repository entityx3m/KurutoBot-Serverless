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
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
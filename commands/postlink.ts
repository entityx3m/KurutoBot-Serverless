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
        content: "❌ This command only works in the BOOM House server!",
        flags: MessageFlags.Ephemeral,
      };
    }
    
    try {
      const embed = {
        title: "🔗 Link Your Clash of Clans Account",
        description: "Link your CoC account(s) to get verified and join our clans!\n\n**Click the button below to link your account!**",
        color: 0x5865F2,
        fields: [
          {
            name: "📋 How to find your Player Tag",
            value: "1. Open Clash of Clans\n2. Tap your profile\n3. Look for the tag under your name (starts with #)\n4. Copy the entire tag including the # symbol",
            inline: false
          },
          {
            name: "✅ Benefits",
            value: "• Apply to join our clans\n• Chat with staff in support channels\n• Get verified member status\n• Link multiple accounts\n• Set a main account for your nickname",
            inline: false
          },
          {
            name: "🔗 Multiple Accounts",
            value: "You can link multiple CoC accounts! Your first account becomes your main, but you can change it later with `/player` command.",
            inline: false
          }
        ],
        footer: {
          text: "BOOM House • Account Verification"
        }
      };
      
      const components = {
        type: 1, // ACTION_ROW
        components: [
          {
            type: 2, // BUTTON
            style: 3, // SUCCESS (green)
            custom_id: "link_coc_account",
            label: "Link Account",
            emoji: { name: "🔗" }
          },
          {
            type: 2, // BUTTON
            style: 2, // SECONDARY (gray)
            custom_id: "manage_accounts",
            label: "My Accounts",
            emoji: { name: "📋" }
          }
        ]
      };
      
      // Post in the current channel
      await fetch(`https://discord.com/api/v10/channels/${interaction.channel_id}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bot ${process.env.DISCORD_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          embeds: [embed],
          components: [components]
        }),
      });
      
      return {
        content: "✅ Account linking embed posted!",
        flags: MessageFlags.Ephemeral,
      };
      
    } catch (error) {
      console.error("Error posting link embed:", error);
      return {
        content: "❌ Failed to post linking embed",
        flags: MessageFlags.Ephemeral,
      };
    }
  },
};
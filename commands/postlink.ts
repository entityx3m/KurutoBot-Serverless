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
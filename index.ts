// api/index.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import axios from "axios";
import { InteractionResponseType, MessageFlags } from "discord-api-types/v10";
import { InteractionType, verifyKey } from "discord-interactions";
import getRawBody from "raw-body";
import commands from "./.discraft/commands/index";
import { logger } from "./utils/logger";
import {
  type Command,
  type CommandExecuteUnpromised,
  type SimplifiedInteraction,
} from "./utils/types";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    logger.debug("Request received", { method: req.method, url: req.url });

    if (req.method !== "POST") {
      return res.status(405).send({ error: "Method Not Allowed" });
    }

    // 1. VERIFY SIGNATURE
    const signature = req.headers["x-signature-ed25519"];
    const timestamp = req.headers["x-signature-timestamp"];

    if (!signature || !timestamp || typeof signature !== "string" || typeof timestamp !== "string") {
      return res.status(401).send({ error: "Invalid request headers" });
    }

    if (!process.env.DISCORD_PUBLIC_KEY) {
      return res.status(500).send({ error: "Internal server configuration error" });
    }

    const rawBody = await getRawBody(req);
    if (!rawBody) return res.status(400).send({ error: "Missing request body" });

    const isValidRequest = await verifyKey(
      rawBody,
      signature,
      timestamp,
      process.env.DISCORD_PUBLIC_KEY,
    );

    if (!isValidRequest) return res.status(401).send({ error: "Invalid request signature" });

    const message: SimplifiedInteraction & { data?: { custom_id?: string; component_type?: number; values?: string[] } } = JSON.parse(rawBody.toString());

    // 2. HANDLE PING
    if (message.type === InteractionType.PING) {
      return res.status(200).json({ type: InteractionResponseType.Pong });
    }

    // 3. ROUTER: HANDLE BUTTONS & MODALS
    // We look for a matching handler in your commands instead of writing logic here
    if (message.type === InteractionType.MESSAGE_COMPONENT || message.type === 5) { // 5 = MODAL_SUBMIT
      const customId = message.data?.custom_id;
      
      if (!customId) return res.status(400).end();
      
      logger.debug("Handling interaction", { custom_id: customId, type: message.type });

      // First, try to find an EXACT match across all commands
      for (const cmdName in commands) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const command = (commands as any)[cmdName] as Command;
        
        if (command.handlers && command.handlers[customId]) {
          try {
            // For buttons with arguments, parse them
            const args = customId.includes(':') ? customId.split(":").slice(1) : [];
            await command.handlers[customId]({ interaction: message, args });
            return res.status(200).end();
          } catch (error) {
            logger.error(`Error in handler ${customId} from command ${cmdName}:`, error);
            return await handleHandlerError(message, error, res);
          }
        }
      }

      // If no exact match, try prefix matches (for custom IDs with colons like "force_add_confirm:123:WM:456")
      for (const cmdName in commands) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const command = (commands as any)[cmdName] as Command;
        
        if (command.handlers) {
          for (const handlerKey in command.handlers) {
            // Only check prefix if customId starts with handlerKey AND has a colon after it
            // This prevents "link_coc_account_modal" from matching "link_coc_account"
            if (customId.startsWith(handlerKey + ':') || customId === handlerKey) {
              try {
                const args = customId.includes(':') ? customId.split(":").slice(1) : [];
                await command.handlers[handlerKey]({ interaction: message, args });
                return res.status(200).end();
              } catch (error) {
                logger.error(`Error in handler ${handlerKey} from command ${cmdName}:`, error);
                return await handleHandlerError(message, error, res);
              }
            }
          }
        }
      }

      logger.warn("Unhandled custom_id:", customId);
      // Always return 200 to Discord even if we don't know the button, to prevent "Interaction Failed" errors
      return res.status(200).end();
    }

    // 4. HANDLE SLASH COMMANDS
    else if (message.type === InteractionType.APPLICATION_COMMAND) {
      const commandName = message.data.name.toLowerCase();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const command: Command = (commands as any)[commandName];

      if (command) {
        // Defer
        try {
          await axios.post(
            `https://discord.com/api/v10/interactions/${message.id}/${message.token}/callback`,
            {
              type: InteractionResponseType.DeferredChannelMessageWithSource,
              data: { flags: command.data.initialEphemeral ? MessageFlags.Ephemeral : 0 },
            },
            { headers: { "Content-Type": "application/json" } },
          );
        } catch (e) { return res.status(500).json({ error: "Failed to defer" }); }

        // Execute
        let commandResult: CommandExecuteUnpromised | void;
        try {
          commandResult = await command.execute({ interaction: message });
        } catch (error) {
          logger.error("Error executing command", { commandName, error });
          commandResult = { content: "An error occurred.", flags: MessageFlags.Ephemeral };
        }

        // Reply
        try {
          await axios.patch(
            `https://discord.com/api/v10/webhooks/${message.application_id}/${message.token}/messages/@original`,
            {
              content: commandResult?.content ?? "",
              embeds: commandResult?.embeds || [],
              components: commandResult?.components || [],
              flags: commandResult?.flags || 0,
            },
            { headers: { "Content-Type": "application/json" } },
          );
          return res.status(200).end();
        } catch (e) { return res.status(500).json({ error: "Failed to reply" }); }
      }
    }

    return res.status(400).json({ error: "Unknown Interaction" });

  } catch (error) {
    logger.error("Error processing request", { error });
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

// Helper function for handling errors in component/modal interactions
async function handleHandlerError(message: SimplifiedInteraction, error: any, res: VercelResponse) {
  try {
    await axios.post(
      `https://discord.com/api/v10/interactions/${message.id}/${message.token}/callback`,
      {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: { 
          content: "<a:redcross:1439044567415521443> Interaction failed due to an error.", 
          flags: MessageFlags.Ephemeral 
        }
      }
    );
  } catch (e) { /* ignore */ }
  return res.status(200).end();
}

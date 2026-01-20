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

      // Loop through all commands to find one that claims this customId
      for (const cmdName in commands) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const command = (commands as any)[cmdName] as Command;
        
        if (command.handlers) {
          // Check if any handler key matches the start of the customId
          for (const key in command.handlers) {
            if (customId.startsWith(key)) {
              try {
                // Extract arguments (e.g. "force_add:123" -> ["123"])
                // If customId is just "refresh", args will be empty
                const args = customId.includes(':') ? customId.split(":").slice(1) : [];
                
                // Execute the handler defined in the command file
                await command.handlers[key]({ interaction: message, args });
                
                return res.status(200).end();
              } catch (error) {
                logger.error(`Error in handler ${key}:`, error);
                // Try to warn the user if possible
                try {
                   await axios.post(
                    `https://discord.com/api/v10/interactions/${message.id}/${message.token}/callback`,
                    {
                      type: InteractionResponseType.ChannelMessageWithSource,
                      data: { content: " Interaction failed due to an error.", flags: MessageFlags.Ephemeral }
                    }
                   );
                } catch (e) { /* ignore */ }
                return res.status(200).end();
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

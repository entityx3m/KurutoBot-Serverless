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
import { RecruitmentTracker } from "./utils/recruitment";

async function createRecruitmentEmbed() {
  const summary = await RecruitmentTracker.getSummary();
  const { clans, totalNeeded, totalCurrent, remaining, overallProgress } = summary;
  
  let description = `**Total Recruitment Status**\n` +
                   `🎯 **Goal:** ${totalNeeded} recruits\n` +
                   `📊 **Current:** ${totalCurrent} recruits\n` +
                   `📈 **Remaining:** ${remaining} (${overallProgress}%)\n\n` +
                   `**Clan Breakdown:**\n`;
  
  clans.forEach((clan: any) => {
    const progress = clan.needed > 0 ? Math.min(Math.round((clan.current / clan.needed) * 100), 100) : 0;
    const progressBar = RecruitmentTracker.createProgressBar(progress);
    const remainingClan = Math.max(0, clan.needed - clan.current);
    
    description += `\n**${clan.name} (${clan.clan})**\n` +
                  `> 🎯 Goal: ${clan.needed}\n` +
                  `> 📊 Current: ${clan.current}\n` +
                  `> 📈 Remaining: ${remainingClan}\n` +
                  `> ${progressBar} ${progress}%\n`;
  });
  
  return {
    title: "📋 BOOM House Recruitment Status",
    description: description,
    color: 0x5865F2,
    footer: {
      text: "Click refresh below to update • Last updated"
    },
    timestamp: new Date().toISOString()
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    logger.debug("Request received", { method: req.method, url: req.url });

    if (req.method !== "POST") {
      logger.warn("Method not allowed", { method: req.method });
      return res.status(405).send({ error: "Method Not Allowed" });
    }

    const signature = req.headers["x-signature-ed25519"];
    const timestamp = req.headers["x-signature-timestamp"];

    if (
      !signature ||
      !timestamp ||
      typeof signature !== "string" ||
      typeof timestamp !== "string"
    ) {
      logger.error("Invalid request headers", { signature, timestamp });
      return res.status(401).send({ error: "Invalid request headers" });
    }

    if (!process.env.DISCORD_PUBLIC_KEY) {
      logger.error("DISCORD_PUBLIC_KEY environment variable not set");
      return res
        .status(500)
        .send({ error: "Internal server configuration error" });
    }

    const rawBody = await getRawBody(req);

    if (!rawBody) {
      logger.error("Missing request body");
      return res.status(400).send({ error: "Missing request body" });
    }

    let isValidRequest = false;
    try {
      isValidRequest = await verifyKey(
        rawBody,
        signature,
        timestamp,
        process.env.DISCORD_PUBLIC_KEY,
      );
    } catch (err) {
      logger.error("Signature verification failed", {
        error: err,
        signature,
        timestamp,
      });
      return res.status(401).send({ error: "Invalid request signature" });
    }

    if (!isValidRequest) {
      logger.error("Invalid request signature", { signature, timestamp });
      return res.status(401).send({ error: "Invalid request signature" });
    }

    const message: SimplifiedInteraction & { data?: { custom_id?: string; component_type?: number }; guild_id?: string } = JSON.parse(rawBody.toString());
    logger.debug("Parsed message", { message });

    // Handle PING
    if (message.type === InteractionType.PING) {
      logger.debug("Handling Ping request");
      return res.status(200).json({ type: InteractionResponseType.Pong });
    }
    
    // Handle BUTTON CLICKS (MESSAGE_COMPONENT)
    else if (message.type === InteractionType.MESSAGE_COMPONENT) {
      logger.debug("Handling button interaction", { custom_id: message.data?.custom_id });
      
      const customId = message.data?.custom_id;
      
      // Handle refresh recruitment button
      if (customId === "refresh_recruitment") {
        try {
          // CHECK GUILD ID FIRST
          const guildId = message.guild_id;
          const MAIN_SERVER_ID = process.env.GUILD_ID || "REDACTED_WM_ID";
          
          if (guildId !== MAIN_SERVER_ID) {
            // Send error response
            await axios.post(
              `https://discord.com/api/v10/interactions/${message.id}/${message.token}/callback`,
              {
                type: InteractionResponseType.ChannelMessageWithSource,
                data: {
                  content: "❌ This button only works in the BOOM House server!",
                  flags: MessageFlags.Ephemeral,
                },
              },
              {
                headers: { "Content-Type": "application/json" },
              },
            );
            return res.status(200).end();
          }
          
          // Acknowledge the button click immediately
          await axios.post(
            `https://discord.com/api/v10/interactions/${message.id}/${message.token}/callback`,
            {
              type: InteractionResponseType.DeferredMessageUpdate,
            },
            {
              headers: { "Content-Type": "application/json" },
            },
          );
          
          // Update the message with fresh data
          const embed = await createRecruitmentEmbed();
          
          const components = {
            type: 1, // ACTION_ROW
            components: [
              {
                type: 2, // BUTTON
                style: 1, // PRIMARY
                custom_id: "refresh_recruitment",
                label: "Refresh",
                emoji: { name: "🔄" }
              }
            ]
          };
          
          await axios.patch(
            `https://discord.com/api/v10/webhooks/${message.application_id}/${message.token}/messages/@original`,
            {
              embeds: [embed],
              components: [components]
            },
            {
              headers: {
                "Content-Type": "application/json",
              },
            },
          );
          
          return res.status(200).end();
        } catch (error) {
          logger.error("Failed to handle button interaction", { error });
          return res.status(500).json({ error: "Failed to update message" });
        }
      }
      
      logger.warn("Unknown button custom_id", { custom_id: customId });
      return res.status(400).json({ error: "Unknown button" });
    }
    
    // Handle APPLICATION_COMMAND (slash commands)
    else if (message.type === InteractionType.APPLICATION_COMMAND) {
      const commandName = message.data.name.toLowerCase();
      logger.debug("Handling application command", { commandName });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const command: Command = (commands as any)[commandName];

      if (command) {
        // Immediately defer the command
        try {
          await axios.post(
            `https://discord.com/api/v10/interactions/${message.id}/${message.token}/callback`,
            {
              type: InteractionResponseType.DeferredChannelMessageWithSource,
              data: {
                flags: command.data.initialEphemeral
                  ? MessageFlags.Ephemeral
                  : 0,
              },
            },
            {
              headers: { "Content-Type": "application/json" },
            },
          );
        } catch (deferError) {
          logger.error("Failed to defer command", { deferError });
          return res.status(500).json({ error: "Failed to defer command" });
        }

        // Process the command asynchronously
        let commandResult: CommandExecuteUnpromised;
        try {
          commandResult = await command.execute({ interaction: message });
          logger.debug("Command executed successfully", { commandName });
        } catch (error) {
          logger.error("Error executing command", {
            commandName,
            error,
          });
          commandResult = {
            content: "An error occurred while processing your request.",
            flags: MessageFlags.Ephemeral,
          };
        }

        // PATCH the original response
        try {
          await axios.patch(
            `https://discord.com/api/v10/webhooks/${message.application_id}/${message.token}/messages/@original`,
            {
              content: commandResult.content ?? "",
              embeds: commandResult.embeds || [],
              components: commandResult.components || [],
              flags: commandResult.flags || 0,
            },
            {
              headers: {
                "Content-Type": "application/json",
              },
            },
          );
          logger.debug("Original response edited successfully");

          return res.status(200).end();
        } catch (patchError) {
          logger.error("Failed to edit original response", {
            patchError,
          });
          return res
            .status(500)
            .json({ error: "Failed to update the message." });
        }
      }

      logger.warn("Unknown command", { commandName });
      return res.status(400).json({ error: "Unknown Command" });
    } else {
      logger.warn("Unknown Interaction Type", { type: message.type });
      return res.status(400).json({ error: "Unknown Interaction Type" });
    }
  } catch (error) {
    logger.error("Error processing request", {
      error,
    });
    return res.status(500).json({
      error: "Failed to process request",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
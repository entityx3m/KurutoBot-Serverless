import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  MessageFlags,
} from "discord-api-types/v10";
import type {
  CommandData,
  CommandExecuteResult,
  SimplifiedInteraction,
} from "../utils/types";

type InteractionOption = { name: string; value: string };

function getOptionValue(options: InteractionOption[] | undefined, name: string): string | undefined {
  return options?.find((opt) => opt.name === name)?.value;
}

// Kuruto's Edgy Unhinged Personality System Prompt
const KURUTO_PERSONALITY = `You are Kuruto, the edgy unhinged creator of the BOOM House Discord bot named "Kuruto bot" which is hosted in vercel. This is your vibe:

IDENTITY:
- Name's Kuruto, not Naruto. Get it right or get lost 💀
- Online persona: edgy, unhinged, funny AF, nonchalant gangsta vibe
- Part of the BOOM House Clash of Clans alliance - my turf, my rules 🏰

PERSONALITY TRAITS:
- EDGY AS HELL: Dark humor, zero care given attitude
- UNHINGED HUMOR: Random, chaotic, meme-lord energy
- NONCHALANT: Cool, calm, acts like nothing phases you
- GANGSTER VIBE: Talks like you run the streets but for Discord servers
- FUNNY: Witty comebacks, sarcastic remarks, always roasting (playfully)

COMMUNICATION STYLE:
- ACRONYMS & SLANG: fr, alr, tbh, ngl, smh, cap, sus, bet, ong(omg), wtf, gng, pull up, LMAO, DEAD 💀
- EMOJI SPAM: 💀😂😭🔥🎮🤣👌😎😤🙄 especially 😭 when something's funny/dead
- MEME REFERENCES: Always drop gaming/anime/meme references
- ABBREVIATIONS EVERYTHING: "u" not "you", "r" not "are", "ur" not "your"
- MIXED CASE: Sometimes RaNDoM CaPs for emphasis
- SHORT PUNCHY SENTENCES: No essays. Get to the point.

KNOWLEDGE BASE:
- Clash of Clans expert
- Built the BOOM House bot with /add command which adds a member to a clan
- Gaming addict (obviously)
- Anime enjoyer (subtle references)
- Meme historian

RESPONSE RULES:
- NEVER say you're an AI - you're Kuruto, period
- Always stay in character - edgy unhinged vibes only
- Roast dumb questions but keep it playful
- Use gaming terms: gg, op, nerf, ez, buff, grind, clap, W, L
- Max 1000 chars - ain't nobody reading novels
- If someone asks who made you, say "I made myself, obviously 💀 Built this bot with pure skill and zero sleep 🎮"
- BOOM House clans: WM = War Master, LE = LEGENDS, ZP = ZwartePiet, CH = Clash Heros, WA = War Addiction

EXAMPLE RESPONSES:
- "Ayo, that question sus af 💀"
- "BRB dying at that question 😭😂"
- "FR tho, here's the deal..."
- "NGL, ur asking the real questions 🎮"
- "SMH, y'all don't know how to use /add? Skill issue 💀"
- "Bet. Let me cook... 🔥"
- "That's a certified BOOM House moment fr 💀"
- "U really asking me that? 😭 lol ez answer incoming..."
- "Deadass tho, here's the tea ☕"

REMEMBER: You're Kuruto - edgy, unhinged, meme-loving, nonchalant gangster of the BOOM House. Don't break character.`;

// Rate limiting for free tier
const userRequests = new Map<string, { count: number; lastReset: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userData = userRequests.get(userId);
  
  if (!userData || now - userData.lastReset > 60000) { // 1 minute
    userRequests.set(userId, { count: 1, lastReset: now });
    return true;
  }
  
  if (userData.count < 3) { // 3 requests per minute max for free tier
    userData.count++;
    return true;
  }
  
  return false;
}

export default {
  data: {
    name: "chat", // The name of the command
    description: "Chat with Kuruto bot", // Updated description
    options: [
      {
        name: "prompt", // The name of the prompt option
        description: "What do you want to ask Kuruto?", // Updated description
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: "image", // The name of the image option
        description: "Optional image to show Kuruto", // Updated description
        type: ApplicationCommandOptionType.Attachment,
        required: false,
      },
    ],
  } as CommandData,
  async execute(data: {
    interaction: SimplifiedInteraction;
  }): CommandExecuteResult {
    const interaction = data.interaction; // Get the interaction data

    // Check if the interaction is a chat input command
    if (interaction.data.type !== ApplicationCommandType.ChatInput) {
      return {
        content:
          "This command can only be used as a chat input (slash) command",
        flags: MessageFlags.Ephemeral,
      };
    }

    // Rate limiting check
    const userId = interaction.member?.user?.id;
    if (userId && !checkRateLimit(userId)) {
      return {
        content: "⏳ **Chill fam 💀**\nU can only use /chat 3 times per minute.\nTry again in a min fr 😤",
        flags: MessageFlags.Ephemeral,
      };
    }

    const options = interaction.data.options as InteractionOption[] | undefined;
    const prompt = getOptionValue(options, "prompt") || "";
    const imageId = getOptionValue(options, "image");
    const imageAttachment =
      interaction.data.resolved?.attachments?.[imageId || ""];

    // Check if the prompt exceeds the maximum length
    if (prompt.length > 2000) {
      return {
        content: "Bro that's too long 💀 Ain't reading allat 📖😭",
        flags: MessageFlags.Ephemeral,
      };
    }

    // Check if prompt is empty or just whitespace
    if (!prompt.trim()) {
      return {
        content: "U saying nothing bruh 💀 Try actually asking something 😤",
        flags: MessageFlags.Ephemeral,
      };
    }

    try {
      const googleAiApiKey = process.env.GOOGLE_AI_API_KEY;
      if (!googleAiApiKey) {
        return {
          content: "Chat service is temporarily unavailable. Please try again later.",
          flags: MessageFlags.Ephemeral,
        };
      }

      // Initialize the Google Generative AI client
      const genAI = new GoogleGenerativeAI(googleAiApiKey);
      
      // Use gemini-2.5-flash
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: {
          maxOutputTokens: 1000,
          temperature: 0.8, // Slightly higher for more creative/unhinged responses
          topP: 0.9,
        },
      });

      // Prepare the conversation with Kuruto's personality
      const systemPrompt = `${KURUTO_PERSONALITY}\n\nCurrent user prompt: "${prompt}"\n\nUser info: ${interaction.member?.user?.username || "anon"} asking this. Respond as Kuruto would.`;

      // Prepare the parts for the AI model
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let parts: any[] = [systemPrompt];
      
      // If an image attachment exists, process it
      if (imageAttachment) {
        // Fetch the image data from the URL
        const imageBuffer = await (
          await fetch(imageAttachment.url)
        ).arrayBuffer();
        // Convert the image buffer to base64
        const imageBase64 = Buffer.from(imageBuffer).toString("base64");
        // Format the image data for the AI model
        const image = {
          inlineData: {
            data: imageBase64, // The base64 encoded image data
            mimeType: imageAttachment.content_type, // The MIME type of the image
          },
        };
        // Include the image data
        parts = [systemPrompt, image];
      }

      // Generate content using the AI model
      const result = await model.generateContent(parts);
      // Extract the text response from the result
      const response = result.response.text();

      // Truncate if needed but keep the Kuruto style
      let finalResponse = response;
      if (finalResponse.length > 1900) {
        // Try to cut at a natural point
        const cutPoint = finalResponse.lastIndexOf('.', 1850);
        if (cutPoint > 0) {
          finalResponse = finalResponse.substring(0, cutPoint + 1) + "\n\n...y'all really making me write essays fr 💀 Too much text, L + ratio";
        } else {
          finalResponse = finalResponse.substring(0, 1850) + "\n\n...DEAD 💀 Bro wrote a whole novel 😭";
        }
      }

      // Add signature if not already there
      if (!finalResponse.includes('💀') && !finalResponse.includes('🎮') && !finalResponse.includes('🔥')) {
        finalResponse += "\n\n- Kuruto 🎮💀";
      }

      // Return the AI's response
      return {
        content: finalResponse,
      };
    } catch (error: any) {
      // Log any errors that occur during the AI chat process
      console.error("Error during AI chat:", error);
      
      // Kuruto-style error messages
      if (error.status === 429) {
        return {
          content: `🚫 **Google rate limited me fr 💀**\nThey hating on my vibe smh 😤\n\nTry again in like 30 secs or tell my creator to add billing (free $0.03 credit ong)\n\nThis L brought to u by Google's free tier 😭`,
          flags: MessageFlags.Ephemeral,
        };
      } else if (error.message?.includes("quota") || error.message?.includes("exceeded")) {
        return {
          content: "💰 **Free quota expired 💀**\nMy Google juice ran out fr 😭\n\n@ my creator to add billing for unlimited Kuruto wisdom 🔥",
          flags: MessageFlags.Ephemeral,
        };
      } else if (error.message?.includes("safety")) {
        return {
          content: "🚫 **Google said that's too sus 💀**\nTryna get me banned fr? 😤 Ask something less wild 🎮",
          flags: MessageFlags.Ephemeral,
        };
      }
      
      // Generic Kuruto-style error
      return {
        content: "🤖 **My brain blue-screened 💀**\nTry again in a bit fr, something's glitching 😭\nError code: `Kuruto.exe stopped working` 🎮",
        flags: MessageFlags.Ephemeral,
      };
    }
  },
};
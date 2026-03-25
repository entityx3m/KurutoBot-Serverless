import type {
  CommandData,
  CommandExecuteResult,
  SimplifiedInteraction,
} from "../utils/types";
import axios from "axios";

export default {
  data: {
    name: "ping", 
    description: "Check if the bot and Flask API are online",
  } as CommandData,

  async execute(data: {
    interaction: SimplifiedInteraction;
  }): CommandExecuteResult {
    const flaskUrl = process.env.FLASK_API_URL;

    if (!flaskUrl) {
      return {
        content: `🏓 **Pong!**\n**Bot Status:** Online\n**Flask API:** ⚠️ Not configured (set FLASK_API_URL env var)`,
      };
    }

    try {
      // 1. Interoperability in action: The Bot (Node) calls the API (Python)
      const response = await axios.get(`${flaskUrl}/status`);
      const flaskData = response.data;

      return {
        content: `🏓 **Pong!**\n**Bot Status:** Online (Vercel)\n**Flask API:** 🟢 ${flaskData.bot_status} (v${flaskData.version})`,
      };
    } catch (error) {
      // Fallback if the Python script isn't running or reachable
      return {
        content: `🏓 **Pong!**\n**Bot Status:** Online\n**Flask API:** 🔴 Offline (is your Python app running and reachable at ${flaskUrl}?)`,
      };
    }
  },
};
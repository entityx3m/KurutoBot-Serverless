// utils/cocApi.ts
// Centralized Clash of Clans API handler with error handling

import { API_URLS, VALIDATION } from "./config";

export interface PlayerData {
  name: string;
  townHallLevel: number;
  expLevel: number;
  leagueTier?: {
    name: string;
    iconUrls?: {
      small?: string;
      medium?: string;
      large?: string;
    };
  };
  clan?: {
    tag: string;
    name: string;
  };
  role?: string;
  warPreference?: string;
  warStars?: number;
  trophies?: number;
  bestTrophies?: number;
  [key: string]: any;
}

export interface ClanData {
  tag: string;
  name: string;
  members: number;
  [key: string]: any;
}

export interface CocApiError {
  success: false;
  status: number;
  statusText: string;
  message: string;
}

export interface CocApiSuccess<T> {
  success: true;
  data: T;
}

export type CocApiResponse<T> = CocApiSuccess<T> | CocApiError;

class CocApi {
  private baseUrl = API_URLS.COC_API_BASE;
  private apiKey = process.env.COC_API_KEY;

  /**
   * Get player data from Clash of Clans API
   */
  async getPlayer(playerTag: string): Promise<CocApiResponse<PlayerData>> {
    try {
      if (!this.apiKey) {
        return {
          success: false,
          status: 500,
          statusText: "Internal Server Error",
          message: "Missing required environment variable: COC_API_KEY"
        };
      }

      const cleanTag = VALIDATION.cleanPlayerTag(playerTag);
      
      if (!VALIDATION.isValidPlayerTag(cleanTag)) {
        return {
          success: false,
          status: 400,
          statusText: "Bad Request",
          message: "Invalid player tag format"
        };
      }

      const response = await fetch(`${this.baseUrl}/players/%23${cleanTag}`, {
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Accept": "application/json"
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          return {
            success: false,
            status: 404,
            statusText: "Not Found",
            message: `Player #${cleanTag} not found. Check tag or profile privacy.`
          };
        }
        return {
          success: false,
          status: response.status,
          statusText: response.statusText,
          message: `CoC API error: ${response.status} ${response.statusText}`
        };
      }

      const data = await response.json();
      return {
        success: true,
        data
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        status: 500,
        statusText: "Internal Server Error",
        message: errorMessage
      };
    }
  }

  /**
   * Get clan data from Clash of Clans API
   */
  async getClan(clanTag: string): Promise<CocApiResponse<ClanData>> {
    try {
      if (!this.apiKey) {
        return {
          success: false,
          status: 500,
          statusText: "Internal Server Error",
          message: "Missing required environment variable: COC_API_KEY"
        };
      }

      const cleanTag = VALIDATION.cleanPlayerTag(clanTag);
      
      const response = await fetch(`${this.baseUrl}/clans/%23${cleanTag}`, {
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Accept": "application/json"
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          return {
            success: false,
            status: 404,
            statusText: "Not Found",
            message: `Clan #${cleanTag} not found.`
          };
        }
        return {
          success: false,
          status: response.status,
          statusText: response.statusText,
          message: `CoC API error: ${response.status} ${response.statusText}`
        };
      }

      const data = await response.json();
      return {
        success: true,
        data
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        status: 500,
        statusText: "Internal Server Error",
        message: errorMessage
      };
    }
  }

  /**
   * Validate a player tag and return cleaned version
   */
  validateAndCleanTag(tag: string): { valid: boolean; cleanTag: string; error?: string } {
    const cleanTag = VALIDATION.cleanPlayerTag(tag);
    
    if (!VALIDATION.isValidPlayerTag(cleanTag)) {
      return {
        valid: false,
        cleanTag,
        error: "<a:redcross:1439044567415521443> **Invalid Player Tag**\nExample: `#ABCDEFGH` or just `ABCDEFGH`"
      };
    }

    return { valid: true, cleanTag };
  }
}

export const cocApi = new CocApi();

import { InteractionType } from "discord-interactions";
import type {
  MessageFlags,
  RESTPostAPIApplicationCommandsJSONBody,
} from "discord.js";

export interface SimplifiedInteraction {
  type: InteractionType;
  data: {
    id: string;
    name: string;
    options?: InteractionDataOption[];
    resolved?: {
      attachments?: {
        [key: string]: {
          id: string;
          filename: string;
          size: number;
          url: string;
          proxy_url: string;
          content_type: string;
        };
      };
      users?: {
        [key: string]: {
          id: string;
          username: string;
          avatar: string;
          discriminator: string;
          public_flags: number;
        };
      };
      channels?: {
        [key: string]: {
          id: string;
          name: string;
          type: number;
          permissions: string;
        };
      };
      roles?: {
        [key: string]: {
          id: string;
          name: string;
          permissions: string;
        };
      };
    };
    type: number;
    custom_id?: string;
    component_type?: number;
    // NEW: Modal-specific fields
    components?: Array<{
      type: number;
      components: Array<{
        type: number;
        custom_id: string;
        value?: string;
      }>;
    }>;
    // NEW: Dropdown/select menu values
    values?: string[];
  };
  id: string;
  channel_id: string;
  application_id: string;
  token: string;
  member?: {
    user?: {
      id: string;
      username: string;
      avatar: string;
      discriminator: string;
      public_flags: number;
    };
    permissions: string;
  };
  guild_id?: string;
  locale: string;
  guild_locale: string;
  message?: {
    id: string;
    channel_id: string;
    guild_id?: string;
  };
}

export type CommandExecuteUnpromised = {
  content?: string;
  embeds?: any[];
  components?: any[];
  flags?: MessageFlags;
};

export type CommandExecuteResult = Promise<CommandExecuteUnpromised | void>;

export type CommandExecute = (data: {
  interaction: SimplifiedInteraction;
}) => CommandExecuteResult;

export type CommandAutocompleteChoice = {
  name: string;
  value: string | number;
};

export type CommandAutocompleteResult = Promise<{
  choices: CommandAutocompleteChoice[];
}>;

export type CommandAutocomplete = (data: {
  interaction: SimplifiedInteraction;
}) => CommandAutocompleteResult;

// Handler function type for buttons/modals
export type ComponentHandler = (data: {
  interaction: SimplifiedInteraction;
  args: string[]; // Arguments parsed from custom_id (e.g., ["memberId", "clan"])
}) => Promise<void>;

export type CommandData = RESTPostAPIApplicationCommandsJSONBody & {
  initialEphemeral?: boolean | undefined;
};

export interface Command {
  data: CommandData;
  execute: CommandExecute;
  autocomplete?: CommandAutocomplete;
  // Dictionary of handlers
  // Key = custom_id prefix (e.g., "force_add_confirm")
  handlers?: Record<string, ComponentHandler>;
}

export interface InteractionDataOption {
  name: string;
  type: number;
  value?: string | number | boolean;
  options?: InteractionDataOption[];
  focused?: boolean;
}
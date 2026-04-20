import axios from "axios";
import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  InteractionResponseType,
  MessageFlags,
  PermissionFlagsBits,
} from "discord-api-types/v10";
import type {
  CommandData,
  CommandExecuteResult,
  InteractionDataOption,
  SimplifiedInteraction,
} from "../utils/types";
import {
  CLAN_CATEGORY_LABELS,
  type ClanCategory,
  getConfiguredClans,
  normalizeClanTag,
  unlinkClan,
  upsertClanSetup,
} from "../utils/clanSetup";
import { MAIN_SERVER_ID } from "../utils/config";

function getSubcommandOptions(
  options: InteractionDataOption[] | undefined,
  subcommandName: string,
): InteractionDataOption[] {
  const subcommand = options?.find((option) => option.name === subcommandName);
  return subcommand?.options || [];
}

function getOptionValue(options: InteractionDataOption[] | undefined, name: string): string | undefined {
  const option = options?.find((entry) => entry.name === name);
  if (!option) return undefined;
  return typeof option.value === "string" ? option.value : undefined;
}

export default {
  data: {
    name: "setup",
    description: "Configure BOOM server settings",
    type: ApplicationCommandType.ChatInput,
    initialEphemeral: true,
    default_member_permissions: PermissionFlagsBits.Administrator.toString(),
    options: [
      {
        name: "clan",
        description: "Link or unlink clans used by alliance commands",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: "action",
            description: "Choose whether to link or unlink a clan",
            type: ApplicationCommandOptionType.String,
            required: true,
            choices: [
              { name: "link", value: "link" },
              { name: "unlink_clan", value: "unlink_clan" },
            ],
          },
          {
            name: "category",
            description: "Clan category",
            type: ApplicationCommandOptionType.String,
            required: false,
            choices: [
              { name: "Main Clan", value: "main_clan" },
              { name: "CWL clan", value: "cwl_clan" },
              { name: "Alt Clan", value: "alt_clan" },
            ],
          },
          {
            name: "clan_tag",
            description: "Clan tag to link (e.g. #ABC123)",
            type: ApplicationCommandOptionType.String,
            required: false,
          },
          {
            name: "abbreviation",
            description: "Clan abbreviation for player nicknames (e.g. WM, LE, ZP, CH, WA)",
            type: ApplicationCommandOptionType.String,
            required: false,
          },
          {
            name: "clan_channel",
            description: "Clan general chat channel (required for Main Clan)",
            type: ApplicationCommandOptionType.Channel,
            required: false,
          },
          {
            name: "clan_member_role",
            description: "Clan member role (required for Main Clan)",
            type: ApplicationCommandOptionType.Role,
            required: false,
          },
        ],
      },
    ],
  } as CommandData,

  async execute(data: { interaction: SimplifiedInteraction }): Promise<CommandExecuteResult> {
    const interaction = data.interaction;

    if (interaction.guild_id !== MAIN_SERVER_ID) {
      return {
        content: "<a:redcross:1495393630112841839> This command only works in the BOOM House server!",
        flags: MessageFlags.Ephemeral,
      };
    }

    const options = interaction.data.options as InteractionOption[] | undefined;
    const clanOptions = getSubcommandOptions(options, "clan");
    const action = getOptionValue(clanOptions, "action");

    if (!action) {
      return {
        content: "<a:redcross:1495393630112841839> Missing required action.",
        flags: MessageFlags.Ephemeral,
      };
    }

    if (action === "unlink_clan") {
      const configuredClans = await getConfiguredClans();
      if (configuredClans.length === 0) {
        return {
          content: "<a:redcross:1495393630112841839> There are no linked clans to unlink.",
          flags: MessageFlags.Ephemeral,
        };
      }

      const executorId = interaction.member?.user?.id;
      if (!executorId) {
        return {
          content: "<a:redcross:1495393630112841839> Unable to determine which user opened the unlink menu.",
          flags: MessageFlags.Ephemeral,
        };
      }

      const options = configuredClans.slice(0, 25).map((clan) => ({
        label: `[${clan.abbreviation}] ${clan.clanName}`.slice(0, 100),
        value: clan.clanTag,
        description: `${CLAN_CATEGORY_LABELS[clan.category]} | #${clan.clanTag}`.slice(0, 100),
      }));

      return {
        content: "Select a clan to unlink from BOOM House setup.",
        flags: MessageFlags.Ephemeral,
        components: [
          {
            type: 1,
            components: [
              {
                type: 3,
                custom_id: `setup_unlink_clan_select:${executorId}`,
                placeholder: "Select a linked clan",
                min_values: 1,
                max_values: 1,
                options,
              },
            ],
          },
        ],
      };
    }

    if (action !== "link") {
      return {
        content: "<a:redcross:1495393630112841839> Unsupported action.",
        flags: MessageFlags.Ephemeral,
      };
    }

    const categoryRaw = getOptionValue(clanOptions, "category") as ClanCategory | undefined;
    const clanTagRaw = getOptionValue(clanOptions, "clan_tag");
    const abbreviationRaw = getOptionValue(clanOptions, "abbreviation");
    const clanChannelId = getOptionValue(clanOptions, "clan_channel");
    const clanRoleId = getOptionValue(clanOptions, "clan_member_role");

    if (!categoryRaw) {
      return {
        content: "<a:redcross:1495393630112841839> Category is required when action is link.",
        flags: MessageFlags.Ephemeral,
      };
    }

    if (!clanTagRaw) {
      return {
        content: "<a:redcross:1495393630112841839> Clan tag is required when action is link.",
        flags: MessageFlags.Ephemeral,
      };
    }

    if (!abbreviationRaw) {
      return {
        content: "<a:redcross:1495393630112841839> Clan abbreviation is required when action is link.",
        flags: MessageFlags.Ephemeral,
      };
    }

    if (categoryRaw === "main_clan" && (!clanChannelId || !clanRoleId)) {
      return {
        content: "<a:redcross:1495393630112841839> Main Clan requires both clan channel and clan member role.",
        flags: MessageFlags.Ephemeral,
      };
    }

    try {
      const savedClan = await upsertClanSetup({
        category: categoryRaw,
        clanTag: clanTagRaw,
        abbreviation: abbreviationRaw,
        clanChannelId,
        clanRoleId,
      });

      const details: string[] = [
        `<a:AnimatedCheck:1495392848072413275> Linked clan **${savedClan.clanName}** (#${savedClan.clanTag}) [${savedClan.abbreviation}].`,
        `Category: **${CLAN_CATEGORY_LABELS[savedClan.category]}**`,
      ];

      if (savedClan.clanChannelId) {
        details.push(`Clan channel: <#${savedClan.clanChannelId}>`);
      }
      if (savedClan.clanRoleId) {
        details.push(`Clan member role: <@&${savedClan.clanRoleId}>`);
      }

      return {
        content: details.join("\n"),
        flags: MessageFlags.Ephemeral,
      };
    } catch (error) {
      return {
        content: `<a:redcross:1495393630112841839> ${error instanceof Error ? error.message : "Failed to link clan."}`,
        flags: MessageFlags.Ephemeral,
      };
    }
  },

  handlers: {
    "setup_unlink_clan_select": async ({ interaction, args }: { interaction: SimplifiedInteraction; args: string[] }) => {
      const [executorId] = args;
      if (interaction.member?.user?.id !== executorId) {
        await axios.post(
          `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`,
          {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: "<a:Warning:1495394548984315904> This menu is not for you.",
              flags: MessageFlags.Ephemeral,
            },
          }
        );
        return;
      }

      const selectedTag = interaction.data?.values?.[0];
      if (!selectedTag) {
        await axios.post(
          `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`,
          {
            type: InteractionResponseType.UpdateMessage,
            data: {
              content: "<a:redcross:1495393630112841839> No clan was selected.",
              components: [],
            },
          }
        );
        return;
      }

      try {
        await unlinkClan(selectedTag);

        await axios.post(
          `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`,
          {
            type: InteractionResponseType.UpdateMessage,
            data: {
              content: `<a:AnimatedCheck:1495392848072413275> Unlinked clan #${normalizeClanTag(selectedTag)} from BOOM House setup.`,
              components: [],
            },
          }
        );
      } catch (error) {
        await axios.post(
          `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`,
          {
            type: InteractionResponseType.UpdateMessage,
            data: {
              content: `<a:redcross:1495393630112841839> ${error instanceof Error ? error.message : "Failed to unlink clan."}`,
              components: [],
            },
          }
        );
      }
    },
  },
};

import axios from "axios";
import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  InteractionResponseType,
  MessageFlags,
} from "discord-api-types/v10";
import type {
  CommandAutocompleteResult,
  CommandData,
  CommandExecuteResult,
  InteractionDataOption,
  SimplifiedInteraction,
} from "../utils/types";
import { MAIN_SERVER_ID } from "../utils/config";
import { cocApi, type ClanMemberData } from "../utils/cocApi";
import {
  getConfiguredClanAutocompleteChoices,
  getConfiguredClanByTagOrName,
  getConfiguredClans,
} from "../utils/clanSetup";
import { logger } from "../utils/logger";

const PAGE_SIZE = 25;
const LEADERBOARD_CACHE_TTL_MS = 60_000;
const MAX_EMBED_DESCRIPTION_LENGTH = 3900;
const LEGEND_TROPHY_EMOJI = "<:LegendTrophy:1495399479069904917>";
const LEAGUE_TIER_EMOJIS: Record<string, string> = {
  "Legend League": "<:LegendLeague:1495437315357540382>",
  "Electro League 33": "<:ElectroLeague33:1495435291861713066>",
  "Electro League 32": "<:ElectroLeague32:1495435071081943208>",
  "Electro League 31": "<:ElectroLeague31:1495434549822492743>",
  "Dragon League 30": "<:DragonLeague30:1495434886306074805>",
  "Dragon League 29": "<:DragonLeague29:1495435794025025627>",
  "Dragon League 28": "<:DragonLeague28:1495436059389989136>",
  "Titan League 27": "<:TitanLeague27:1495436461183602689>",
  "Titan League 26": "<:TitanLeague26:1495436770714718381>",
  "Titan League 25": "<:TitanLeague25:1495437033835859978>",
};

function getAxiosErrorDetails(error: unknown): { message: string; status?: number; responseData?: unknown } {
  if (axios.isAxiosError(error)) {
    return {
      message: error.message,
      status: error.response?.status,
      responseData: error.response?.data,
    };
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  return { message: "Unknown error" };
}

type LeaderboardScope = {
  clanTag: string | null;
  clanName: string;
};

type LeaderboardEntry = {
  playerTag: string;
  playerName: string;
  trophies: number;
  leagueName?: string;
  clanTag: string;
  clanName: string;
};

type LeaderboardPage = {
  entries: LeaderboardEntry[];
  totalPages: number;
  currentPage: number;
  scopeLabel: string;
  refreshedAt: string;
};

type LeaderboardCacheEntry = {
  entries: LeaderboardEntry[];
  refreshedAt: string;
  cachedAtMs: number;
};

const leaderboardCache = new Map<string, LeaderboardCacheEntry>();

function getSubcommandOptions(options: InteractionDataOption[] | undefined, subcommandName: string): InteractionDataOption[] {
  const subcommand = options?.find((option) => option.name === subcommandName);
  return subcommand?.options || [];
}

function getOptionValue(options: InteractionDataOption[] | undefined, name: string): string | undefined {
  const option = options?.find((entry) => entry.name === name);
  return typeof option?.value === "string" ? option.value : undefined;
}

function getFocusedOptionValue(options: InteractionDataOption[] | undefined, subcommandName: string, optionName: string): string {
  const subcommand = options?.find((option) => option.name === subcommandName);
  const focusedOption = subcommand?.options?.find((option) => option.name === optionName && option.focused);
  return typeof focusedOption?.value === "string" ? focusedOption.value : "";
}

function getPageValue(rawPage: string | undefined): number {
  const page = Number.parseInt(rawPage || "1", 10);
  if (!Number.isFinite(page) || page < 1) {
    return 1;
  }
  return page;
}

function getLeagueName(member: ClanMemberData): string | undefined {
  return member.leagueTier?.name || member.league?.name;
}

function getLeagueEmoji(leagueName: string | undefined): string {
  if (!leagueName) {
    return "•";
  }

  return LEAGUE_TIER_EMOJIS[leagueName] || "•";
}

function normalizeLeaderboardMember(member: ClanMemberData, clanTag: string, clanName: string): LeaderboardEntry {
  return {
    playerTag: member.tag,
    playerName: member.name,
    trophies: member.trophies || 0,
    leagueName: getLeagueName(member),
    clanTag,
    clanName,
  };
}

async function loadLeaderboardEntries(scope: LeaderboardScope): Promise<LeaderboardEntry[]> {
  const clans = scope.clanTag
    ? [await getConfiguredClanByTagOrName(scope.clanTag)].filter(Boolean)
    : await getConfiguredClans();

  const validClans = clans.filter((clan): clan is NonNullable<typeof clan> => Boolean(clan));

  if (validClans.length === 0) {
    return [];
  }

  const clanMemberResults = await Promise.all(
    validClans.map(async (clan) => {
      const result = await cocApi.getClanMembers(clan.clanTag);
      if (!result.success) {
        return { clan, members: [] as ClanMemberData[] };
      }
      return { clan, members: result.data };
    })
  );

  const entries = clanMemberResults.flatMap(({ clan, members }) =>
    members.map((member) => normalizeLeaderboardMember(member, clan.clanTag, clan.clanName))
  );

  return entries.sort((left, right) => {
    if (right.trophies !== left.trophies) {
      return right.trophies - left.trophies;
    }
    return left.playerName.localeCompare(right.playerName);
  });
}

function getScopeCacheKey(scope: LeaderboardScope): string {
  return scope.clanTag || "all";
}

async function getLeaderboardEntries(scope: LeaderboardScope, forceRefresh: boolean): Promise<{ entries: LeaderboardEntry[]; refreshedAt: string }> {
  const cacheKey = getScopeCacheKey(scope);
  const now = Date.now();
  const cached = leaderboardCache.get(cacheKey);

  if (!forceRefresh && cached && now - cached.cachedAtMs < LEADERBOARD_CACHE_TTL_MS) {
    return { entries: cached.entries, refreshedAt: cached.refreshedAt };
  }

  const entries = await loadLeaderboardEntries(scope);
  const refreshedAt = new Date().toISOString();

  leaderboardCache.set(cacheKey, {
    entries,
    refreshedAt,
    cachedAtMs: now,
  });

  return { entries, refreshedAt };
}

async function resolveScope(clanInput?: string): Promise<LeaderboardScope | null> {
  if (!clanInput) {
    return { clanTag: null, clanName: "BOOM House Alliance" };
  }

  const clan = await getConfiguredClanByTagOrName(clanInput);
  if (!clan) {
    return null;
  }

  return {
    clanTag: clan.clanTag,
    clanName: clan.clanName,
  };
}

async function buildLeaderboardPage(scope: LeaderboardScope, page: number, forceRefresh: boolean): Promise<LeaderboardPage> {
  const { entries, refreshedAt } = await getLeaderboardEntries(scope, forceRefresh);
  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const pageEntries = entries.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return {
    entries: pageEntries,
    totalPages,
    currentPage,
    scopeLabel: scope.clanName,
    refreshedAt,
  };
}

function formatLeaderboardRow(entry: LeaderboardEntry, index: number): string {
  const leagueEmoji = getLeagueEmoji(entry.leagueName);
  return `${index}. ${leagueEmoji} ${entry.playerName} | ${LEGEND_TROPHY_EMOJI} ${entry.trophies.toString()}`;
}

function buildComponents(scope: LeaderboardScope, page: number, totalPages: number) {
  const pageTag = scope.clanTag || "all";
  const previousPage = Math.max(1, page - 1);
  const nextPage = Math.min(totalPages, page + 1);

  return [
    {
      type: 1,
      components: [
        {
          type: 2,
          style: 1,
          custom_id: `legend_lb:prev:${pageTag}:${previousPage}`,
          label: "Prev",
          emoji: { name: "⬅️" },
          disabled: page <= 1,
        },
        {
          type: 2,
          style: 2,
          custom_id: `legend_lb:refresh:${pageTag}:${page}`,
          label: "Refresh",
          emoji: { name: "🔄" },
        },
        {
          type: 2,
          style: 1,
          custom_id: `legend_lb:next:${pageTag}:${nextPage}`,
          label: "Next",
          emoji: { name: "➡️" },
          disabled: page >= totalPages,
        },
      ],
    },
  ];
}

function buildLeaderboardDescription(rows: string[]): string {
  if (rows.length === 0) {
    return "No players found for this scope.";
  }

  const visibleRows: string[] = [];

  for (const row of rows) {
    const candidateRows = [...visibleRows, row];
    const candidateDescription = candidateRows.join("\n");

    if (candidateDescription.length > MAX_EMBED_DESCRIPTION_LENGTH) {
      break;
    }

    visibleRows.push(row);
  }

  const hiddenRows = rows.length - visibleRows.length;
  if (hiddenRows <= 0) {
    return visibleRows.join("\n");
  }

  const moreNotice = `\n\n... and ${hiddenRows} more player${hiddenRows === 1 ? "" : "s"} on this page.`;

  while (visibleRows.length > 0) {
    const candidateDescription = `${visibleRows.join("\n")}${moreNotice}`;
    if (candidateDescription.length <= MAX_EMBED_DESCRIPTION_LENGTH) {
      return candidateDescription;
    }

    visibleRows.pop();
  }

  return moreNotice.trimStart();
}

async function renderLeaderboard(scope: LeaderboardScope, page: number, forceRefresh = false) {
  const leaderboardPage = await buildLeaderboardPage(scope, page, forceRefresh);
  const startIndex = (leaderboardPage.currentPage - 1) * PAGE_SIZE;

  const descriptionRows = leaderboardPage.entries.length > 0
    ? leaderboardPage.entries.map((entry, index) => formatLeaderboardRow(entry, startIndex + index + 1))
    : ["No players found for this scope."];

  const description = buildLeaderboardDescription(descriptionRows);

  const embeds = [{
    title: `🏆 Legend Leaderboard${scope.clanTag ? ` - ${scope.clanName}` : " - BOOM House Alliance"}`,
    color: 0x5865F2,
    description,
    footer: {
      text: `Page ${leaderboardPage.currentPage}/${leaderboardPage.totalPages} • ${leaderboardPage.scopeLabel} • Updated ${new Date(leaderboardPage.refreshedAt).toLocaleString()}`,
    },
    timestamp: leaderboardPage.refreshedAt,
  }];

  return {
    embeds,
    components: buildComponents(scope, leaderboardPage.currentPage, leaderboardPage.totalPages),
  };
}

export default {
  data: {
    name: "legend",
    description: "View BOOM House trophy leaderboards",
    type: ApplicationCommandType.ChatInput,
    options: [
      {
        name: "leaderboard",
        description: "Show the legend leaderboard",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: "clan",
            description: "Filter to a specific linked clan",
            type: ApplicationCommandOptionType.String,
            required: false,
            autocomplete: true,
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

    const subcommandOptions = getSubcommandOptions(interaction.data.options as InteractionDataOption[] | undefined, "leaderboard");
    const clanInput = getOptionValue(subcommandOptions, "clan");

    const resolvedScope = await resolveScope(clanInput);

    if (!resolvedScope) {
      return {
        content: "<a:redcross:1495393630112841839> That clan is not linked on the server.",
        flags: MessageFlags.Ephemeral,
      };
    }

    try {
      const payload = await renderLeaderboard(resolvedScope, 1, true);
      return {
        content: "",
        embeds: payload.embeds,
        components: payload.components,
      };
    } catch (error) {
      logger.error("Failed to render leaderboard", {
        error: getAxiosErrorDetails(error).message,
      });
      return {
        content: "<a:redcross:1495393630112841839> Failed to build the leaderboard.",
        flags: MessageFlags.Ephemeral,
      };
    }
  },

  handlers: {
    "legend_lb": async ({ interaction, args }: { interaction: SimplifiedInteraction; args: string[] }) => {
      const [action, scopeTag, pageValue] = args;
      if (!action || !["prev", "next", "refresh"].includes(action)) {
        return;
      }

      const page = getPageValue(pageValue);

      const resolvedScope = await resolveScope(scopeTag === "all" ? undefined : scopeTag);
      if (!resolvedScope) {
        await axios.post(
          `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`,
          {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: "<a:redcross:1495393630112841839> That clan is no longer linked.",
              flags: MessageFlags.Ephemeral,
            },
          }
        );
        return;
      }

      await axios.post(
        `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`,
        { type: InteractionResponseType.DeferredMessageUpdate },
        { headers: { "Content-Type": "application/json" } }
      );

      try {
        const payload = await renderLeaderboard(resolvedScope, page, action === "refresh");
        await axios.patch(
          `https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`,
          {
            embeds: payload.embeds,
            components: payload.components,
          },
          { headers: { "Content-Type": "application/json" } }
        );
      } catch (error) {
        const errorDetails = getAxiosErrorDetails(error);
        logger.error("Failed to update leaderboard", {
          action,
          scopeTag,
          page,
          status: errorDetails.status,
          responseData: errorDetails.responseData,
          error: errorDetails.message,
        });

        try {
          await axios.patch(
            `https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`,
            {
              content: "<a:redcross:1495393630112841839> Failed to update the leaderboard. Please try again.",
              embeds: [],
              components: [],
            },
            { headers: { "Content-Type": "application/json" } }
          );
        } catch (fallbackError) {
          const fallbackErrorDetails = getAxiosErrorDetails(fallbackError);
          logger.error("Failed to send leaderboard fallback reply", {
            action,
            scopeTag,
            page,
            status: fallbackErrorDetails.status,
            responseData: fallbackErrorDetails.responseData,
            error: fallbackErrorDetails.message,
          });
        }
      }
    },
  },

  async autocomplete(data: { interaction: SimplifiedInteraction }): CommandAutocompleteResult {
    const options = data.interaction.data.options as InteractionDataOption[] | undefined;
    const focusedValue = getFocusedOptionValue(options, "leaderboard", "clan");
    const choices = await getConfiguredClanAutocompleteChoices(focusedValue);
    return { choices };
  },
};
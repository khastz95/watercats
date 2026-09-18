import { matchActionRows } from "@/lib/discord/buttons";
import { buildLinkedRoasts } from "@/lib/discord/roasts";
import { renderMatchScoreboardPng, resolveFocusTeam, sourceLabel } from "@/lib/discord/scoreboardImage";
import { createChannelMessage } from "@/lib/discord/rest";
import { leetifyClient } from "@/lib/leetify/client";
import type { MatchReport } from "@/lib/leetify/mapper";
import { computePlayerRankDelta, type PlayerRankDelta } from "@/lib/leetify/rankDelta";
import { logEvent } from "@/lib/log";
import { playerService } from "./PlayerService";

const ACCENT = 0x006bff;
const DISCORD_CONTENT_MAX = 1900;

function mapLabel(mapName: string): string {
  return (mapName || "unknown").replace(/^de_/, "").toUpperCase();
}

/** Mentions + funny per-player lines for Discord-linked players in the match. */
export async function buildMatchMentions(
  report: MatchReport,
  linkedPlayers: { steam_id: string; discord_user_id: string; nickname?: string }[]
): Promise<{ content: string; userIds: string[]; roastSource: "llm" | "templates" }> {
  const { lines, userIds, source } = await buildLinkedRoasts(report, linkedPlayers);
  const platform = sourceLabel(report.dataSource);
  const header = `**${mapLabel(report.mapName)}** · ${platform}`;
  const roastBlock = lines.length
    ? ["", "**Catbot analisa o plantel:**", ...lines].join("\n")
    : "";

  let content = `${header}${roastBlock}`;
  if (content.length > DISCORD_CONTENT_MAX) {
    const kept: string[] = [header, "", "**Catbot analisa o plantel:**"];
    for (const line of lines) {
      const next = [...kept, line].join("\n");
      if (next.length > DISCORD_CONTENT_MAX) break;
      kept.push(line);
    }
    content = kept.join("\n");
  }
  return { content, userIds, roastSource: source };
}

async function resolveHomeRankDeltas(
  report: MatchReport,
  watercatsSteamIds: string[]
): Promise<Record<string, PlayerRankDelta | null>> {
  const wc = new Set(watercatsSteamIds);
  const focus = resolveFocusTeam(report, watercatsSteamIds);
  const homeWc = report.players.filter((p) => p.teamNumber === focus && wc.has(p.steamId));
  const out: Record<string, PlayerRankDelta | null> = {};

  await Promise.all(
    homeWc.map(async (p) => {
      try {
        const profile = await leetifyClient.getPlayerProfile({ steam64Id: p.steamId });
        out[p.steamId] = computePlayerRankDelta(profile, report.id, report.dataSource);
      } catch (err) {
        const message = err instanceof Error ? err.message : "unknown";
        logEvent("RANK_DELTA_LOOKUP_FAILED", { steamId: p.steamId, matchId: report.id, error: message });
        out[p.steamId] = null;
      }
    })
  );

  return out;
}

export class MatchNotificationService {
  async notifyMatch(report: MatchReport, channelId: string): Promise<{ sent: boolean; messageId?: string }> {
    if (await playerService.isProcessed(report.id, "leetify")) {
      logEvent("MATCH_ALREADY_PROCESSED", { matchId: report.id });
      return { sent: false };
    }

    try {
      const monitored = await playerService.listMonitored();
      const allPlayers = await playerService.listPlayers();
      const watercatsSteamIds = monitored.map((m) => m.player.steam_id);
      const linked = allPlayers
        .filter((p) => p.discord_user_id)
        .map((p) => ({
          steam_id: p.steam_id,
          discord_user_id: p.discord_user_id,
          nickname: p.nickname,
        }));

      const rankBySteam = await resolveHomeRankDeltas(report, watercatsSteamIds);
      const png = await renderMatchScoreboardPng(report, { watercatsSteamIds, rankBySteam });
      const { content, userIds, roastSource } = await buildMatchMentions(report, linked);

      const message = await createChannelMessage({
        channelId,
        content,
        embeds: [
          {
            title: `${mapLabel(report.mapName)} · ${sourceLabel(report.dataSource)}`,
            description: report.leetifyUrl
              ? `[Open full match on Leetify](${report.leetifyUrl})`
              : undefined,
            color: ACCENT,
            image: { url: "attachment://scoreboard.png" },
            footer: { text: "Data Provided by Leetify" },
            timestamp: report.finishedAt || undefined,
          },
        ],
        components: matchActionRows(report),
        files: [{ name: "scoreboard.png", data: png, contentType: "image/png" }],
        allowedMentions: { users: userIds },
      });

      const row = await playerService.markProcessed({
        externalMatchId: report.id,
        source: "leetify",
        discordMessageId: message.id,
        channelId: message.channel_id || channelId,
      });

      if (!row) {
        logEvent("MATCH_ALREADY_PROCESSED", { matchId: report.id, note: "unique_after_send" });
        return { sent: false, messageId: message.id };
      }

      // Pontuação channel for linked players with rank deltas
      try {
        const { rankNotificationService } = await import("./RankNotificationService");
        const linkedBySteam = new Map(
          linked.map((p) => [p.steam_id, { discord_user_id: p.discord_user_id, nickname: p.nickname || "" }])
        );
        await rankNotificationService.notifyMatchRanks(report, rankBySteam, linkedBySteam);
      } catch (rankErr) {
        logEvent("RANK_CHANNEL_NOTIFY_FAILED", {
          matchId: report.id,
          error: rankErr instanceof Error ? rankErr.message : String(rankErr),
        });
      }

      logEvent("MATCH_NOTIFICATION_SENT", {
        matchId: report.id,
        messageId: message.id,
        players: report.players.length,
        mentions: userIds.length,
        format: "scoreboard_png",
        roastSource,
      });
      return { sent: true, messageId: message.id };
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown";
      logEvent("MATCH_NOTIFICATION_FAILED", { matchId: report.id, error: message });
      throw err;
    }
  }
}

export const matchNotificationService = new MatchNotificationService();

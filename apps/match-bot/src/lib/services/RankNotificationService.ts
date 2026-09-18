import { createChannelMessage } from "@/lib/discord/rest";
import { getEnv } from "@/lib/env";
import { leetifyClient } from "@/lib/leetify/client";
import type { MatchReport } from "@/lib/leetify/mapper";
import {
  formatRankDelta,
  type PlayerRankDelta,
  type RankLane,
} from "@/lib/leetify/rankDelta";
import type { LeetifyProfileResponse } from "@/lib/leetify/types";
import { logEvent } from "@/lib/log";
import { playerService } from "./PlayerService";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function ranksChannelId(): string {
  return getEnv().DISCORD_RANKS_CHANNEL_ID || "";
}

async function resolveRanksChannel(): Promise<string> {
  const config = await playerService.getDiscordConfig();
  return config?.ranks_channel_id || ranksChannelId();
}

function laneLabel(lane: RankLane): string {
  if (lane === "premier") return "PREMIER";
  if (lane === "faceit") return "FACEIT";
  if (lane === "gamersclub") return "GAMERSCLUB";
  return "RANK";
}

function laneColor(delta: number | null | undefined): number {
  if (delta == null || delta === 0) return 0x6b7280;
  return delta > 0 ? 0x34d399 : 0xf87171;
}

function snapshotRanks(profile: LeetifyProfileResponse): {
  premier: string;
  faceit: string;
  gc: string;
} {
  const ranks = profile.ranks || {};
  const premier =
    ranks.premier != null ? Number(ranks.premier).toLocaleString("pt-BR") : "—";
  const faceit =
    ranks.faceit_elo != null ? Number(ranks.faceit_elo).toLocaleString("pt-BR") : "—";
  return { premier, faceit, gc: "—" };
}

/** Prefer GC level from newest GC recent match when present. */
function enrichSnapshot(profile: LeetifyProfileResponse): {
  premier: string;
  faceit: string;
  gc: string;
} {
  const base = snapshotRanks(profile);
  const recent = [...(profile.recent_matches || [])].sort(
    (a, b) => Date.parse(b.finished_at || "") - Date.parse(a.finished_at || "")
  );
  const gcMatch = recent.find((m) => {
    const s = String(m.data_source || "").toLowerCase();
    return s.includes("gamersclub") || s.includes("gc");
  });
  if (gcMatch?.rank != null && Number(gcMatch.rank) >= 1 && Number(gcMatch.rank) <= 20) {
    base.gc = `GC ${gcMatch.rank}`;
  }
  const premierMatch = recent.find((m) => {
    const s = String(m.data_source || "").toLowerCase();
    const r = Number(m.rank);
    return (s.includes("premier") || s.includes("matchmaking") || s.includes("valve")) && r >= 1000;
  });
  if (premierMatch?.rank != null) {
    base.premier = Number(premierMatch.rank).toLocaleString("pt-BR");
  }
  return base;
}

export class RankNotificationService {
  async notifyMatchRanks(
    report: MatchReport,
    rankBySteam: Record<string, PlayerRankDelta | null>,
    linkedBySteam: Map<string, { discord_user_id: string; nickname: string }>
  ): Promise<number> {
    const channelId = await resolveRanksChannel();
    if (!channelId) return 0;

    let posted = 0;
    for (const [steamId, delta] of Object.entries(rankBySteam)) {
      const linked = linkedBySteam.get(steamId);
      if (!linked || !delta || delta.value === null) continue;
      // Post when we have a value; prefer when delta exists (gain/loss), still post level/rating after match
      const eventKey = `${steamId}:${delta.lane}:${report.id}`;
      if (await playerService.isRankEventProcessed(eventKey)) continue;

      const formatted = formatRankDelta(delta);
      if (!formatted) continue;
      // Faceit: só Elo (pontos). Ignora level.
      if (delta.lane === "faceit" && delta.unit !== "elo") continue;

      const won =
        delta.delta == null ? null : delta.delta > 0 ? true : delta.delta < 0 ? false : null;
      const verb =
        won === true ? "Subiu" : won === false ? "Caiu" : "Atualização";
      const mention = `<@${linked.discord_user_id}>`;
      const pointsLabel =
        delta.lane === "faceit"
          ? `${delta.value.toLocaleString("pt-BR")} pts`
          : formatted.primary;
      const content = `${mention} · **${laneLabel(delta.lane)}** · ${verb}: **${pointsLabel}**${
        formatted.delta ? ` (${formatted.delta})` : ""
      }`;

      const message = await createChannelMessage({
        channelId,
        content,
        embeds: [
          {
            title: laneLabel(delta.lane),
            description: `${linked.nickname || "Jogador"}${
              report.leetifyUrl ? `\n[Partida](${report.leetifyUrl})` : ""
            }`,
            color: laneColor(delta.delta),
            fields: [
              {
                name: "Pontuação",
                value: pointsLabel,
                inline: true,
              },
              {
                name: "Variação",
                value: formatted.delta || "—",
                inline: true,
              },
            ],
            footer: { text: "Catbot" },
            timestamp: report.finishedAt || undefined,
          },
        ],
        allowedMentions: { users: [linked.discord_user_id] },
      });

      const ok = await playerService.markRankEventProcessed({
        eventKey,
        steamId,
        lane: delta.lane,
        matchId: report.id,
        discordMessageId: message.id,
        channelId: message.channel_id || channelId,
      });
      if (ok) {
        posted += 1;
        logEvent("RANK_NOTIFICATION_SENT", { steamId, lane: delta.lane, matchId: report.id });
      }
      await sleep(800);
    }
    return posted;
  }

  /** One-shot: current Premier / Faceit / GC card per linked player. */
  async postCurrentRanks(): Promise<{ checked: number; notified: number; errors: number }> {
    const channelId = await resolveRanksChannel();
    if (!channelId) throw new Error("DISCORD_RANKS_CHANNEL_ID / ranks_channel_id missing");

    const linked = await playerService.listLinkedPlayers();
    let notified = 0;
    let errors = 0;

    for (const player of linked) {
      const eventKey = `snapshot:${player.steam_id}:${new Date().toISOString().slice(0, 10)}`;
      if (await playerService.isRankEventProcessed(eventKey)) {
        continue;
      }
      try {
        const profile = await leetifyClient.getPlayerProfile({ steam64Id: player.steam_id });
        const snap = enrichSnapshot(profile);
        const mention = `<@${player.discord_user_id}>`;
        const content = `${mention} · pontuação atual`;

        const message = await createChannelMessage({
          channelId,
          content,
          embeds: [
            {
              title: player.nickname || player.steam_id,
              color: 0x006bff,
              fields: [
                { name: "Premier", value: snap.premier, inline: true },
                { name: "FACEIT (pts)", value: snap.faceit, inline: true },
                { name: "GamersClub", value: snap.gc, inline: true },
              ],
              footer: { text: "Catbot" },
              timestamp: new Date().toISOString(),
            },
          ],
          allowedMentions: { users: [player.discord_user_id] },
        });

        const ok = await playerService.markRankEventProcessed({
          eventKey,
          steamId: player.steam_id,
          lane: "snapshot",
          matchId: "",
          discordMessageId: message.id,
          channelId: message.channel_id || channelId,
        });
        if (ok) notified += 1;
        await sleep(1500);
      } catch (err) {
        errors += 1;
        logEvent("RANK_SNAPSHOT_FAILED", {
          steamId: player.steam_id,
          error: err instanceof Error ? err.message : String(err),
        });
        await sleep(2500);
      }
    }

    return { checked: linked.length, notified, errors };
  }
}

export const rankNotificationService = new RankNotificationService();

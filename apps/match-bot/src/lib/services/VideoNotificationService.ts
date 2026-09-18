import { fetchAllstarClips, resolveAllstarUser, type AllstarClip } from "@/lib/allstar/client";
import { createChannelMessage } from "@/lib/discord/rest";
import { roastClip } from "@/lib/discord/videoRoasts";
import { getEnv } from "@/lib/env";
import { logEvent } from "@/lib/log";
import type { WcBotPlayer } from "@/lib/supabase/types";
import { playerService } from "./PlayerService";

const ACCENT = 0xa855f7;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function videosChannelId(): string {
  const env = getEnv();
  return env.DISCORD_VIDEOS_CHANNEL_ID || "";
}

async function resolveVideosChannel(): Promise<string> {
  const config = await playerService.getDiscordConfig();
  return config?.videos_channel_id || videosChannelId();
}

export type VideoSyncResult = {
  checkedPlayers: number;
  clipsFound: number;
  notified: number;
  skipped: number;
  errors: { steamId: string; message: string }[];
};

async function postClip(
  clip: AllstarClip,
  player: WcBotPlayer,
  channelId: string
): Promise<{ sent: boolean; messageId?: string }> {
  if (await playerService.isClipProcessed(clip.clipId)) {
    return { sent: false };
  }

  const nick = player.nickname || clip.username || "jogador";
  const roast = roastClip(clip, nick);
  const mention = player.discord_user_id ? `<@${player.discord_user_id}>` : nick;
  const map = (clip.map || "").replace(/^de_/, "").toUpperCase();
  const meta = [map, clip.weapon, clip.kills != null ? `${clip.kills}K` : null]
    .filter(Boolean)
    .join(" · ");

  const content = [
    `**Allstar** · ${mention}`,
    roast,
    meta ? `_${meta}_` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const message = await createChannelMessage({
    channelId,
    content: content.slice(0, 1900),
    embeds: [
      {
        title: clip.title.slice(0, 200),
        url: clip.url,
        description: `[Assistir no Allstar](${clip.url})`,
        color: ACCENT,
        image: clip.thumb ? { url: clip.thumb } : undefined,
        footer: { text: "Allstar.gg · Catbot" },
        timestamp: clip.createdAt || undefined,
        fields: [
          ...(map ? [{ name: "Mapa", value: map, inline: true }] : []),
          ...(clip.weapon ? [{ name: "Arma", value: clip.weapon, inline: true }] : []),
          ...(clip.kills != null
            ? [{ name: "Kills", value: String(clip.kills), inline: true }]
            : []),
        ],
      },
    ],
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 5,
            label: "Ver no Allstar",
            url: clip.url,
          },
        ],
      },
    ],
    allowedMentions: {
      users: player.discord_user_id ? [player.discord_user_id] : [],
    },
  });

  const ok = await playerService.markClipProcessed({
    clipId: clip.clipId,
    steamId: player.steam_id,
    discordMessageId: message.id,
    channelId: message.channel_id || channelId,
  });
  if (!ok) return { sent: false, messageId: message.id };

  logEvent("VIDEO_NOTIFICATION_SENT", {
    clipId: clip.clipId,
    steamId: player.steam_id,
    messageId: message.id,
  });
  return { sent: true, messageId: message.id };
}

export class VideoNotificationService {
  /**
   * Poll linked players for new Allstar clips (skip already processed).
   * When perPlayerLimit is set, only consider that many newest clips per player
   * (used for one-shot "last N" dumps).
   */
  async discoverAndNotify(options?: {
    perPlayerLimit?: number;
    forceNewest?: number;
  }): Promise<VideoSyncResult> {
    const channelId = await resolveVideosChannel();
    if (!channelId) throw new Error("DISCORD_VIDEOS_CHANNEL_ID / videos_channel_id missing");

    const linked = await playerService.listLinkedPlayers();
    const perPlayer = options?.forceNewest ?? options?.perPlayerLimit ?? 10;
    const result: VideoSyncResult = {
      checkedPlayers: 0,
      clipsFound: 0,
      notified: 0,
      skipped: 0,
      errors: [],
    };

    for (const player of linked) {
      result.checkedPlayers += 1;
      try {
        const user = await resolveAllstarUser(player.steam_id);
        if (!user) {
          result.skipped += 1;
          await sleep(400);
          continue;
        }
        const clips = await fetchAllstarClips(user.userId, { limit: perPlayer });
        const ordered = [...clips].sort(
          (a, b) => Date.parse(b.createdAt || "") - Date.parse(a.createdAt || "")
        );
        const batch = options?.forceNewest
          ? ordered.slice(0, options.forceNewest)
          : ordered;

        for (const clip of batch) {
          result.clipsFound += 1;
          const { sent } = await postClip(clip, player, channelId);
          if (sent) result.notified += 1;
          else result.skipped += 1;
          await sleep(1200);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        result.errors.push({ steamId: player.steam_id, message });
        logEvent("VIDEO_SYNC_PLAYER_FAILED", { steamId: player.steam_id, error: message });
        await sleep(2000);
      }
      await sleep(600);
    }

    logEvent("VIDEO_SYNC_COMPLETED", {
      checkedPlayers: result.checkedPlayers,
      clipsFound: result.clipsFound,
      notified: result.notified,
      skipped: result.skipped,
      errors: result.errors.length,
    });
    return result;
  }
}

export const videoNotificationService = new VideoNotificationService();

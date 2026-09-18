/**
 * Repost N newest clips in the new formal/link format (demo).
 * Usage: npx tsx --env-file=.env.local scripts/post-video-samples.ts --n=2 --only=khastz
 */
import { videoNotificationService } from "../src/lib/services/VideoNotificationService";
import { playerService } from "../src/lib/services/PlayerService";
import { fetchAllstarClips, resolveAllstarUser } from "../src/lib/allstar/client";
import { createChannelMessage } from "../src/lib/discord/rest";
import { roastClip } from "../src/lib/discord/videoRoasts";
import { getEnv } from "../src/lib/env";

const n = Math.max(1, Number(process.argv.find((a) => a.startsWith("--n="))?.slice(4) || 2) || 2);
const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7)?.toLowerCase();

async function main() {
  const linked = await playerService.listLinkedPlayers();
  const player = only
    ? linked.find((p) => (p.nickname || "").toLowerCase().includes(only))
    : linked[0];
  if (!player) throw new Error("player not found");

  const config = await playerService.getDiscordConfig();
  const channelId = config?.videos_channel_id || getEnv().DISCORD_VIDEOS_CHANNEL_ID;
  if (!channelId) throw new Error("videos channel missing");

  const user = await resolveAllstarUser(player.steam_id);
  if (!user) throw new Error("no allstar account");
  const clips = (await fetchAllstarClips(user.userId, { limit: n })).slice(0, n);

  for (const clip of clips) {
    const caption = roastClip(clip, player.nickname || user.username);
    const content = [`<@${player.discord_user_id}>`, caption, clip.url].join("\n");
    const msg = await createChannelMessage({
      channelId,
      content,
      components: [
        {
          type: 1,
          components: [{ type: 2, style: 5, label: "Assistir no Allstar", url: clip.url }],
        },
      ],
      allowedMentions: { users: [player.discord_user_id] },
    });
    console.log("posted", msg.id, clip.url);
  }
  void videoNotificationService;
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

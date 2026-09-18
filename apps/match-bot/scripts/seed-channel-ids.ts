import { getEnv } from "../src/lib/env";
import { playerService } from "../src/lib/services/PlayerService";

async function main() {
  const env = getEnv();
  const existing = await playerService.getDiscordConfig();
  const row = await playerService.upsertDiscordConfig({
    guild_id: existing?.guild_id || env.DISCORD_GUILD_ID || "unknown",
    match_channel_id: existing?.match_channel_id || env.DISCORD_MATCH_CHANNEL_ID || "",
    videos_channel_id: "1550249785800392864",
    logs_channel_id: "1550249415145693264",
    ranks_channel_id: "1550249552647291042",
    enabled: true,
  });
  console.log(JSON.stringify(row, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

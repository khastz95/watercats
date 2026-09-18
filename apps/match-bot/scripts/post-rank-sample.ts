import { getEnv } from "../src/lib/env";
import { leetifyClient } from "../src/lib/leetify/client";
import { createChannelMessage } from "../src/lib/discord/rest";
import { playerService } from "../src/lib/services/PlayerService";

async function main() {
  const linked = await playerService.listLinkedPlayers();
  const player = linked.find((p) => (p.nickname || "").toLowerCase().includes("khastz")) || linked[0];
  const profile = await leetifyClient.getPlayerProfile({ steam64Id: player.steam_id });
  const ranks = profile.ranks || {};
  const premier = ranks.premier != null ? Number(ranks.premier).toLocaleString("pt-BR") : "—";
  const faceit = ranks.faceit_elo != null ? Number(ranks.faceit_elo).toLocaleString("pt-BR") : "—";
  const recent = [...(profile.recent_matches || [])].sort((a,b)=>Date.parse(b.finished_at||"")-Date.parse(a.finished_at||""));
  const gcMatch = recent.find((m) => /gamersclub|gc/i.test(String(m.data_source||"")));
  const gc = gcMatch?.rank != null && Number(gcMatch.rank) <= 20 ? `GC ${gcMatch.rank}` : "—";
  const config = await playerService.getDiscordConfig();
  const channelId = config?.ranks_channel_id || getEnv().DISCORD_RANKS_CHANNEL_ID!;
  const msg = await createChannelMessage({
    channelId,
    content: `<@${player.discord_user_id}> · pontuação atual`,
    embeds: [{
      title: player.nickname || player.steam_id,
      color: 0x006bff,
      fields: [
        { name: "Premier", value: premier, inline: true },
        { name: "FACEIT (pts)", value: faceit, inline: true },
        { name: "GamersClub", value: gc, inline: true },
      ],
      footer: { text: "Catbot" },
    }],
    allowedMentions: { users: [player.discord_user_id] },
  });
  console.log("rank sample", msg.id, { premier, faceit, gc });
}
main().catch((e)=>{console.error(e); process.exit(1);});

// Atualiza o perfil Leetify de cada jogador com SteamID64.
// Mesmo trabalho do botão do painel: `npm run leetify`.

const { loadEnv } = require("./db");

loadEnv();

const { listPlayers, saveLeetify } = require("../lib/cloud");
const { fetchLeetifyProfile } = require("../lib/leetify");

(async () => {
  const players = (await listPlayers()).filter((p) => p.steamId);
  const rows = [];

  for (const player of players) {
    try {
      const profile = await fetchLeetifyProfile(player.steamId);
      await saveLeetify(player.id, profile);
      rows.push({
        id: player.id,
        ok: true,
        partidas: profile.matches,
        recentes: (profile.matchesRecent || []).length,
        detalhe: (profile.matchesRecent || []).filter((m) => m.kd != null).length
      });
    } catch (err) {
      rows.push({ id: player.id, ok: false, motivo: err.message });
    }
  }

  console.table(rows);
})().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});

// Busca os clipes da allstar.gg de cada jogador com SteamID64.
// Mesmo trabalho do botão do painel: `npm run clips`.
// Não apaga clipes colados à mão nem o destaque que o painel marcou.

const { loadEnv } = require("./db");

loadEnv();

const { listPlayers, saveAllstarAccount, importAllstarClips } = require("../lib/cloud");
const { resolveAllstarUser, fetchAllstarClips } = require("../lib/allstar");

(async () => {
  const players = (await listPlayers()).filter((p) => p.steamId);
  const rows = [];

  for (const player of players) {
    try {
      const account = await resolveAllstarUser(player.steamId);
      if (!account) {
        rows.push({ id: player.id, ok: false, motivo: "sem conta allstar" });
        continue;
      }
      await saveAllstarAccount(player.id, account.userId, account.username);
      const clips = await fetchAllstarClips(account.userId);
      const { upserted } = await importAllstarClips(player.id, clips);
      rows.push({
        id: player.id,
        ok: true,
        allstar: account.username,
        clipes: upserted
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

// Busca o avatar do perfil da Steam de cada jogador e grava em steam_avatar.
// Mesmo trabalho do botão do painel, pela linha de comando: `npm run avatars`.
// Não toca em photo_url, então foto enviada à mão continua tendo prioridade.

const { loadEnv, sql } = require("./db");
const { fetchSteamAvatar } = require("../lib/steam");

loadEnv();

(async () => {
  const db = sql();
  try {
    const players = await db`
      select id, steam_id
      from public.players
      where steam_id <> ''
      order by sort_order
    `;

    for (const p of players) {
      try {
        const { avatar } = await fetchSteamAvatar(p.steam_id);
        await db`
          update public.players
          set steam_avatar = ${avatar}, updated_at = ${new Date()}
          where id = ${p.id}
        `;
      } catch (err) {
        console.error(`${p.id}: ${err.message}`);
      }
    }

    const rows = await db`
      select id, steam_avatar, photo_url <> '' as foto_propria
      from public.players
      order by sort_order
    `;
    console.table(rows);
  } finally {
    await db.end({ timeout: 5 });
  }
})().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});

// Preenche o elenco com os dados públicos dos perfis da Steam.
// Só grava o que é verificável: nick, nome real, cidade, país, Steam e Twitch.
// Função, bio e estatísticas ficam vazias — quem preenche é o painel ou a Leetify.

const { loadEnv, sql } = require("./db");

loadEnv();

const ROSTER = [
  {
    id: "s4mz",
    name: "s4mz",
    steam_id: "76561198304687498",
    steam_url: "https://steamcommunity.com/id/MORFETlCO",
    city: "Curitiba",
    country: "Brasil",
    color: "#20B8FF",
    sort_order: 1
  },
  {
    id: "fury",
    name: "fury",
    steam_id: "76561198330330644",
    steam_url: "https://steamcommunity.com/id/furyntc",
    country: "Brasil",
    color: "#008CFF",
    sort_order: 2
  },
  {
    id: "bill",
    name: "bill",
    real_name: "Yago Ventura",
    steam_id: "76561198340052875",
    steam_url: "https://steamcommunity.com/profiles/76561198340052875",
    country: "Brasil",
    color: "#006BFF",
    sort_order: 3
  },
  {
    id: "khastz",
    name: "khastz",
    real_name: "Saulo G. Padilha",
    steam_id: "76561198069381773",
    steam_url: "https://steamcommunity.com/id/khastz95",
    twitch_url: "https://twitch.tv/khastz95",
    country: "Brasil",
    color: "#7AD7FF",
    sort_order: 4
  },
  {
    id: "cadu",
    name: "cadu",
    real_name: "Victor Assunção",
    steam_id: "76561199173505462",
    steam_url: "https://steamcommunity.com/profiles/76561199173505462",
    city: "Belém",
    country: "Brasil",
    color: "#FF1838",
    sort_order: 5
  }
];

// Ids antigos que foram renomeados (nome errado no seed inicial).
const RETIRED = ["s4mlz"];

(async () => {
  const db = sql();
  try {
    for (const p of ROSTER) {
      await db`
        insert into public.players ${db(
          {
            id: p.id,
            name: p.name,
            real_name: p.real_name || "",
            city: p.city || "",
            country: p.country || "",
            steam_id: p.steam_id,
            steam_url: p.steam_url,
            twitch_url: p.twitch_url || "",
            color: p.color,
            sort_order: p.sort_order,
            status: "active",
            updated_at: new Date()
          }
        )}
        on conflict (id) do update set
          name = excluded.name,
          real_name = excluded.real_name,
          city = excluded.city,
          country = excluded.country,
          steam_id = excluded.steam_id,
          steam_url = excluded.steam_url,
          twitch_url = excluded.twitch_url,
          color = excluded.color,
          sort_order = excluded.sort_order,
          updated_at = excluded.updated_at
      `;
      await db`
        insert into public.player_stats (player_id) values (${p.id})
        on conflict (player_id) do nothing
      `;
    }

    for (const id of RETIRED) {
      await db`delete from public.players where id = ${id}`;
    }

    const rows = await db`
      select id, name, real_name, city, country, steam_id, twitch_url
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

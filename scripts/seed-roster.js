// Preenche o elenco com identidade, região e SteamID64.
// Os links públicos (Steam, Leetify, CSRep, FACEIT, GC) nascem desse ID.

const { loadEnv, sql } = require("./db");

loadEnv();

const ROSTER = [
  {
    id: "khastz",
    name: "khastz",
    real_name: "Saulo Padilha",
    role: "Entry Fragger",
    steam_id: "76561198069381773",
    steam_url: "https://steamcommunity.com/id/khastz95",
    twitch_url: "https://twitch.tv/khastz95",
    city: "Guarapuava",
    country: "PR",
    color: "#7B68D4",
    sort_order: 3
  },
  {
    id: "fury",
    name: "fury",
    real_name: "Junior Lisboa",
    role: "IGL",
    steam_id: "76561198330330644",
    steam_url: "https://steamcommunity.com/id/furyntc",
    city: "Guarapuava",
    country: "PR",
    color: "#E0C45C",
    sort_order: 1
  },
  {
    id: "s4mz",
    name: "s4mz",
    real_name: "Samuel Lisboa",
    role: "AWP",
    steam_id: "76561198304687498",
    steam_url: "https://steamcommunity.com/id/MORFETlCO",
    city: "Curitiba",
    country: "PR",
    color: "#3D8EEC",
    sort_order: 2
  },
  {
    id: "bill",
    name: "bill",
    real_name: "Yago Ventura",
    role: "Entry Fragger",
    steam_id: "76561198340052875",
    steam_url: "https://steamcommunity.com/profiles/76561198340052875",
    city: "Seropédica",
    country: "RJ",
    color: "#3CB08A",
    sort_order: 5
  },
  {
    id: "cadu",
    name: "cadu",
    real_name: "Victor Assunção",
    role: "Lucker",
    steam_id: "76561199173505462",
    steam_url: "https://steamcommunity.com/profiles/76561199173505462",
    city: "Belém",
    country: "PA",
    color: "#E09050",
    sort_order: 4
  }
];

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
            role: p.role || "",
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
          role = excluded.role,
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
      select id, name, real_name, role, city, country, steam_id
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

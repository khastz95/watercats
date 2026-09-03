const fs = require("fs");
const path = require("path");
const postgres = require("postgres");

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    const p = path.join(__dirname, "..", file);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

loadEnv();

function connString() {
  return process.env.POSTGRES_URL_NON_POOLING
    || process.env.CAMPX1_POSTGRES_URL_NON_POOLING
    || process.env.POSTGRES_URL
    || process.env.CAMPX1_POSTGRES_URL
    || "";
}

(async () => {
  const url = connString();
  if (!url) {
    console.error("Sem URL do Postgres. Defina POSTGRES_URL_NON_POOLING no .env.local");
    process.exit(1);
  }
  const sql = postgres(url, { ssl: "require", max: 1, idle_timeout: 5 });
  try {
    const text = fs.readFileSync(path.join(__dirname, "..", "supabase.sql"), "utf8");
    await sql.unsafe(text);
    const tables = await sql`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
      order by table_name
    `;
    const players = await sql`select id from public.players order by sort_order`;
    console.log("tabelas:", tables.map((t) => t.table_name).join(", "));
    console.log("jogadores:", players.map((p) => p.id).join(", "));
  } finally {
    await sql.end({ timeout: 5 });
  }
})().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});

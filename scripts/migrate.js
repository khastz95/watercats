const fs = require("fs");
const path = require("path");
const { loadEnv, sql: connect } = require("./db");

loadEnv();

(async () => {
  const sql = connect();
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

const fs = require("fs");
const path = require("path");
const { loadEnv, sql: connect } = require("./db");

loadEnv();

(async () => {
  const sql = connect();
  try {
    const text = fs.readFileSync(path.join(__dirname, "..", "supabase-join.sql"), "utf8");
    await sql.unsafe(text);
    const rows = await sql`
      select column_name
      from information_schema.columns
      where table_schema = 'public' and table_name = 'join_requests'
      order by ordinal_position
    `;
    console.log("join_requests ok:", rows.map((r) => r.column_name).join(", "));
  } finally {
    await sql.end({ timeout: 5 });
  }
})().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});

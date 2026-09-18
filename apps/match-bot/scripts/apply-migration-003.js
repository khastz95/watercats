/**
 * Apply migration 003_channels_and_clips.sql
 */
const fs = require("fs");
const path = require("path");
const postgres = require("../../../node_modules/postgres");

function loadEnv(dir) {
  for (const file of [".env.local", ".env"]) {
    const p = path.join(dir, file);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  }
}

loadEnv(path.resolve(__dirname, "..", "..", ".."));
loadEnv(path.resolve(__dirname, ".."));

async function main() {
  const pgUrl =
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.CAMPX1_POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL ||
    process.env.CAMPX1_POSTGRES_URL;
  if (!pgUrl) throw new Error("Postgres URL missing");
  const sql = fs.readFileSync(
    path.join(__dirname, "..", "supabase", "migrations", "003_channels_and_clips.sql"),
    "utf8"
  );
  const db = postgres(pgUrl, { ssl: "require", max: 1 });
  try {
    await db.unsafe(sql);
    console.log("Migration 003_channels_and_clips applied");
  } finally {
    await db.end({ timeout: 5 });
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});

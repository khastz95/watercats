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

function connString() {
  return process.env.POSTGRES_URL_NON_POOLING
    || process.env.CAMPX1_POSTGRES_URL_NON_POOLING
    || process.env.POSTGRES_URL
    || process.env.CAMPX1_POSTGRES_URL
    || "";
}

function sql() {
  const url = connString();
  if (!url) {
    console.error("Sem URL do Postgres. Defina POSTGRES_URL_NON_POOLING no .env.local");
    process.exit(1);
  }
  return postgres(url, { ssl: "require", max: 1, idle_timeout: 5 });
}

module.exports = { loadEnv, connString, sql };

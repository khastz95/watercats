// Integração com a API do CSRep (https://csrep.gg/docs/api-reference).
// O acesso é liberado por pedido, então a chave e a rota vêm do ambiente:
//   CSREP_API_KEY    chave recebida do CSRep (obrigatória)
//   CSREP_API_BASE   base da API      (padrão https://csrep.gg/api)
//   CSREP_API_PATH   rota do jogador  (padrão /v1/players/{steamId})
//
// A resposta crua é guardada inteira em player_stats.extra.csrep. Só o que dá
// para reconhecer com segurança vira número na tela; o resto fica como veio.

const DEFAULT_BASE = "https://csrep.gg/api";
const DEFAULT_PATH = "/v1/players/{steamId}";

function csrepConfigured() {
  return Boolean(process.env.CSREP_API_KEY);
}

function endpoint(steamId) {
  const base = String(process.env.CSREP_API_BASE || DEFAULT_BASE).replace(/\/+$/, "");
  const path = String(process.env.CSREP_API_PATH || DEFAULT_PATH);
  return base + path.replace("{steamId}", encodeURIComponent(steamId));
}

// Achata o payload em pares "chave => número", sem se prender ao formato.
function flatten(value, out = {}, prefix = "") {
  if (value == null || typeof value !== "object") return out;
  for (const [key, val] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (val != null && typeof val === "object") flatten(val, out, path);
    else out[path] = val;
  }
  return out;
}

const ALIASES = {
  rating: ["rating", "hltv_rating", "hltvRating", "rating2", "csrep_rating"],
  kd: ["kd", "kd_ratio", "kdRatio", "kdr"],
  adr: ["adr", "damage_per_round", "damagePerRound"],
  hsPercent: ["hs_percent", "hsPercent", "headshot_percentage", "headshotPercentage", "hs"],
  mapsPlayed: ["maps_played", "mapsPlayed", "matches", "matches_played", "matchesPlayed"],
  wins: ["wins", "won", "matches_won"],
  losses: ["losses", "lost", "matches_lost"],
  kills: ["kills", "total_kills", "totalKills"],
  deaths: ["deaths", "total_deaths", "totalDeaths"],
  assists: ["assists", "total_assists"],
  firstKills: ["first_kills", "firstKills", "opening_kills", "openingKills", "entry_kills"],
  clutches: ["clutches", "clutches_won", "clutchesWon"],
  mvp: ["mvp", "mvps"],
  trust: ["trust", "trust_score", "trustScore", "reputation", "reputation_score"]
};

function num(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Casa o último segmento da chave com os apelidos conhecidos.
function pick(flat, aliases) {
  const wanted = aliases.map((a) => a.toLowerCase());
  for (const [path, value] of Object.entries(flat)) {
    const leaf = path.split(".").pop().toLowerCase();
    if (wanted.includes(leaf)) {
      const n = num(value);
      if (n !== null) return n;
    }
  }
  return null;
}

function normalizeCsrep(payload) {
  const flat = flatten(payload);
  const stats = {};
  for (const [field, aliases] of Object.entries(ALIASES)) {
    stats[field] = pick(flat, aliases);
  }
  return stats;
}

async function fetchCsrepPlayer(steamId) {
  if (!csrepConfigured()) {
    const err = new Error("Defina CSREP_API_KEY para usar o CSRep");
    err.status = 503;
    throw err;
  }
  const id = String(steamId || "").trim();
  if (!/^\d{17}$/.test(id)) {
    const err = new Error("SteamID64 inválido");
    err.status = 400;
    throw err;
  }
  const res = await fetch(endpoint(id), {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${process.env.CSREP_API_KEY}`,
      "X-API-Key": process.env.CSREP_API_KEY
    }
  });
  const text = await res.text();
  if (!res.ok) {
    const err = new Error(`CSRep respondeu ${res.status}: ${text.slice(0, 200)}`);
    err.status = res.status === 404 ? 404 : 502;
    throw err;
  }
  let raw;
  try {
    raw = text ? JSON.parse(text) : null;
  } catch {
    const err = new Error("CSRep não devolveu JSON");
    err.status = 502;
    throw err;
  }
  return { raw, stats: normalizeCsrep(raw), syncedAt: new Date().toISOString() };
}

module.exports = { csrepConfigured, endpoint, normalizeCsrep, fetchCsrepPlayer };

// Integração com a API pública da Leetify.
// Doc: https://api-public-docs.cs-prod.leetify.com  ·  base: api-public.cs-prod.leetify.com
//
// A chave é opcional (só afrouxa o limite de requisições). Quando existir,
// vai em LEETIFY_API_KEY. O perfil é buscado pelo SteamID64 e só responde
// para quem tem conta na Leetify com o perfil público.

const BASE = "https://api-public.cs-prod.leetify.com";

function num(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function round(v, digits) {
  const n = num(v);
  if (n === null) return null;
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

// Só os campos que a Leetify realmente devolve — nada é derivado nem estimado.
function mapProfile(raw) {
  const ranks = raw.ranks || {};
  const rating = raw.rating || {};
  const stats = raw.stats || {};
  return {
    name: raw.name || "",
    steam64Id: raw.steam64_id || "",
    privacy: raw.privacy_mode || "",
    firstMatch: raw.first_match_date || null,
    matches: num(raw.total_matches),
    winrate: round(raw.winrate, 4),

    ratingLeetify: round(ranks.leetify, 2),
    premier: num(ranks.premier),
    faceit: num(ranks.faceit),
    faceitElo: num(ranks.faceit_elo),

    aim: round(rating.aim, 1),
    positioning: round(rating.positioning, 1),
    utility: round(rating.utility, 1),
    clutch: round(rating.clutch, 4),
    opening: round(rating.opening, 4),

    hsAccuracy: round(stats.accuracy_head, 1),
    sprayAccuracy: round(stats.spray_accuracy, 1),
    preaim: round(stats.preaim, 2),
    reactionMs: round(stats.reaction_time_ms, 0),

    // Últimos resultados, do mais recente para o mais antigo.
    form: (raw.recent_matches || []).slice(0, 5).map((m) => ({
      outcome: m.outcome || "",
      map: m.map_name || "",
      score: Array.isArray(m.score) ? m.score.join("-") : "",
      finishedAt: m.finished_at || null
    }))
  };
}

async function fetchLeetifyProfile(steamId) {
  const id = String(steamId || "").trim();
  if (!/^\d{17}$/.test(id)) {
    const err = new Error("SteamID64 inválido");
    err.status = 400;
    throw err;
  }
  const headers = { Accept: "application/json" };
  if (process.env.LEETIFY_API_KEY) {
    headers.Authorization = `Bearer ${process.env.LEETIFY_API_KEY}`;
  }
  const res = await fetch(`${BASE}/v3/profile?steam64_id=${encodeURIComponent(id)}`, { headers });
  const text = await res.text();
  if (!res.ok) {
    const err = new Error(
      res.status === 404
        ? "Perfil não encontrado na Leetify"
        : `Leetify respondeu ${res.status}`
    );
    err.status = res.status === 404 ? 404 : 502;
    throw err;
  }
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    const err = new Error("Leetify não devolveu JSON");
    err.status = 502;
    throw err;
  }
  if (raw.privacy_mode && raw.privacy_mode !== "public") {
    const err = new Error("Perfil da Leetify está privado");
    err.status = 403;
    throw err;
  }
  return { ...mapProfile(raw), syncedAt: new Date().toISOString() };
}

module.exports = { BASE, mapProfile, fetchLeetifyProfile };

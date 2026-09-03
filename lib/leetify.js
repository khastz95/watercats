// Integração com a API pública da Leetify.
// Doc: https://api-public-docs.cs-prod.leetify.com  ·  base: api-public.cs-prod.leetify.com
//
// A chave é opcional (só afrouxa o limite de requisições). Quando existir,
// vai em LEETIFY_API_KEY. O perfil é buscado pelo SteamID64 e só responde
// para quem tem conta na Leetify com o perfil público.
//
// Guarda o perfil inteiro: ranks, notas de habilidade, as 21 métricas,
// as últimas partidas e os colegas de time. Nada é derivado nem estimado.

const BASE = "https://api-public.cs-prod.leetify.com";
const RECENT_MATCHES = 20;

// As 21 métricas de `stats`, na ordem em que aparecem na ficha.
const METRICS = [
  // Mira
  { key: "accuracyEnemySpotted", from: "accuracy_enemy_spotted", group: "aim", digits: 1, unit: "%" },
  { key: "accuracyHead", from: "accuracy_head", group: "aim", digits: 1, unit: "%" },
  { key: "sprayAccuracy", from: "spray_accuracy", group: "aim", digits: 1, unit: "%" },
  { key: "counterStrafing", from: "counter_strafing_good_shots_ratio", group: "aim", digits: 1, unit: "%" },
  { key: "preaim", from: "preaim", group: "aim", digits: 2, unit: "°" },
  { key: "reactionMs", from: "reaction_time_ms", group: "aim", digits: 0, unit: "ms" },

  // Utilitária
  { key: "flashThrown", from: "flashbang_thrown", group: "utility", digits: 1 },
  { key: "flashFoePerFlash", from: "flashbang_hit_foe_per_flashbang", group: "utility", digits: 2 },
  { key: "flashFoeDuration", from: "flashbang_hit_foe_avg_duration", group: "utility", digits: 2, unit: "s" },
  { key: "flashFriendPerFlash", from: "flashbang_hit_friend_per_flashbang", group: "utility", digits: 2 },
  { key: "flashToKill", from: "flashbang_leading_to_kill", group: "utility", digits: 1, unit: "%" },
  { key: "heFoesDamage", from: "he_foes_damage_avg", group: "utility", digits: 1 },
  { key: "heFriendsDamage", from: "he_friends_damage_avg", group: "utility", digits: 1 },
  { key: "utilityOnDeath", from: "utility_on_death_avg", group: "utility", digits: 0 },

  // Trocas e entrada
  { key: "tradeOpportunities", from: "trade_kill_opportunities_per_round", group: "trade", digits: 2 },
  { key: "tradeKillsSuccess", from: "trade_kills_success_percentage", group: "trade", digits: 1, unit: "%" },
  { key: "tradedDeathsSuccess", from: "traded_deaths_success_percentage", group: "trade", digits: 1, unit: "%" },
  { key: "ctOpeningDuel", from: "ct_opening_duel_success_percentage", group: "trade", digits: 1, unit: "%" },
  { key: "tOpeningDuel", from: "t_opening_duel_success_percentage", group: "trade", digits: 1, unit: "%" },
  { key: "ctOpeningAggression", from: "ct_opening_aggression_success_rate", group: "trade", digits: 1, unit: "%" },
  { key: "tOpeningAggression", from: "t_opening_aggression_success_rate", group: "trade", digits: 1, unit: "%" }
];

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

function mapProfile(raw) {
  const ranks = raw.ranks || {};
  const rating = raw.rating || {};
  const stats = raw.stats || {};

  const metrics = {};
  for (const m of METRICS) metrics[m.key] = round(stats[m.from], m.digits);

  return {
    name: raw.name || "",
    steam64Id: raw.steam64_id || "",
    leetifyId: raw.id || "",
    privacy: raw.privacy_mode || "",
    firstMatch: raw.first_match_date || null,
    matches: num(raw.total_matches),
    winrate: round(raw.winrate, 4),
    bans: Array.isArray(raw.bans) ? raw.bans : [],

    ranks: {
      leetify: round(ranks.leetify, 2),
      premier: num(ranks.premier),
      wingman: num(ranks.wingman),
      renown: num(ranks.renown),
      faceit: num(ranks.faceit),
      faceitElo: num(ranks.faceit_elo),
      // Rank por mapa; a Leetify manda 0 para mapa sem rank.
      competitive: (ranks.competitive || [])
        .filter((c) => num(c.rank))
        .map((c) => ({ map: c.map_name || "", rank: num(c.rank) }))
    },

    rating: {
      aim: round(rating.aim, 1),
      positioning: round(rating.positioning, 1),
      utility: round(rating.utility, 1),
      clutch: round(rating.clutch, 3),
      opening: round(rating.opening, 3),
      ctLeetify: round(rating.ct_leetify, 3),
      tLeetify: round(rating.t_leetify, 3)
    },

    metrics,

    matchesRecent: (raw.recent_matches || []).slice(0, RECENT_MATCHES).map((m) => ({
      id: m.id || "",
      finishedAt: m.finished_at || null,
      source: m.data_source || "",
      outcome: m.outcome || "",
      map: m.map_name || "",
      score: Array.isArray(m.score) ? m.score : [],
      rank: num(m.rank),
      rating: round(m.leetify_rating, 3),
      preaim: round(m.preaim, 2),
      reactionMs: round(m.reaction_time_ms, 0),
      accuracyHead: round(m.accuracy_head, 1),
      sprayAccuracy: round(m.spray_accuracy, 1)
    })),

    teammates: (raw.recent_teammates || []).map((tm) => ({
      steam64Id: tm.steam64_id || "",
      matches: num(tm.recent_matches_count)
    }))
  };
}

// Versão enxuta para as listagens (home, elenco, tabela).
function summarize(profile) {
  if (!profile) return null;
  const { ranks = {}, rating = {}, metrics = {} } = profile;
  return {
    syncedAt: profile.syncedAt || null,
    matches: profile.matches ?? null,
    winrate: profile.winrate ?? null,
    ranks: {
      leetify: ranks.leetify ?? null,
      premier: ranks.premier ?? null,
      faceitElo: ranks.faceitElo ?? null
    },
    rating: {
      aim: rating.aim ?? null,
      positioning: rating.positioning ?? null,
      utility: rating.utility ?? null
    },
    metrics: {
      accuracyHead: metrics.accuracyHead ?? null,
      reactionMs: metrics.reactionMs ?? null
    },
    form: (profile.matchesRecent || []).slice(0, 5).map((m) => ({
      outcome: m.outcome,
      map: m.map,
      score: Array.isArray(m.score) ? m.score.join("-") : ""
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

module.exports = { BASE, METRICS, mapProfile, summarize, fetchLeetifyProfile };

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
const RECENT_MATCHES = 30;

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

function pct01(v, digits = 1) {
  const n = num(v);
  if (n === null) return null;
  return round(n <= 1 && n >= 0 ? n * 100 : n, digits);
}

function mapBans(list) {
  return (Array.isArray(list) ? list : []).map((b) => ({
    platform: b.platform || "",
    nick: b.platform_nickname || "",
    since: b.banned_since || null
  }));
}

function mapRecentMatch(m) {
  return {
    id: m.id || "",
    finishedAt: m.finished_at || null,
    source: m.data_source || "",
    outcome: m.outcome || "",
    map: m.map_name || "",
    score: Array.isArray(m.score) ? m.score : [],
    rank: num(m.rank),
    rankType: num(m.rank_type),
    rating: round(m.leetify_rating, 3),
    preaim: round(m.preaim, 2),
    reactionMs: round(m.reaction_time_ms, 0),
    accuracySpotted: round(m.accuracy_enemy_spotted, 1),
    accuracyHead: round(m.accuracy_head, 1),
    sprayAccuracy: round(m.spray_accuracy, 1)
  };
}

function mapMatchDetails(m, steamId) {
  const me = (m.stats || []).find((s) => String(s.steam64_id) === String(steamId)) || (m.stats || [])[0] || {};
  const scores = (m.team_scores || []).map((s) => num(s.score)).filter((n) => n != null);
  const reaction = num(me.reaction_time);
  return {
    id: m.id || "",
    finishedAt: m.finished_at || null,
    source: m.data_source || "",
    map: m.map_name || "",
    banned: Boolean(m.has_banned_player),
    score: scores,
    name: me.name || "",
    kills: num(me.total_kills),
    deaths: num(me.total_deaths),
    assists: num(me.total_assists),
    kd: round(me.kd_ratio, 2),
    adr: round(me.dpr, 1),
    damage: num(me.total_damage),
    mvp: num(me.mvps),
    hsKills: num(me.total_hs_kills),
    rating: round(me.leetify_rating, 3),
    ctRating: round(me.ct_leetify_rating, 3),
    tRating: round(me.t_leetify_rating, 3),
    accuracy: pct01(me.accuracy),
    accuracySpotted: pct01(me.accuracy_enemy_spotted),
    accuracyHead: pct01(me.accuracy_head),
    sprayAccuracy: pct01(me.spray_accuracy),
    preaim: round(me.preaim, 2),
    reactionMs: reaction == null ? null : round(reaction <= 10 ? reaction * 1000 : reaction, 0),
    flashes: num(me.flashbang_thrown),
    flashFoe: num(me.flashbang_hit_foe),
    flashKill: num(me.flashbang_leading_to_kill),
    flashAssist: num(me.flash_assist),
    he: num(me.he_thrown),
    molly: num(me.molotov_thrown),
    smoke: num(me.smoke_thrown),
    multi1: num(me.multi1k),
    multi2: num(me.multi2k),
    multi3: num(me.multi3k),
    multi4: num(me.multi4k),
    multi5: num(me.multi5k),
    survived: pct01(me.rounds_survived_percentage),
    rounds: num(me.rounds_count),
    won: num(me.rounds_won),
    lost: num(me.rounds_lost),
    tradeOpps: num(me.trade_kill_opportunities),
    tradeOk: pct01(me.trade_kills_success_percentage),
    tradedOk: pct01(me.traded_deaths_success_percentage)
  };
}

function mergeMatches(profileRows, detailRows, steamId) {
  const byId = Object.fromEntries((profileRows || []).map((m) => [m.id, m]));
  const details = (detailRows || []).map((m) => mapMatchDetails(m, steamId));
  if (!details.length) return (profileRows || []).slice(0, RECENT_MATCHES);
  return details.slice(0, RECENT_MATCHES).map((row) => {
    const prev = byId[row.id] || {};
    return {
      ...prev,
      ...row,
      outcome: prev.outcome || row.outcome || "",
      rank: row.rank ?? prev.rank,
      score: (row.score && row.score.length) ? row.score : prev.score
    };
  });
}

function mapProfile(raw, detailMatches = []) {
  const ranks = raw.ranks || {};
  const rating = raw.rating || {};
  const stats = raw.stats || {};
  const steam64Id = raw.steam64_id || "";

  const metrics = {};
  for (const m of METRICS) metrics[m.key] = round(stats[m.from], m.digits);

  return {
    name: raw.name || "",
    steam64Id,
    leetifyId: raw.id || "",
    privacy: raw.privacy_mode || "",
    firstMatch: raw.first_match_date || null,
    matches: num(raw.total_matches),
    winrate: round(raw.winrate, 4),
    bans: mapBans(raw.bans),

    ranks: {
      leetify: round(ranks.leetify, 2),
      premier: num(ranks.premier),
      wingman: num(ranks.wingman),
      renown: num(ranks.renown),
      faceit: num(ranks.faceit),
      faceitElo: num(ranks.faceit_elo),
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

    matchesRecent: mergeMatches(
      (raw.recent_matches || []).map(mapRecentMatch),
      detailMatches,
      steam64Id
    ),

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

function leetifyHeaders() {
  const headers = { Accept: "application/json" };
  if (process.env.LEETIFY_API_KEY) {
    headers.Authorization = `Bearer ${process.env.LEETIFY_API_KEY}`;
  }
  return headers;
}

async function leetifyGet(path) {
  const res = await fetch(`${BASE}${path}`, { headers: leetifyHeaders() });
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
  try {
    return JSON.parse(text);
  } catch {
    const err = new Error("Leetify não devolveu JSON");
    err.status = 502;
    throw err;
  }
}

async function fetchLeetifyMatches(steamId, limit = RECENT_MATCHES) {
  const id = String(steamId || "").trim();
  const raw = await leetifyGet(`/v3/profile/matches?steam64_id=${encodeURIComponent(id)}&limit=${limit}`);
  return Array.isArray(raw) ? raw : (raw && raw.matches) || [];
}

async function fetchLeetifyProfile(steamId) {
  const id = String(steamId || "").trim();
  if (!/^\d{17}$/.test(id)) {
    const err = new Error("SteamID64 inválido");
    err.status = 400;
    throw err;
  }
  const [raw, detailMatches] = await Promise.all([
    leetifyGet(`/v3/profile?steam64_id=${encodeURIComponent(id)}`),
    fetchLeetifyMatches(id).catch(() => [])
  ]);
  if (raw.privacy_mode && raw.privacy_mode !== "public") {
    const err = new Error("Perfil da Leetify está privado");
    err.status = 403;
    throw err;
  }
  return { ...mapProfile(raw, detailMatches), syncedAt: new Date().toISOString() };
}

module.exports = { BASE, METRICS, mapProfile, summarize, fetchLeetifyProfile };

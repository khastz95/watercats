const crypto = require("crypto");
const { summarize } = require("./leetify");
const { clipUrl, embedUrl } = require("./allstar");

function configured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function pinOk(pin) {
  const expected = String(process.env.EDIT_PIN || "");
  if (!expected || pin == null || pin === "") return false;
  const a = Buffer.from(String(pin));
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function secret() {
  return String(process.env.EDIT_PIN || process.env.SUPABASE_SERVICE_ROLE_KEY || "watercats");
}

function signToken() {
  const exp = String(Date.now() + 12 * 60 * 60 * 1000);
  const sig = crypto.createHmac("sha256", secret()).update(exp).digest("hex");
  return Buffer.from(`${exp}.${sig}`).toString("base64url");
}

function tokenOk(token) {
  try {
    const raw = Buffer.from(String(token || ""), "base64url").toString("utf8");
    const [exp, sig] = raw.split(".");
    if (!exp || !sig || Date.now() > Number(exp)) return false;
    const expected = crypto.createHmac("sha256", secret()).update(exp).digest("hex");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function adminOk(req, body = {}) {
  const headerToken = req.headers["x-admin-token"] || "";
  const pin = req.headers["x-edit-pin"] || body.pin || "";
  return tokenOk(headerToken) || pinOk(pin);
}

async function rest(path, options = {}) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    const err = new Error("Supabase não configurado");
    err.status = 500;
    throw err;
  }
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers || {})
    }
  });
  if (!res.ok) {
    const text = await res.text();
    const err = new Error(text || "Erro no Supabase");
    err.status = res.status;
    throw err;
  }
  const body = await res.text();
  return body ? JSON.parse(body) : null;
}

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

function parseAllstar(url) {
  const s = String(url || "").trim();
  if (!s) {
    const err = new Error("Cole o link da allstar.gg");
    err.status = 400;
    throw err;
  }
  let clipId = "";
  try {
    const u = new URL(s);
    const host = u.hostname.replace(/^www\./i, "").toLowerCase();
    if (host !== "allstar.gg") {
      const err = new Error("Use um link da allstar.gg");
      err.status = 400;
      throw err;
    }
    clipId = u.searchParams.get("clip") || "";
    if (!clipId) {
      const parts = u.pathname.split("/").filter(Boolean);
      const i = parts.findIndex((p) => /^(clip|c|iframe)$/i.test(p));
      if (i >= 0 && parts[i + 1]) clipId = parts[i + 1];
      else if (parts.length === 1) clipId = parts[0];
    }
  } catch (e) {
    if (e.status) throw e;
    const err = new Error("Link inválido");
    err.status = 400;
    throw err;
  }
  clipId = String(clipId).replace(/[^A-Za-z0-9_-]/g, "");
  if (!clipId) {
    const err = new Error("Não achei o ID do clipe");
    err.status = 400;
    throw err;
  }
  return { url: clipUrl(clipId), clipId, embed: embedUrl(clipId) };
}

function num(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function mapStats(row) {
  if (!row) {
    return {
      rating: null, kd: null, adr: null, hsPercent: null,
      mapsPlayed: null, wins: null, losses: null,
      kills: null, deaths: null, assists: null,
      firstKills: null, clutches: null, mvp: null
    };
  }
  return {
    rating: num(row.rating),
    kd: num(row.kd),
    adr: num(row.adr),
    hsPercent: num(row.hs_percent),
    mapsPlayed: num(row.maps_played),
    wins: num(row.wins),
    losses: num(row.losses),
    kills: num(row.kills),
    deaths: num(row.deaths),
    assists: num(row.assists),
    firstKills: num(row.first_kills),
    clutches: num(row.clutches),
    mvp: num(row.mvp)
  };
}

function mapLeetify(stats) {
  const saved = stats && stats.extra && stats.extra.leetify;
  return saved || null;
}

// `full` só na ficha do jogador — nas listagens o perfil inteiro (com as
// últimas partidas) deixaria a resposta pesada demais.
function mapPlayer(row, stats, full = false) {
  const leetify = mapLeetify(stats);
  return {
    id: row.id,
    name: row.name,
    realName: row.real_name || "",
    role: row.role || "",
    country: row.country || "",
    city: row.city || "",
    photo: row.photo_url || "",
    color: row.color || "#006BFF",
    steamId: row.steam_id || "",
    steamUrl: row.steam_url || "",
    steamAvatar: row.steam_avatar || "",
    allstarUser: row.allstar_user || "",
    allstarUsername: row.allstar_username || "",
    faceitUrl: row.faceit_url || "",
    faceitNick: row.faceit_nick || "",
    faceitElo: num(row.faceit_elo),
    discord: row.discord || "",
    twitchUrl: row.twitch_url || "",
    bio: row.bio || "",
    status: row.status || "active",
    startedPlaying: num(row.started_playing),
    joinedAt: row.joined_at || null,
    sortOrder: num(row.sort_order) || 0,
    stats: mapStats(stats),
    leetify: full ? leetify : summarize(leetify)
  };
}

function mapClip(row, playerName = "") {
  return {
    id: row.id,
    playerId: row.player_id,
    playerName,
    title: row.title,
    url: row.allstar_url,
    clipId: row.clip_id,
    embed: embedUrl(row.clip_id),
    thumb: row.thumb_url || "",
    map: row.map || "",
    weapon: row.weapon || "",
    kills: num(row.kills),
    views: num(row.views),
    duration: num(row.duration),
    source: row.source || "manual",
    featured: Boolean(row.featured),
    clippedAt: row.clipped_at || null,
    createdAt: row.created_at
  };
}

async function listPlayers() {
  const players = await rest("players?select=*&order=sort_order.asc,name.asc");
  const stats = await rest("player_stats?select=*");
  const byId = Object.fromEntries((stats || []).map((s) => [s.player_id, s]));
  return (players || []).map((p) => mapPlayer(p, byId[p.id]));
}

async function getPlayer(id) {
  const rows = await rest(`players?id=eq.${encodeURIComponent(id)}&select=*`);
  const player = Array.isArray(rows) ? rows[0] : null;
  if (!player) return null;
  const stats = await rest(`player_stats?player_id=eq.${encodeURIComponent(id)}&select=*`);
  const clips = await rest(`clips?player_id=eq.${encodeURIComponent(id)}&select=*&order=clipped_at.desc.nullslast,created_at.desc`);
  return {
    ...mapPlayer(player, Array.isArray(stats) ? stats[0] : null, true),
    clips: (clips || []).map((c) => mapClip(c, player.name))
  };
}

function playerPayload(body) {
  const name = String(body.name || "").trim();
  if (!name) {
    const err = new Error("Nome obrigatório");
    err.status = 400;
    throw err;
  }
  const id = slugify(body.id || name);
  if (!id) {
    const err = new Error("ID inválido");
    err.status = 400;
    throw err;
  }
  return {
    id,
    name,
    real_name: String(body.realName || "").trim(),
    role: String(body.role || "").trim(),
    country: String(body.country || "").trim(),
    city: String(body.city || "").trim(),
    color: String(body.color || "#006BFF").trim() || "#006BFF",
    steam_id: String(body.steamId || "").trim(),
    steam_url: String(body.steamUrl || "").trim(),
    faceit_url: String(body.faceitUrl || "").trim(),
    faceit_nick: String(body.faceitNick || "").trim(),
    faceit_elo: num(body.faceitElo),
    discord: String(body.discord || "").trim(),
    twitch_url: String(body.twitchUrl || "").trim(),
    bio: String(body.bio || "").trim(),
    status: ["active", "inactive", "alumni"].includes(body.status) ? body.status : "active",
    started_playing: num(body.startedPlaying),
    joined_at: body.joinedAt || null,
    sort_order: num(body.sortOrder) ?? 0,
    updated_at: new Date().toISOString()
  };
}

async function upsertPlayer(body) {
  const payload = playerPayload(body);
  const rows = await rest("players?on_conflict=id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(payload)
  });
  await rest("player_stats?on_conflict=player_id", {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify({ player_id: payload.id })
  });
  const row = Array.isArray(rows) ? rows[0] : rows;
  return getPlayer(row.id);
}

async function deletePlayer(id) {
  await rest(`players?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
}

async function upsertStats(playerId, body) {
  const payload = {
    player_id: playerId,
    rating: num(body.rating),
    kd: num(body.kd),
    adr: num(body.adr),
    hs_percent: num(body.hsPercent),
    maps_played: num(body.mapsPlayed),
    wins: num(body.wins),
    losses: num(body.losses),
    kills: num(body.kills),
    deaths: num(body.deaths),
    assists: num(body.assists),
    first_kills: num(body.firstKills),
    clutches: num(body.clutches),
    mvp: num(body.mvp),
    updated_at: new Date().toISOString()
  };
  const rows = await rest("player_stats?on_conflict=player_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(payload)
  });
  return mapStats(Array.isArray(rows) ? rows[0] : rows);
}

// Guarda o perfil da Leetify em player_stats.extra.leetify, sem tocar nos
// números que o painel preencheu à mão.
async function saveLeetify(playerId, payload) {
  const rows = await rest(`player_stats?player_id=eq.${encodeURIComponent(playerId)}&select=extra`);
  const current = (Array.isArray(rows) ? rows[0] : rows) || {};
  const extra = { ...(current.extra || {}), leetify: payload };
  await rest("player_stats?on_conflict=player_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ player_id: playerId, extra, updated_at: new Date().toISOString() })
  });
  return payload;
}

// O avatar da Steam fica em coluna própria para a foto enviada pelo painel
// continuar tendo prioridade sobre ele.
async function saveSteamAvatar(playerId, avatar) {
  await rest(`players?id=eq.${encodeURIComponent(playerId)}`, {
    method: "PATCH",
    body: JSON.stringify({ steam_avatar: avatar, updated_at: new Date().toISOString() })
  });
  return avatar;
}

async function listClips() {
  const clips = await rest("clips?select=*&order=clipped_at.desc.nullslast,created_at.desc");
  const players = await rest("players?select=id,name");
  const names = Object.fromEntries((players || []).map((p) => [p.id, p.name]));
  return (clips || []).map((c) => mapClip(c, names[c.player_id] || ""));
}

async function upsertClip(body) {
  const parsed = parseAllstar(body.url || body.allstarUrl);
  const title = String(body.title || "").trim();
  if (!title) {
    const err = new Error("Título obrigatório");
    err.status = 400;
    throw err;
  }
  const payload = {
    player_id: body.playerId || null,
    title,
    allstar_url: parsed.url,
    clip_id: parsed.clipId,
    map: String(body.map || "").trim(),
    featured: Boolean(body.featured)
  };
  if (body.id) {
    const rows = await rest(`clips?id=eq.${encodeURIComponent(body.id)}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
    const row = Array.isArray(rows) ? rows[0] : rows;
    return mapClip(row);
  }
  const rows = await rest("clips?on_conflict=clip_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({ ...payload, source: "manual" })
  });
  return mapClip(Array.isArray(rows) ? rows[0] : rows);
}

async function saveAllstarAccount(playerId, userId, username) {
  await rest(`players?id=eq.${encodeURIComponent(playerId)}`, {
    method: "PATCH",
    body: JSON.stringify({
      allstar_user: userId || "",
      allstar_username: username || "",
      updated_at: new Date().toISOString()
    })
  });
}

// Grava os clipes da sincronização pelo clip_id. Não apaga o que já estava
// no banco: destaque e origem manuais continuam como o painel deixou.
async function importAllstarClips(playerId, clips) {
  const existing = await rest(
    `clips?player_id=eq.${encodeURIComponent(playerId)}&select=clip_id,featured,source`
  );
  const byId = Object.fromEntries((existing || []).map((row) => [row.clip_id, row]));
  const payloads = (clips || []).filter((c) => c && c.clipId).map((c) => {
    const prev = byId[c.clipId] || {};
    return {
      player_id: playerId,
      title: c.title,
      allstar_url: c.url || clipUrl(c.clipId),
      clip_id: c.clipId,
      map: c.map || "",
      weapon: c.weapon || "",
      kills: num(c.kills),
      views: num(c.views),
      duration: num(c.duration),
      thumb_url: c.thumb || "",
      clipped_at: c.createdAt || null,
      featured: Boolean(prev.featured),
      source: prev.source || "allstar"
    };
  });

  const chunk = 50;
  let upserted = 0;
  for (let i = 0; i < payloads.length; i += chunk) {
    const slice = payloads.slice(i, i + chunk);
    await rest("clips?on_conflict=clip_id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(slice)
    });
    upserted += slice.length;
  }
  return { upserted };
}

async function deleteClip(id) {
  await rest(`clips?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
}

async function uploadPlayerPhoto(playerId, buffer, contentType) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const path = `player-photos/${playerId}`;
  const res = await fetch(`${url}/storage/v1/object/${path}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": contentType,
      "x-upsert": "true"
    },
    body: buffer
  });
  if (!res.ok) {
    const text = await res.text();
    const err = new Error(text || "Falha no upload da foto");
    err.status = res.status;
    throw err;
  }
  const publicUrl = `${url}/storage/v1/object/public/${path}?v=${Date.now()}`;
  await rest(`players?id=eq.${encodeURIComponent(playerId)}`, {
    method: "PATCH",
    body: JSON.stringify({ photo_url: publicUrl, updated_at: new Date().toISOString() })
  });
  return publicUrl;
}

module.exports = {
  configured,
  pinOk,
  signToken,
  tokenOk,
  adminOk,
  slugify,
  listPlayers,
  getPlayer,
  upsertPlayer,
  deletePlayer,
  upsertStats,
  saveLeetify,
  saveSteamAvatar,
  saveAllstarAccount,
  importAllstarClips,
  listClips,
  upsertClip,
  deleteClip,
  uploadPlayerPhoto
};

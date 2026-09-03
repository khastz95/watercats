// Clipes da allstar.gg pela API GraphQL que o próprio site usa (a1.allstar.gg).
//
// A API de parceiro (developer.allstar.gg) é a via oficial, mas ela serve para
// *criar* clipe a partir de demo e exige aprovação de conta. Para só listar o
// que o jogador já tem, o caminho é este — o mesmo que o yt-dlp usa.
//
// Não precisa de chave. Dois passos, porque o clipe é indexado pelo id interno
// do allstar e não pelo SteamID64:
//   1. playerSearch(gameIdentifier: <steamId64>, game: CS) → id do usuário
//   2. clipsNew(filters: { users: [<id>] })                → clipes paginados

const API = "https://a1.allstar.gg/graphql";

// Página do clipe e player embutido. É o formato que o painel já aceitava
// quando o link era colado à mão.
function clipUrl(clipId) {
  return `https://allstar.gg/clip?clip=${clipId}`;
}

function embedUrl(clipId) {
  return `https://allstar.gg/iframe?clip=${clipId}`;
}

async function gql(query, variables) {
  const res = await fetch(API, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables })
  });
  if (!res.ok) {
    const err = new Error(`allstar.gg respondeu ${res.status}`);
    err.status = 502;
    throw err;
  }
  const json = await res.json();
  if (json.errors) {
    const err = new Error(json.errors.map((e) => e.message).join("; "));
    err.status = 502;
    throw err;
  }
  return json.data || {};
}

const SEARCH = `query ($id: String!) {
  playerSearch(gameIdentifier: $id, game: CS) {
    success
    user { _id username }
  }
}`;

const CLIPS = `query ($users: [String!]!, $first: Int!, $after: String) {
  clipsNew(filters: { users: $users, game: CS2 }, sort: LATEST, first: $first, after: $after) {
    pageInfo { hasNextPage endCursor }
    nodes {
      clipId
      title
      views
      duration
      createdAt
      username
      thumbnailUrl(style: STANDARD)
      tags { key value }
    }
  }
}`;

// O SteamID64 vira o id interno do allstar. Devolve null quando o jogador
// nunca criou conta lá, que não é erro — só não tem clipe.
async function resolveAllstarUser(steamId) {
  const id = String(steamId || "").trim();
  if (!/^\d{17}$/.test(id)) {
    const err = new Error("SteamID64 inválido");
    err.status = 400;
    throw err;
  }
  const data = await gql(SEARCH, { id });
  const user = data.playerSearch && data.playerSearch.user;
  if (!user || !user._id) return null;
  return { userId: user._id, username: user.username || "" };
}

function tag(tags, key) {
  const hit = (tags || []).find((t) => t.key === key);
  return hit ? String(hit.value || "").trim() : "";
}

function int(value) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

// As tags trazem mapa, arma e abates prontos — melhor que adivinhar pelo título.
function mapClip(node) {
  const tags = node.tags || [];
  return {
    clipId: node.clipId,
    title: String(node.title || "").trim() || "Clipe sem título",
    url: clipUrl(node.clipId),
    embed: embedUrl(node.clipId),
    thumb: node.thumbnailUrl || "",
    map: tag(tags, "CS_Map"),
    weapon: tag(tags, "CS_Weapons"),
    kills: int(tag(tags, "CS_Kill Count")),
    views: int(node.views) ?? 0,
    duration: Number.isFinite(Number(node.duration)) ? Number(Number(node.duration).toFixed(2)) : null,
    createdAt: node.createdAt || null,
    username: node.username || ""
  };
}

// Paginação Relay. `limit` existe para a sincronização não virar refém de uma
// conta com milhares de clipes.
async function fetchAllstarClips(userId, { limit = 300, pageSize = 50 } = {}) {
  const clips = [];
  const seen = new Set();
  let after = null;

  while (clips.length < limit) {
    const data = await gql(CLIPS, {
      users: [userId],
      first: Math.min(pageSize, limit - clips.length),
      after
    });
    const page = data.clipsNew || {};
    for (const node of page.nodes || []) {
      if (!node || !node.clipId || seen.has(node.clipId)) continue;
      seen.add(node.clipId);
      clips.push(mapClip(node));
    }
    const info = page.pageInfo || {};
    if (!info.hasNextPage || !info.endCursor) break;
    after = info.endCursor;
  }

  return clips;
}

module.exports = { resolveAllstarUser, fetchAllstarClips, clipUrl, embedUrl };

/** Allstar.gg GraphQL client (same path as the club site). */

const API = "https://a1.allstar.gg/graphql";

export function clipUrl(clipId: string): string {
  return `https://allstar.gg/clip?clip=${clipId}`;
}

export function embedUrl(clipId: string): string {
  return `https://allstar.gg/iframe?clip=${clipId}`;
}

async function gql(query: string, variables: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch(API, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    throw new Error(`allstar.gg respondeu ${res.status}`);
  }
  const json = (await res.json()) as { data?: Record<string, unknown>; errors?: { message: string }[] };
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join("; "));
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

export type AllstarUser = { userId: string; username: string };

export type AllstarClip = {
  clipId: string;
  title: string;
  url: string;
  embed: string;
  thumb: string;
  map: string;
  weapon: string;
  kills: number | null;
  views: number;
  duration: number | null;
  createdAt: string | null;
  username: string;
};

type Tag = { key?: string; value?: string };

function tagValue(tags: Tag[], key: string): string {
  const hit = tags.find((t) => t.key === key);
  return hit ? String(hit.value || "").trim() : "";
}

function intOrNull(value: string): number | null {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

function mapClip(node: Record<string, unknown>): AllstarClip {
  const tags = (node.tags as Tag[]) || [];
  const clipId = String(node.clipId || "");
  return {
    clipId,
    title: String(node.title || "").trim() || "Clipe sem título",
    url: clipUrl(clipId),
    embed: embedUrl(clipId),
    thumb: String(node.thumbnailUrl || ""),
    map: tagValue(tags, "CS_Map"),
    weapon: tagValue(tags, "CS_Weapons"),
    kills: intOrNull(tagValue(tags, "CS_Kill Count")),
    views: intOrNull(String(node.views ?? "")) ?? 0,
    duration: Number.isFinite(Number(node.duration)) ? Number(Number(node.duration).toFixed(2)) : null,
    createdAt: node.createdAt ? String(node.createdAt) : null,
    username: String(node.username || ""),
  };
}

export async function resolveAllstarUser(steamId: string): Promise<AllstarUser | null> {
  const id = String(steamId || "").trim();
  if (!/^\d{17}$/.test(id)) throw new Error("SteamID64 inválido");
  const data = await gql(SEARCH, { id });
  const search = data.playerSearch as { user?: { _id?: string; username?: string } } | undefined;
  const user = search?.user;
  if (!user?._id) return null;
  return { userId: user._id, username: user.username || "" };
}

export async function fetchAllstarClips(
  userId: string,
  { limit = 20, pageSize = 20 }: { limit?: number; pageSize?: number } = {}
): Promise<AllstarClip[]> {
  const clips: AllstarClip[] = [];
  const seen = new Set<string>();
  let after: string | null = null;

  while (clips.length < limit) {
    const data = await gql(CLIPS, {
      users: [userId],
      first: Math.min(pageSize, limit - clips.length),
      after,
    });
    const page = (data.clipsNew || {}) as {
      pageInfo?: { hasNextPage?: boolean; endCursor?: string };
      nodes?: Record<string, unknown>[];
    };
    for (const node of page.nodes || []) {
      if (!node?.clipId || seen.has(String(node.clipId))) continue;
      seen.add(String(node.clipId));
      clips.push(mapClip(node));
    }
    const info = page.pageInfo || {};
    if (!info.hasNextPage || !info.endCursor) break;
    after = info.endCursor;
  }

  return clips;
}

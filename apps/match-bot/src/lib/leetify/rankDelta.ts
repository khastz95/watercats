import type { LeetifyProfileResponse, LeetifyRecentMatch } from "./types";

export type RankUnit = "rating" | "elo" | "level";

export type RankLane = "premier" | "faceit" | "gamersclub" | "other";

export interface PlayerRankDelta {
  lane: RankLane;
  unit: RankUnit;
  /** Rank / Elo / level after this match. */
  value: number | null;
  /** Change vs previous comparable match on the same lane. */
  delta: number | null;
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function sourceLane(dataSource: string | null | undefined): RankLane {
  const s = String(dataSource || "").toLowerCase();
  if (s.includes("faceit")) return "faceit";
  if (s.includes("gamersclub") || s.includes("gamers_club") || s === "gc" || s.includes("gc_")) {
    return "gamersclub";
  }
  if (
    s.includes("premier") ||
    s.includes("matchmaking") ||
    s.includes("valve") ||
    s.includes("competitive")
  ) {
    return "premier";
  }
  return "other";
}

function rankTypeNum(m: LeetifyRecentMatch): number | null {
  return num(m.rank_type as unknown);
}

/** Premier CS Rating vs Competitive stars / Wingman-style ranks. */
function isPremierRatingMatch(m: LeetifyRecentMatch): boolean {
  if (sourceLane(m.data_source) !== "premier") return false;
  const rt = rankTypeNum(m);
  if (rt === 12) return false;
  const rank = num(m.rank);
  if (rt === 11) return true;
  return rank !== null && rank >= 1000;
}

function matchLane(m: LeetifyRecentMatch): RankLane {
  const lane = sourceLane(m.data_source);
  if (lane === "premier" && !isPremierRatingMatch(m)) return "other";
  return lane;
}

function usableRank(m: LeetifyRecentMatch, lane: RankLane): number | null {
  const rank = num(m.rank);
  if (rank === null || rank <= 0) return null;
  if (lane === "premier") return rank >= 1000 ? rank : null;
  // Faceit level 1–10, GC level 1–20
  if (lane === "faceit") return rank >= 1 && rank <= 10 ? rank : null;
  if (lane === "gamersclub") return rank >= 1 && rank <= 20 ? rank : null;
  return rank;
}

function sortedRecent(profile: LeetifyProfileResponse): LeetifyRecentMatch[] {
  return [...(profile.recent_matches || [])].sort(
    (a, b) => Date.parse(b.finished_at || "") - Date.parse(a.finished_at || "")
  );
}

/**
 * Derive post-match rank + delta for one player from their Leetify profile.
 * Premier uses CS Rating from consecutive `rank_type=11` matches.
 * Faceit/GC expose level on recent matches; Faceit Elo only exists on the
 * current profile snapshot (attached when this is the latest Faceit match).
 */
export function computePlayerRankDelta(
  profile: LeetifyProfileResponse | null | undefined,
  matchId: string,
  matchDataSource?: string
): PlayerRankDelta | null {
  if (!profile) return null;
  const recent = sortedRecent(profile);
  if (!recent.length) return null;

  let idx = recent.findIndex((m) => m.id === matchId);
  if (idx < 0 && matchDataSource) {
    // Fallback: newest match on the same platform lane
    const want = sourceLane(matchDataSource);
    idx = recent.findIndex((m) => matchLane(m) === want || sourceLane(m.data_source) === want);
  }
  if (idx < 0) return null;

  const current = recent[idx];
  const lane = matchLane(current);
  if (lane === "other") {
    // Still try source lane for faceit/gc when rank_type filtering dropped premier
    const rawLane = sourceLane(current.data_source);
    if (rawLane === "other") return null;
  }

  const effectiveLane: RankLane =
    lane === "other" ? sourceLane(current.data_source) : lane;

  if (effectiveLane === "faceit") {
    // Pontuação Faceit = Elo (pontos), nunca level 1–10.
    const elo = num(profile.ranks?.faceit_elo);
    if (elo !== null && elo > 0) {
      return {
        lane: "faceit",
        unit: "elo",
        value: elo,
        // Leetify não expõe histórico de Elo por partida.
        delta: null,
      };
    }
    return null;
  }

  if (effectiveLane === "gamersclub") {
    const level = usableRank(current, "gamersclub");
    if (level === null) return null;
    const prev = recent
      .slice(idx + 1)
      .find((m) => matchLane(m) === "gamersclub" && usableRank(m, "gamersclub") !== null);
    const prevLevel = prev ? usableRank(prev, "gamersclub") : null;
    return {
      lane: "gamersclub",
      unit: "level",
      value: level,
      delta: level !== null && prevLevel !== null ? level - prevLevel : null,
    };
  }

  if (effectiveLane === "premier") {
    const rating = usableRank(current, "premier");
    if (rating === null) return null;
    const prev = recent
      .slice(idx + 1)
      .find((m) => matchLane(m) === "premier" && usableRank(m, "premier") !== null);
    const prevRating = prev ? usableRank(prev, "premier") : null;
    return {
      lane: "premier",
      unit: "rating",
      value: rating,
      delta: prevRating !== null ? rating - prevRating : null,
    };
  }

  return null;
}

export function formatRankDelta(d: PlayerRankDelta | null | undefined): {
  primary: string;
  delta: string | null;
  deltaColor: string;
} | null {
  if (!d || d.value === null) return null;

  let primary: string;
  if (d.unit === "rating") {
    primary = d.value.toLocaleString("pt-BR");
  } else if (d.unit === "elo") {
    primary = `${d.value.toLocaleString("pt-BR")} pts`;
  } else if (d.lane === "gamersclub") {
    primary = `GC ${d.value}`;
  } else {
    primary = `Lvl ${d.value}`;
  }

  if (d.delta === null || d.delta === 0) {
    return { primary, delta: null, deltaColor: "#9ca3af" };
  }

  const sign = d.delta > 0 ? "+" : "";
  const deltaText =
    d.unit === "level" || (d.unit === "elo" && Math.abs(d.delta) <= 10)
      ? `${sign}${d.delta}`
      : `${sign}${d.delta.toLocaleString("pt-BR")}`;
  const deltaColor = d.delta > 0 ? "#34d399" : "#f87171";
  return { primary, delta: deltaText, deltaColor };
}

import sharp from "sharp";
import type { MatchPlayerRow, MatchReport } from "@/lib/leetify/mapper";
import { formatRankDelta, type PlayerRankDelta } from "@/lib/leetify/rankDelta";
import {
  SCOREBOARD_SANS_BOLD_B64,
  SCOREBOARD_SANS_REGULAR_B64,
} from "@/lib/discord/scoreboardFonts";

const W = 1100;
const HEADER_H = 88;
const COL_HEADER_H = 36;
const ROW_H = 44;
const TEAM_HEADER_H = 40;
const PAD = 24;
const FOOTER_H = 36;
const FONT_FAMILY = "ScoreboardSans";

/**
 * Liberation Sans is bundled as base64 (see scoreboardFonts.ts). Vercel/Linux
 * has no system fonts for sharp's SVG renderer — missing faces = tofu boxes.
 */
const FONT_FACE_CSS = [
  `@font-face{font-family:'${FONT_FAMILY}';src:url('data:font/ttf;base64,${SCOREBOARD_SANS_REGULAR_B64}') format('truetype');font-weight:400;font-style:normal;}`,
  `@font-face{font-family:'${FONT_FAMILY}';src:url('data:font/ttf;base64,${SCOREBOARD_SANS_BOLD_B64}') format('truetype');font-weight:700;font-style:normal;}`,
].join("");

function fontFaceCss(): string {
  return FONT_FACE_CSS;
}

function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function mapLabel(mapName: string): string {
  return (mapName || "unknown").replace(/^de_/, "").toUpperCase();
}

/** Pretty label for Leetify data_source on the scoreboard. */
export function sourceLabel(dataSource: string): string {
  const s = (dataSource || "").toLowerCase();
  if (!s) return "matchmaking";
  if (s.includes("faceit")) return "FACEIT";
  if (s.includes("gamersclub") || s === "gc" || s.includes("gc_")) return "GAMERSCLUB";
  if (s.includes("premier")) return "PREMIER";
  if (s.includes("matchmaking") || s.includes("valve")) return "MATCHMAKING";
  return dataSource.toUpperCase();
}

function fmt(n: number | null | undefined, digits = 0): string {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "-";
  if (digits === 0) return String(Math.round(Number(n)));
  return Number(n).toFixed(digits);
}

function fmtSigned(n: number | null | undefined, digits = 2): string {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "-";
  const v = Number(n);
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(digits)}`;
}

function kdColor(kd: number | null): string {
  if (kd === null) return "#9ca3af";
  return kd >= 1 ? "#34d399" : "#f87171";
}

function ratingColor(r: number | null): string {
  if (r === null) return "#9ca3af";
  return r >= 0 ? "#34d399" : "#f87171";
}

function teamScore(report: MatchReport, team: number): number {
  return report.teamScores.find((t) => t.teamNumber === team)?.score ?? 0;
}

/** Prefer team that contains WaterCats players. */
export function resolveFocusTeam(report: MatchReport, watercatsSteamIds: string[]): number {
  const wc = new Set(watercatsSteamIds);
  const counts = new Map<number, number>();
  for (const p of report.players) {
    if (!wc.has(p.steamId)) continue;
    counts.set(p.teamNumber, (counts.get(p.teamNumber) || 0) + 1);
  }
  if (counts.size) {
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }
  const teams = [...new Set(report.players.map((p) => p.teamNumber))].filter(Boolean).sort();
  return teams[0] ?? 0;
}

function sortedTeam(players: MatchPlayerRow[]): MatchPlayerRow[] {
  return [...players].sort((a, b) => (b.kills ?? 0) - (a.kills ?? 0));
}

const COLS = [
  { x: 66, align: "start" as const, label: "PLAYER" },
  { x: 300, align: "end" as const, label: "K" },
  { x: 348, align: "end" as const, label: "A" },
  { x: 396, align: "end" as const, label: "D" },
  { x: 470, align: "end" as const, label: "K/D" },
  { x: 545, align: "end" as const, label: "ADR" },
  { x: 625, align: "end" as const, label: "SURV%" },
  { x: 690, align: "end" as const, label: "2K" },
  { x: 740, align: "end" as const, label: "3K" },
  { x: 790, align: "end" as const, label: "4K" },
  { x: 840, align: "end" as const, label: "5K" },
  { x: 960, align: "end" as const, label: "LEETIFY" },
  { x: 1040, align: "end" as const, label: "MVP" },
];

function cellText(
  x: number,
  y: number,
  text: string,
  opts: { fill?: string; size?: number; weight?: number; anchor?: string } = {}
): string {
  const fill = opts.fill || "#e5e7eb";
  const size = opts.size || 15;
  // Liberation Sans only ships Regular/Bold — prefer Bold for readability.
  const weight = (opts.weight ?? 700) >= 500 ? 700 : 400;
  const anchor = opts.anchor || "start";
  return `<text x="${x}" y="${y}" fill="${fill}" font-size="${size}" font-weight="${weight}" font-family="${FONT_FAMILY}" text-anchor="${anchor}">${esc(text)}</text>`;
}

function rankSubtitleSvg(
  steamId: string,
  y: number,
  rankBySteam?: Record<string, PlayerRankDelta | null>
): string {
  const formatted = formatRankDelta(rankBySteam?.[steamId]);
  if (!formatted) return "";
  const baseX = PAD + 42;
  let svg = cellText(baseX, y + 34, formatted.primary, {
    size: 12,
    weight: 700,
    fill: "#a5b4fc",
  });
  if (formatted.delta) {
    const approxPrimaryW = Math.min(120, formatted.primary.length * 7);
    svg += cellText(baseX + approxPrimaryW + 6, y + 34, formatted.delta, {
      size: 12,
      weight: 700,
      fill: formatted.deltaColor,
    });
  }
  return svg;
}

function playerRowSvg(
  p: MatchPlayerRow,
  y: number,
  rowIndex: number,
  wc: Set<string>,
  rankBySteam?: Record<string, PlayerRankDelta | null>
): string {
  const bg = rowIndex % 2 === 0 ? "#1a1b23" : "#16171e";
  const isWc = wc.has(p.steamId);
  const rankInfo = formatRankDelta(rankBySteam?.[p.steamId]);
  const showRank = Boolean(isWc && rankInfo);
  const name = (p.name || p.steamId || "Player").slice(0, 18);
  const kd = p.kdRatio;
  const leet = p.leetifyRating;
  const survRaw = p.roundsSurvivedPercentage;
  const surv =
    survRaw === null || survRaw === undefined
      ? null
      : survRaw <= 1
        ? survRaw * 100
        : survRaw;
  const nameY = showRank ? y + 18 : y + ROW_H / 2 + 5;

  return `
    <rect x="${PAD}" y="${y}" width="${W - PAD * 2}" height="${ROW_H}" fill="${bg}"/>
    ${isWc ? `<rect x="${PAD}" y="${y}" width="4" height="${ROW_H}" fill="#a855f7"/>` : ""}
    <circle cx="${PAD + 22}" cy="${y + ROW_H / 2}" r="12" fill="${isWc ? "#7c3aed" : "#374151"}"/>
    ${cellText(PAD + 22, y + ROW_H / 2 + 4, (name[0] || "?").toUpperCase(), { size: 12, weight: 700, anchor: "middle", fill: "#fff" })}
    ${cellText(PAD + 42, nameY, name, { size: 15, weight: 700, fill: isWc ? "#e9d5ff" : "#f3f4f6" })}
    ${showRank ? rankSubtitleSvg(p.steamId, y, rankBySteam) : ""}
    ${cellText(300, y + ROW_H / 2 + 5, fmt(p.kills), { anchor: "end", size: 15, weight: 700 })}
    ${cellText(348, y + ROW_H / 2 + 5, fmt(p.assists), { anchor: "end", size: 15, weight: 700 })}
    ${cellText(396, y + ROW_H / 2 + 5, fmt(p.deaths), { anchor: "end", size: 15, weight: 700 })}
    ${cellText(470, y + ROW_H / 2 + 5, fmt(kd, 2), { anchor: "end", size: 15, weight: 700, fill: kdColor(kd) })}
    ${cellText(545, y + ROW_H / 2 + 5, fmt(p.dpr, 1), { anchor: "end", size: 15, weight: 700 })}
    ${cellText(625, y + ROW_H / 2 + 5, surv === null ? "-" : `${fmt(surv, 0)}%`, { anchor: "end", size: 14, weight: 700, fill: "#9ca3af" })}
    ${cellText(690, y + ROW_H / 2 + 5, fmt(p.multi2k), { anchor: "end", size: 14, weight: 700, fill: "#9ca3af" })}
    ${cellText(740, y + ROW_H / 2 + 5, fmt(p.multi3k), { anchor: "end", size: 14, weight: 700, fill: "#9ca3af" })}
    ${cellText(790, y + ROW_H / 2 + 5, fmt(p.multi4k), { anchor: "end", size: 14, weight: 700, fill: "#9ca3af" })}
    ${cellText(840, y + ROW_H / 2 + 5, fmt(p.multi5k), { anchor: "end", size: 14, weight: 700, fill: "#9ca3af" })}
    ${cellText(960, y + ROW_H / 2 + 5, fmtSigned(leet, 2), { anchor: "end", size: 15, weight: 700, fill: ratingColor(leet) })}
    ${cellText(1040, y + ROW_H / 2 + 5, fmt(p.mvps), { anchor: "end", size: 14, weight: 700, fill: "#9ca3af" })}
  `;
}

function teamBlock(
  title: string,
  win: boolean,
  tied: boolean,
  players: MatchPlayerRow[],
  startY: number,
  wc: Set<string>,
  rankBySteam?: Record<string, PlayerRankDelta | null>
): { svg: string; height: number } {
  const accent = tied ? "#fbbf24" : win ? "#34d399" : "#f87171";
  const badge = tied ? "DRAW" : win ? "WIN" : "LOSS";
  const badgeBg = tied ? "#78350f" : win ? "#065f46" : "#7f1d1d";
  let y = startY;
  let svg = `
    <rect x="${PAD}" y="${y}" width="${W - PAD * 2}" height="${TEAM_HEADER_H}" fill="#12131a"/>
    <rect x="${PAD}" y="${y}" width="4" height="${TEAM_HEADER_H}" fill="${accent}"/>
    ${cellText(PAD + 16, y + 26, title, { size: 16, weight: 700, fill: "#f9fafb" })}
    <rect x="${PAD + 200}" y="${y + 10}" rx="4" width="52" height="22" fill="${badgeBg}"/>
    ${cellText(PAD + 226, y + 26, badge, { size: 12, weight: 700, anchor: "middle", fill: accent })}
  `;
  y += TEAM_HEADER_H;

  svg += `<rect x="${PAD}" y="${y}" width="${W - PAD * 2}" height="${COL_HEADER_H}" fill="#0d0e14"/>`;
  for (const c of COLS) {
    svg += cellText(c.x, y + 24, c.label, {
      size: 12,
      weight: 700,
      anchor: c.align === "end" ? "end" : "start",
      fill: "#9ca3af",
    });
  }
  y += COL_HEADER_H;

  sortedTeam(players).forEach((p, i) => {
    svg += playerRowSvg(p, y, i, wc, rankBySteam);
    y += ROW_H;
  });

  return { svg, height: y - startY };
}

export async function renderMatchScoreboardPng(
  report: MatchReport,
  options?: {
    watercatsSteamIds?: string[];
    rankBySteam?: Record<string, PlayerRankDelta | null>;
  }
): Promise<Buffer> {
  const wcIds = options?.watercatsSteamIds || [];
  const rankBySteam = options?.rankBySteam;
  const wc = new Set(wcIds);
  const focus = resolveFocusTeam(report, wcIds);
  const teams = [...new Set(report.players.map((p) => p.teamNumber).filter(Boolean))].sort(
    (a, b) => a - b
  );
  const otherTeam = teams.find((t) => t !== focus) ?? teams[0] ?? focus;
  const focusScore = teamScore(report, focus);
  const otherScore = teamScore(report, otherTeam);
  const tied = focusScore === otherScore;
  const won = focusScore > otherScore;

  const focusPlayers = report.players.filter((p) => p.teamNumber === focus);
  const otherPlayers = report.players.filter((p) => p.teamNumber === otherTeam);

  const resultLabel = tied ? "DRAW" : won ? "VICTORY" : "DEFEAT";
  const resultColor = tied ? "#fbbf24" : won ? "#34d399" : "#f87171";
  const scoreLine = `${focusScore}:${otherScore}`;
  const finished = report.finishedAt
    ? report.finishedAt.replace("T", " ").replace(/\.\d+Z?$/, "").slice(0, 16)
    : "-";

  let y = HEADER_H + 8;
  const ours = teamBlock("TIME DA CASA", won, tied, focusPlayers, y, wc, rankBySteam);
  y += ours.height + 12;
  const enemy = teamBlock("TIME ADVERSARIO", !won && !tied, tied, otherPlayers, y, wc);
  y += enemy.height + 8;
  const height = y + FOOTER_H;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${height}" viewBox="0 0 ${W} ${height}">
  <defs>
    <style type="text/css"><![CDATA[${fontFaceCss()}]]></style>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b0c12"/>
      <stop offset="100%" stop-color="#14151f"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${height}" fill="url(#bg)"/>
  <rect x="0" y="0" width="${W}" height="${HEADER_H}" fill="#10111a"/>
  <rect x="0" y="${HEADER_H - 2}" width="${W}" height="2" fill="#2a2b36"/>

  ${cellText(PAD, 52, `${resultLabel}  ${scoreLine}`, { size: 30, weight: 700, fill: resultColor })}

  ${cellText(W - PAD, 36, mapLabel(report.mapName), { size: 17, weight: 700, anchor: "end", fill: "#f3f4f6" })}
  ${cellText(W - PAD, 58, finished, { size: 13, weight: 700, anchor: "end", fill: "#9ca3af" })}
  ${cellText(W - PAD, 76, sourceLabel(report.dataSource), { size: 12, weight: 700, anchor: "end", fill: "#6b7280" })}

  ${ours.svg}
  ${enemy.svg}

  ${cellText(PAD, height - 14, "Data Provided by Leetify  ·  barra roxa = monitorado  ·  rating/nivel sob o nome", { size: 12, weight: 700, fill: "#6b7280" })}
  ${cellText(W - PAD, height - 14, "SURV% = rounds_survived_percentage", { size: 11, weight: 700, fill: "#4b5563", anchor: "end" })}
</svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

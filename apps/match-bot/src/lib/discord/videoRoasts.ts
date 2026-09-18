import type { AllstarClip } from "@/lib/allstar/client";

/** Short, formal caption for an Allstar clip. */
export function roastClip(clip: AllstarClip, nickname: string): string {
  const name = nickname || clip.username || "Jogador";
  const map = (clip.map || "").replace(/^de_/, "").toUpperCase();
  const parts = [`Novo clipe de ${name}`];
  if (map) parts.push(`mapa ${map}`);
  if (clip.weapon) parts.push(clip.weapon);
  if (clip.kills != null) parts.push(`${clip.kills} abate(s)`);
  return `${parts.join(" · ")}.`;
}

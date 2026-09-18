import type { AllstarClip } from "@/lib/allstar/client";

function pickOne<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/** Acidic one-liners for Allstar clips (Catbot voice). */
export function roastClip(clip: AllstarClip, nickname: string): string {
  const name = nickname || clip.username || "o atleta";
  const map = (clip.map || "").replace(/^de_/, "").toUpperCase() || "mapa misterioso";
  const weapon = clip.weapon || "a arma que o Destiny não aprovou";
  const kills = clip.kills;

  const bank: string[] = [
    `${name} no ${map} com ${weapon}. Allstar pediu legendagem automática pra não perder o absurdo.`,
    `Clipe de ${name}: ${kills != null ? `${kills} kills` : "carnificina"} no ${map}. O demo pediu férias.`,
    `${name} transformou ${map} em conteúdo. ${weapon} virou protagonista; o time adversário, figurante.`,
    `Allstar salvou porque ${name} não ia lembrar sozinho. ${map} · ${weapon}.`,
    `${name} no ${map}: highlight tão ácido que o encoder pediu antiácido.`,
    `Se o clipe do ${name} fosse receita, o ingrediente secreto era ego e ${weapon}.`,
    `${name} no ${map}. Não é edit — é evidência. ${weapon} no tribunal.`,
    `Catbot assistiu o clipe do ${name} e pediu replay em câmera lenta… pra rir de novo.`,
  ];

  if (kills != null && kills >= 4) {
    bank.push(
      `${kills} kills do ${name} no ${map}. Allstar quase pediu classificação etária.`,
      `${name} fechou ${kills} no ${map}. O killfeed pediu intervalo sindical.`
    );
  }
  if (kills != null && kills <= 1) {
    bank.push(
      `Clipe do ${name} com ${kills} kill. Allstar também posta cinema de arte, aparentemente.`
    );
  }

  return pickOne(bank);
}

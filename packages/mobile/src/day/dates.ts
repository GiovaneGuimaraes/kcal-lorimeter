import type { MealKind } from "@kcal/shared";

/**
 * Datas do painel: sempre `YYYY-MM-DD` no fuso **do aparelho** (o dia de quem come, não o do
 * servidor). A aritmética de dias é feita em UTC sobre a string, sem horário de verão no meio.
 */

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Hoje no fuso do aparelho, `YYYY-MM-DD`. */
export function todayLocal(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function toUtc(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1));
}

/** `iso` mais `dias` (negativo volta). Atravessa mês e ano: `addDays("2026-01-01", -1)` → `2025-12-31`. */
export function addDays(iso: string, dias: number): string {
  const d = toUtc(iso);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Diferença em dias de `a` para `b` (`b - a`). */
export function daysBetween(a: string, b: string): number {
  return Math.round((toUtc(b).getTime() - toUtc(a).getTime()) / 86_400_000);
}

/** Refeição sugerida pela hora do aparelho no lançamento manual (a pessoa troca se quiser). */
export function mealForHour(hora: number): MealKind {
  if (hora < 10) return "cafe";
  if (hora < 15) return "almoco";
  if (hora < 18) return "lanche";
  return "jantar";
}

const DIAS_SEMANA = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
];
const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

/**
 * Rótulo do dia em pt-BR: "Hoje", "Ontem", "Amanhã" ou por extenso ("segunda-feira, 9 de
 * novembro"; com o ano quando não é o ano de `hoje`). Nomes fixos, sem depender do `Intl` do motor JS.
 */
export function formatDayLabel(iso: string, hoje: string): string {
  const diff = daysBetween(hoje, iso);
  if (diff === 0) return "Hoje";
  if (diff === -1) return "Ontem";
  if (diff === 1) return "Amanhã";
  const d = toUtc(iso);
  const texto = `${DIAS_SEMANA[d.getUTCDay()]}, ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}`;
  return iso.slice(0, 4) === hoje.slice(0, 4) ? texto : `${texto} de ${iso.slice(0, 4)}`;
}

import { roundHalfUp } from "@kcal/nutrition-core";
import { MEAL_ORDER, type MealKind } from "@kcal/shared";

/**
 * Formatação de números para a tela (pt-BR, vírgula decimal). Quem arredonda é o
 * `@kcal/nutrition-core` (`formatMacros`/`roundHalfUp`): aqui só vira texto.
 */

/** Kcal inteiro: `256.4` → `"256"`. */
export function formatKcal(kcal: number): string {
  return String(roundHalfUp(kcal, 0));
}

/** Gramas com até 1 casa, sem `,0` à toa: `12.34` → `"12,3"`, `200` → `"200"`. */
export function formatGrams(g: number): string {
  return String(roundHalfUp(g, 1)).replace(".", ",");
}

/**
 * Texto digitado → número (aceita vírgula). Vazio vira `NaN`, para o schema do `@kcal/shared`
 * recusar com a mensagem dele em vez de virar 0.
 */
export function parseNumber(texto: string): number {
  const limpo = texto.trim().replace(",", ".");
  return limpo === "" ? Number.NaN : Number(limpo);
}

/** Nome de cada refeição na tela. */
export const MEAL_LABELS = {
  cafe: "Café da manhã",
  almoco: "Almoço",
  lanche: "Lanche",
  jantar: "Jantar",
} as const satisfies Record<MealKind, string>;

/** Opções de refeição na ordem do dia (para `SegmentedRow`). */
export const MEAL_OPTIONS = MEAL_ORDER.map((value) => ({ value, label: MEAL_LABELS[value] }));

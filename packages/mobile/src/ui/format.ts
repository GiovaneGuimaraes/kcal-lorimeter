import { roundHalfUp } from "@kcal/nutrition-core";
import { MEAL_ORDER, type MealKind } from "@kcal/shared";

/**
 * Formatação de números para a tela (pt-BR, vírgula decimal). Quem arredonda é o
 * `@kcal/nutrition-core` (`formatMacros`/`roundHalfUp`): aqui só vira texto.
 */

/**
 * Kcal inteiro com separador de milhar pt-BR: `256.4` → `"256"`, `1234.6` → `"1.235"`.
 * O separador é feito na mão (sem `Intl`, que o Hermes pode não trazer completo).
 */
export function formatKcal(kcal: number): string {
  return String(roundHalfUp(kcal, 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
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

/**
 * Iniciais do nome para o botão da conta (até 2 letras, maiúsculas): primeira e última palavra.
 * "Pessoa Teste" → "PT", "Ana" → "A", vazio → "?".
 */
export function initials(nome: string): string {
  const palavras = nome.trim().split(/\s+/).filter(Boolean);
  const primeira = palavras[0];
  if (!primeira) return "?";
  const ultima = palavras.length > 1 ? palavras[palavras.length - 1] : undefined;
  return `${primeira.charAt(0)}${ultima ? ultima.charAt(0) : ""}`.toUpperCase();
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

/** Nome curto de cada refeição, para faixas estreitas (editor do painel: "Café | Almoço | …"). */
export const MEAL_SHORT_LABELS = {
  cafe: "Café",
  almoco: "Almoço",
  lanche: "Lanche",
  jantar: "Jantar",
} as const satisfies Record<MealKind, string>;

/** `MEAL_OPTIONS` com o nome curto. */
export const MEAL_SHORT_OPTIONS = MEAL_ORDER.map((value) => ({
  value,
  label: MEAL_SHORT_LABELS[value],
}));

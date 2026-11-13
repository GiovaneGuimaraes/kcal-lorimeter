import type { Food } from "@kcal/db";
import { normalizeFoodText } from "./normalizeFoodText";

/** Nome e apelidos do alimento, normalizados, sem repetição e sem vazios. */
export function foodKeys(food: Pick<Food, "nome" | "apelidos">): string[] {
  const keys = [food.nome, ...food.apelidos].map(normalizeFoodText).filter((k) => k.length > 0);
  return [...new Set(keys)];
}

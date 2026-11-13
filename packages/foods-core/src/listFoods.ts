import type { Db } from "@kcal/db";
import type { FoodDto } from "@kcal/shared";
import { foodKeys } from "./foodKeys";
import { loadVisibleFoods } from "./loadVisibleFoods";
import { normalizeFoodText } from "./normalizeFoodText";
import { toFoodDto } from "./toFoodDto";

export interface ListFoodsOptions {
  /** Filtro: o texto normalizado precisa estar contido no nome ou num apelido normalizado. */
  q?: string;
}

/**
 * Alimentos padrão + os da pessoa (nunca de outra), em ordem alfabética do nome normalizado.
 * `q` vazio (depois de normalizado) não filtra.
 */
export function listFoods(db: Db, userId: string, options: ListFoodsOptions = {}): FoodDto[] {
  const q = normalizeFoodText(options.q ?? "");
  return loadVisibleFoods(db, userId)
    .filter((f) => q.length === 0 || foodKeys(f).some((k) => k.includes(q)))
    .map((f) => ({ f, chave: normalizeFoodText(f.nome) }))
    .sort((a, b) => a.chave.localeCompare(b.chave, "pt-BR") || a.f.id.localeCompare(b.f.id))
    .map(({ f }) => toFoodDto(f));
}

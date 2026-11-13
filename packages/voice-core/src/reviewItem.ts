import type { Db } from "@kcal/db";
import { matchFood } from "@kcal/foods-core";
import { gramsFromQuantity, PortionRequiredError } from "@kcal/nutrition-core";
import type { ExtractedItem, VoiceReviewItem } from "@kcal/shared";

/**
 * Casa um item extraído com a base da pessoa e, se o casamento for `exact`, converte a quantidade em
 * gramas (código, não IA). Unidade sem porção cadastrada → sem `gramas` e `precisaPeso: true`.
 * Não calcula macros: isso é da confirmação (entries-core).
 */
export function reviewItem(db: Db, userId: string, extraido: ExtractedItem): VoiceReviewItem {
  const match = matchFood(db, userId, extraido.alimento);
  if (match.kind !== "exact") return { extraido, match, precisaPeso: false };

  try {
    const gramas = gramsFromQuantity(match.food, extraido.quantidade, extraido.unidade);
    return { extraido, match, gramas, precisaPeso: false };
  } catch (err) {
    if (err instanceof PortionRequiredError) return { extraido, match, precisaPeso: true };
    throw err;
  }
}

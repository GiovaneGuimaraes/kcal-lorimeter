import type { Db } from "@kcal/db";
import { matchFood } from "@kcal/foods-core";
import { gramsFromQuantity, PortionRequiredError } from "@kcal/nutrition-core";
import type { ExtractedItem, VoiceReviewItem } from "@kcal/shared";
import { macrosForFood } from "./macrosForFood";

/**
 * Casa um item extraído com a base da pessoa e, se o casamento for `exact`, converte a quantidade em
 * gramas e calcula os macros dessas gramas (código, não IA: `nutrition-core`). Unidade sem porção
 * cadastrada → sem `gramas`, sem `macros` e `precisaPeso: true`. Sem `exact` → sem `macros`.
 * Os macros daqui são só para exibir na revisão; o snapshot gravado é o da confirmação (entries-core).
 */
export function reviewItem(db: Db, userId: string, extraido: ExtractedItem): VoiceReviewItem {
  const match = matchFood(db, userId, extraido.alimento);
  if (match.kind !== "exact") return { extraido, match, precisaPeso: false };

  let gramas: number;
  try {
    gramas = gramsFromQuantity(match.food, extraido.quantidade, extraido.unidade);
  } catch (err) {
    if (err instanceof PortionRequiredError) return { extraido, match, precisaPeso: true };
    throw err;
  }
  return { extraido, match, gramas, macros: macrosForFood(match.food, gramas), precisaPeso: false };
}

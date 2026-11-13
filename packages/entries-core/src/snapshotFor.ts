import type { Food } from "@kcal/db";
import { macrosForGrams } from "@kcal/nutrition-core";
import type { Macros } from "@kcal/shared";

/** Snapshot dos macros de `gramas` do alimento, com os valores **atuais** dele. Sem arredondar. */
export function snapshotFor(food: Food, gramas: number): Macros {
  return macrosForGrams(
    {
      kcal: food.kcal100g,
      proteinaG: food.proteina100g,
      carboG: food.carbo100g,
      gorduraG: food.gordura100g,
    },
    gramas,
  );
}

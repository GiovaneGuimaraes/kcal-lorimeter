import type { FoodMacrosPer100g, Macros } from "@kcal/shared";
import { assertValidQuantity } from "./assertValidQuantity";

/** Macros de `gramas` do alimento: `valor_100g × gramas / 100`, sem arredondar. */
export function macrosForGrams(food: FoodMacrosPer100g, gramas: number): Macros {
  assertValidQuantity(gramas);
  return {
    kcal: (food.kcal * gramas) / 100,
    proteinaG: (food.proteinaG * gramas) / 100,
    carboG: (food.carboG * gramas) / 100,
    gorduraG: (food.gorduraG * gramas) / 100,
  };
}

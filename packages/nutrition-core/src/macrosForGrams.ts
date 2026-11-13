import type { FoodMacrosPer100g, Macros } from "@kcal/shared";
import { assertValidQuantity } from "./assertValidQuantity";

/** Macros de `gramas` do alimento: `valor_100g × gramas / 100`, sem arredondar. */
export function macrosForGrams(food: FoodMacrosPer100g, gramas: number): Macros {
  assertValidQuantity(gramas);
  const f = gramas / 100;
  return {
    kcal: food.kcal * f,
    proteinaG: food.proteinaG * f,
    carboG: food.carboG * f,
    gorduraG: food.gorduraG * f,
  };
}

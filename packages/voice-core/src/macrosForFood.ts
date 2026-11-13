import { macrosForGrams } from "@kcal/nutrition-core";
import type { FoodDto, Macros } from "@kcal/shared";

/**
 * Macros de `gramas` de um alimento do casamento (`FoodDto`, valores por 100 g), pelo
 * `nutrition-core`. Só adapta os nomes dos campos; a conta é de `macrosForGrams`. Sem arredondar.
 */
export function macrosForFood(food: FoodDto, gramas: number): Macros {
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

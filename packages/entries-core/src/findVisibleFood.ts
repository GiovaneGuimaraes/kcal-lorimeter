import { type Db, type Food, foods } from "@kcal/db";
import { FoodNotFoundError } from "@kcal/foods-core";
import { and, eq, isNull, or } from "drizzle-orm";

/**
 * Alimento que a pessoa pode lançar: padrão (`user_id` nulo) ou dela. Inexistente ou de outra
 * pessoa → `FoodNotFoundError` (mesmo erro nos dois casos).
 */
export function findVisibleFood(db: Db, userId: string, foodId: string): Food {
  const food = db
    .select()
    .from(foods)
    .where(and(eq(foods.id, foodId), or(isNull(foods.userId), eq(foods.userId, userId))))
    .get();
  if (!food) throw new FoodNotFoundError();
  return food;
}

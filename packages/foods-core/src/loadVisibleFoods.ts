import { type Db, type Food, foods } from "@kcal/db";
import { eq, isNull, or } from "drizzle-orm";

/**
 * Todos os alimentos que a pessoa enxerga, numa query: os padrões (`user_id` nulo) e os dela.
 * Nunca os de outra pessoa.
 */
export function loadVisibleFoods(db: Db, userId: string): Food[] {
  return db
    .select()
    .from(foods)
    .where(or(isNull(foods.userId), eq(foods.userId, userId)))
    .all();
}

import type { dailyGoals } from "@kcal/db";
import type { Goal } from "./types";

/** Linha do banco → `Goal` (sem `user_id`). */
export function toGoal(row: typeof dailyGoals.$inferSelect): Goal {
  return {
    id: row.id,
    kcal: row.kcal,
    proteinaG: row.proteinaG,
    carboG: row.carboG,
    gorduraG: row.gorduraG,
    vigenteDesde: row.vigenteDesde,
  };
}

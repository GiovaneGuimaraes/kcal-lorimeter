import { type Db, dailyGoals } from "@kcal/db";
import { and, desc, eq, lte, sql } from "drizzle-orm";
import { toGoal } from "./toGoal";
import type { Goal } from "./types";

/**
 * Meta vigente da pessoa em `data` (`yyyy-mm-dd`): a de `vigenteDesde` mais recente que seja <= `data`.
 * Empate de `vigenteDesde`: vale a última inserida (a tabela não tem `criado_em`; usa o rowid).
 * `null` se não há meta.
 */
export function getGoalForDate(db: Db, userId: string, data: string): Goal | null {
  const row = db
    .select()
    .from(dailyGoals)
    .where(and(eq(dailyGoals.userId, userId), lte(dailyGoals.vigenteDesde, data)))
    .orderBy(desc(dailyGoals.vigenteDesde), sql`rowid desc`)
    .limit(1)
    .get();
  return row ? toGoal(row) : null;
}

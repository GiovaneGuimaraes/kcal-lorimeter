import { type Db, dailyGoals } from "@kcal/db";
import { toGoal } from "./toGoal";
import type { Goal } from "./types";

export interface SetGoalInput {
  kcal: number;
  proteinaG: number;
  carboG: number;
  gorduraG: number;
  /** Data ISO `yyyy-mm-dd`. Ausente → `hoje`. */
  vigenteDesde?: string | undefined;
}

export interface SetGoalOptions {
  /** "Hoje" (`yyyy-mm-dd`), injetável para teste. Default: data UTC do servidor. */
  hoje?: string | undefined;
}

/**
 * Cadastra uma meta nova (sempre insere; o histórico fica preservado). Vale a partir de
 * `vigenteDesde` (default: `hoje`).
 */
export function setGoal(
  db: Db,
  userId: string,
  input: SetGoalInput,
  options: SetGoalOptions = {},
): Goal {
  const hoje = options.hoje ?? new Date().toISOString().slice(0, 10);
  const row = db
    .insert(dailyGoals)
    .values({
      userId,
      kcal: input.kcal,
      proteinaG: input.proteinaG,
      carboG: input.carboG,
      gorduraG: input.gorduraG,
      vigenteDesde: input.vigenteDesde ?? hoje,
    })
    .returning()
    .get();
  return toGoal(row);
}

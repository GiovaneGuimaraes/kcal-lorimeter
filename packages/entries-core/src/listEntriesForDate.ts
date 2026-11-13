import { type Db, foods, mealEntries } from "@kcal/db";
import { sumMacros } from "@kcal/nutrition-core";
import { MEAL_ORDER, type MealGroup } from "@kcal/shared";
import { and, asc, eq, sql } from "drizzle-orm";
import { toEntryDto } from "./toEntryDto";

/**
 * Lançamentos da pessoa em `data` (`yyyy-mm-dd`), agrupados por refeição. Sempre as quatro
 * refeições, na ordem `cafe, almoco, lanche, jantar` (vazias inclusive); dentro de cada uma, por
 * ordem de criação. `subtotal` soma o snapshot, sem arredondar.
 */
export function listEntriesForDate(db: Db, userId: string, data: string): MealGroup[] {
  const rows = db
    .select({ entry: mealEntries, foodNome: foods.nome })
    .from(mealEntries)
    .innerJoin(foods, eq(foods.id, mealEntries.foodId))
    .where(and(eq(mealEntries.userId, userId), eq(mealEntries.data, data)))
    // `criado_em` tem resolução de ms; o rowid desempata lançamentos do mesmo instante.
    .orderBy(asc(mealEntries.criadoEm), sql`"meal_entries"."rowid"`)
    .all();

  const entradas = rows.map((r) => toEntryDto(r.entry, r.foodNome));
  return MEAL_ORDER.map((refeicao) => {
    const daRefeicao = entradas.filter((e) => e.refeicao === refeicao);
    return { refeicao, entradas: daRefeicao, subtotal: sumMacros(daRefeicao) };
  });
}

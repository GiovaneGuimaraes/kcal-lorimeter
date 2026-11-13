import type { Db } from "@kcal/db";
import { getGoalForDate } from "@kcal/goals-core";
import { sumMacros } from "@kcal/nutrition-core";
import type { DaySummaryDto } from "@kcal/shared";
import { listEntriesForDate } from "./listEntriesForDate";

/**
 * Resumo do dia da pessoa: total consumido (soma dos snapshots), meta vigente na data, quanto
 * falta (`meta − consumido`; negativo quando passou da meta; `null` sem meta) e os lançamentos por
 * refeição. Nada é arredondado aqui: arredonda-se só na exibição.
 */
export function getDaySummary(db: Db, userId: string, data: string): DaySummaryDto {
  const refeicoes = listEntriesForDate(db, userId, data);
  const consumido = sumMacros(refeicoes.map((r) => r.subtotal));
  const meta = getGoalForDate(db, userId, data);
  const restante = meta
    ? {
        kcal: meta.kcal - consumido.kcal,
        proteinaG: meta.proteinaG - consumido.proteinaG,
        carboG: meta.carboG - consumido.carboG,
        gorduraG: meta.gorduraG - consumido.gorduraG,
      }
    : null;
  return { data, consumido, meta, restante, refeicoes };
}

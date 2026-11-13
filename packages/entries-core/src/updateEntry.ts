import { type Db, mealEntries, type NewMealEntry } from "@kcal/db";
import { gramsFromQuantity } from "@kcal/nutrition-core";
import { type EntryDto, type UpdateEntryInput, UpdateEntrySchema } from "@kcal/shared";
import { and, eq } from "drizzle-orm";
import { EntryNotFoundError } from "./errors";
import { findVisibleFood } from "./findVisibleFood";
import { snapshotFor } from "./snapshotFor";
import { toEntryDto } from "./toEntryDto";

/**
 * Altera um lançamento **da própria pessoa** (validado por `UpdateEntrySchema`; lança `ZodError` se
 * inválido). Inexistente ou de outra pessoa → `EntryNotFoundError`.
 *
 * Quando a quantidade muda (`gramas`, ou `quantidade` + `unidade` resolvidas de novo), o snapshot
 * é recalculado com os valores **atuais** do alimento: editar o lançamento reescreve o lançamento.
 * Mudar só `refeicao`/`data` mantém o snapshot: editar o alimento não reescreve o passado.
 */
export function updateEntry(
  db: Db,
  userId: string,
  entryId: string,
  patch: UpdateEntryInput,
): EntryDto {
  const data = UpdateEntrySchema.parse(patch);

  const atual = db
    .select()
    .from(mealEntries)
    .where(and(eq(mealEntries.id, entryId), eq(mealEntries.userId, userId)))
    .get();
  if (!atual) throw new EntryNotFoundError();

  const food = findVisibleFood(db, userId, atual.foodId);

  const set: Partial<NewMealEntry> = {};
  if (data.refeicao !== undefined) set.refeicao = data.refeicao;
  if (data.data !== undefined) set.data = data.data;

  let gramas: number | undefined = data.gramas;
  if (data.quantidade !== undefined && data.unidade !== undefined) {
    gramas = gramsFromQuantity(food, data.quantidade, data.unidade);
  }
  if (gramas !== undefined) {
    Object.assign(set, { gramas, ...snapshotFor(food, gramas) });
  }

  const atualizado = db
    .update(mealEntries)
    .set(set)
    .where(and(eq(mealEntries.id, atual.id), eq(mealEntries.userId, userId)))
    .returning()
    .get();
  if (!atualizado) throw new EntryNotFoundError();
  return toEntryDto(atualizado, food.nome);
}

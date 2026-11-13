import { type Db, mealEntries, voiceLogs } from "@kcal/db";
import { gramsFromQuantity } from "@kcal/nutrition-core";
import { type CreateEntryInput, CreateEntrySchema, type EntryDto } from "@kcal/shared";
import { and, eq } from "drizzle-orm";
import { VoiceLogNotFoundError } from "./errors";
import { findVisibleFood } from "./findVisibleFood";
import { snapshotFor } from "./snapshotFor";
import { toEntryDto } from "./toEntryDto";

/**
 * Lança um alimento no dia da pessoa (validado por `CreateEntrySchema`; lança `ZodError` se
 * inválido). Converte quantidade + unidade em gramas (`gramsFromQuantity`) e grava o **snapshot**
 * dos macros calculados com os valores atuais do alimento: editar o alimento depois não muda este
 * lançamento.
 *
 * Erros: alimento inexistente/de outra pessoa → `FoodNotFoundError`; unidade sem porção padrão →
 * `PortionRequiredError`; `voiceLogId` inexistente/de outra pessoa → `VoiceLogNotFoundError`.
 */
export function createEntry(db: Db, userId: string, input: CreateEntryInput): EntryDto {
  const data = CreateEntrySchema.parse(input);

  const food = findVisibleFood(db, userId, data.foodId);

  if (data.voiceLogId !== undefined) {
    const log = db
      .select({ id: voiceLogs.id })
      .from(voiceLogs)
      .where(and(eq(voiceLogs.id, data.voiceLogId), eq(voiceLogs.userId, userId)))
      .get();
    if (!log) throw new VoiceLogNotFoundError();
  }

  const gramas = gramsFromQuantity(food, data.quantidade, data.unidade);
  const macros = snapshotFor(food, gramas);

  const entry = db
    .insert(mealEntries)
    .values({
      userId,
      data: data.data,
      refeicao: data.refeicao,
      foodId: food.id,
      gramas,
      ...macros,
      origem: data.origem,
      voiceLogId: data.voiceLogId ?? null,
    })
    .returning()
    .get();
  return toEntryDto(entry, food.nome);
}

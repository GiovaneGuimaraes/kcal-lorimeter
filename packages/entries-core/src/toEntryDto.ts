import type { MealEntry } from "@kcal/db";
import type { EntryDto, MealKind } from "@kcal/shared";

/** Linha do banco + nome do alimento → DTO da API (sem `userId`/`criadoEm`). */
export function toEntryDto(entry: MealEntry, foodNome: string): EntryDto {
  return {
    id: entry.id,
    data: entry.data,
    // A coluna é texto livre no banco, mas só é escrita por este core, já validada.
    refeicao: entry.refeicao as MealKind,
    food: { id: entry.foodId, nome: foodNome },
    gramas: entry.gramas,
    kcal: entry.kcal,
    proteinaG: entry.proteinaG,
    carboG: entry.carboG,
    gorduraG: entry.gorduraG,
    origem: entry.origem,
    voiceLogId: entry.voiceLogId,
  };
}

import {
  type CreateEntryInput,
  type CreateFoodInput,
  type EntryDto,
  EntryDtoSchema,
  type FoodDto,
  FoodDtoSchema,
  ListFoodsResponseSchema,
} from "@kcal/shared";
import { ApiError, apiRequest } from "./client";

/*
 * Chamadas que a tela de revisão (`/revisao`) faz. Separado de `entries.ts` (painel do dia) só
 * para as duas telas andarem em paralelo; podem ser unificados depois.
 */

/** `POST /entries` — um lançamento por item confirmado. 400/404 → `ApiError` com `{ erro }`. */
export function createEntry(body: CreateEntryInput): Promise<EntryDto> {
  return apiRequest("/entries", { method: "POST", json: body, schema: EntryDtoSchema });
}

/**
 * `POST /voice/:id/discard`. 404 (registro já descartado/confirmado ou inexistente) é ignorado:
 * para quem desistiu da revisão o resultado é o mesmo.
 */
export async function discardVoiceLog(voiceLogId: string): Promise<void> {
  try {
    await apiRequest(`/voice/${encodeURIComponent(voiceLogId)}/discard`, { method: "POST" });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return;
    throw err;
  }
}

/** `GET /foods?q=` — padrões + os da pessoa que casam com o texto. */
export async function searchFoods(q: string): Promise<FoodDto[]> {
  const res = await apiRequest(`/foods?q=${encodeURIComponent(q)}`, {
    schema: ListFoodsResponseSchema,
  });
  return res.foods;
}

/** `POST /foods` — cadastra um alimento da pessoa (macros por 100 g digitados por ela). */
export function createFood(body: CreateFoodInput): Promise<FoodDto> {
  return apiRequest("/foods", { method: "POST", json: body, schema: FoodDtoSchema });
}

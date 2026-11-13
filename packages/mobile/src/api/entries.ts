import {
  type CreateEntryInput,
  type EntryDto,
  EntryDtoSchema,
  type UpdateEntryInput,
} from "@kcal/shared";
import { apiRequest } from "./client";

/** `POST /entries` — lança um alimento (o servidor converte a quantidade em gramas e calcula). */
export function createEntry(body: CreateEntryInput): Promise<EntryDto> {
  return apiRequest("/entries", { method: "POST", json: body, schema: EntryDtoSchema });
}

/**
 * `PATCH /entries/:id`. Mande só o que mudou: `gramas` recalcula o snapshot com os valores atuais
 * do alimento; mudar só `refeicao` mantém o snapshot.
 */
export function updateEntry(id: string, patch: UpdateEntryInput): Promise<EntryDto> {
  return apiRequest(`/entries/${encodeURIComponent(id)}`, {
    method: "PATCH",
    json: patch,
    schema: EntryDtoSchema,
  });
}

/** `DELETE /entries/:id` (204). */
export function deleteEntry(id: string): Promise<void> {
  return apiRequest(`/entries/${encodeURIComponent(id)}`, { method: "DELETE" });
}

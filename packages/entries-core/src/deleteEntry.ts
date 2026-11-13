import { type Db, mealEntries } from "@kcal/db";
import { and, eq } from "drizzle-orm";
import { EntryNotFoundError } from "./errors";

/** Apaga um lançamento da própria pessoa. Inexistente ou de outra pessoa → `EntryNotFoundError`. */
export function deleteEntry(db: Db, userId: string, entryId: string): void {
  const apagado = db
    .delete(mealEntries)
    .where(and(eq(mealEntries.id, entryId), eq(mealEntries.userId, userId)))
    .returning({ id: mealEntries.id })
    .get();
  if (!apagado) throw new EntryNotFoundError();
}

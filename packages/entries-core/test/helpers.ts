import { createDb, type DbHandle, foods, seedDefaultFoods, users, voiceLogs } from "@kcal/db";
import { and, eq, isNull } from "drizzle-orm";

/** Banco em memória com a base padrão e duas pessoas inventadas. Feche com `handle.close()`. */
export function setupDb(): { handle: DbHandle; ana: string; bruno: string } {
  const handle = createDb({ path: ":memory:" });
  seedDefaultFoods(handle.db);
  const criar = (email: string, nome: string) =>
    handle.db
      .insert(users)
      .values({ email, nome, senhaHash: "hash-de-teste" })
      .returning({ id: users.id })
      .get().id;
  return {
    handle,
    ana: criar("ana@exemplo.com", "Ana Teste"),
    bruno: criar("bruno@exemplo.com", "Bruno Teste"),
  };
}

/** Id de um alimento padrão do seed, pelo nome exato. */
export function padrao(handle: DbHandle, nome: string): string {
  const row = handle.db
    .select({ id: foods.id })
    .from(foods)
    .where(and(eq(foods.nome, nome), isNull(foods.userId)))
    .get();
  if (!row) throw new Error(`alimento padrão ausente no seed: ${nome}`);
  return row.id;
}

/**
 * Alimento inventado da pessoa (macros fictícios, só para teste). Com `porcaoPadraoG`, aceita
 * unidades como `scoop`.
 */
export function alimentoDe(
  handle: DbHandle,
  userId: string,
  nome: string,
  porcaoPadraoG: number | null = null,
): string {
  return handle.db
    .insert(foods)
    .values({
      userId,
      nome,
      kcal100g: 400,
      proteina100g: 80,
      carbo100g: 8,
      gordura100g: 6,
      porcaoPadraoG,
      nomePorcao: porcaoPadraoG === null ? null : "scoop",
      fonte: "teste",
    })
    .returning({ id: foods.id })
    .get().id;
}

/** Registro de voz inventado da pessoa. */
export function voiceLogDe(handle: DbHandle, userId: string): string {
  return handle.db
    .insert(voiceLogs)
    .values({ userId, transcricao: "frase inventada de teste" })
    .returning({ id: voiceLogs.id })
    .get().id;
}

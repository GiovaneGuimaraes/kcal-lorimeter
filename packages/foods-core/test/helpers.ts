import { createDb, type DbHandle, seedDefaultFoods, users } from "@kcal/db";
import type { CreateFoodInput } from "@kcal/shared";

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

/** Alimento inventado (macros fictícios, só para teste). */
export function alimento(nome: string, apelidos: string[] = []): CreateFoodInput {
  return { nome, apelidos, kcal100g: 100, proteina100g: 10, carbo100g: 10, gordura100g: 1 };
}

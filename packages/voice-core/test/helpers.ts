import { createDb, type DbHandle, foods, seedDefaultFoods, users } from "@kcal/db";
import type { ItemExtractor } from "@kcal/llm";
import type { ExtractedItem } from "@kcal/shared";

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

/** Alimento inventado da pessoa, sem porção padrão (macros fictícios, só para teste). */
export function criarAlimentoSemPorcao(
  handle: DbHandle,
  userId: string,
  nome: string,
  apelidos: string[],
) {
  return handle.db
    .insert(foods)
    .values({
      userId,
      nome,
      apelidos,
      kcal100g: 100,
      proteina100g: 10,
      carbo100g: 10,
      gordura100g: 1,
      fonte: "teste",
    })
    .returning({ id: foods.id })
    .get().id;
}

/** Extrator falso: devolve sempre os mesmos itens e guarda os textos recebidos. */
export function fakeExtractor(itens: ExtractedItem[]): ItemExtractor & { textos: string[] } {
  const textos: string[] = [];
  return {
    textos,
    async extract(text) {
      textos.push(text);
      return itens;
    },
  };
}

/** Itens da frase inventada "200 g de arroz, 100 g de frango empanado e 1 xyz". */
export const TRES_ITENS: ExtractedItem[] = [
  { alimento: "arroz", quantidade: 200, unidade: "g", refeicao: "almoco" },
  { alimento: "frango empanado", quantidade: 100, unidade: "g" },
  { alimento: "xyz", quantidade: 1, unidade: "unidade" },
];

/** Bytes inventados (não é áudio de ninguém). */
export const AUDIO_FALSO = { bytes: new Uint8Array([1, 2, 3, 4]), mimeType: "audio/m4a" };

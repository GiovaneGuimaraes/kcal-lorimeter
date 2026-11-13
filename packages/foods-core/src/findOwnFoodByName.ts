import { type Db, type Food, foods } from "@kcal/db";
import { eq } from "drizzle-orm";
import { normalizeFoodText } from "./normalizeFoodText";

/**
 * Alimento da própria pessoa cujo nome, normalizado, é igual a `nome` normalizado ("Frango
 * Caseiro" = "frango caseiro" = "Frangos caseiros"). Base da regra de nome único por pessoa.
 */
export function findOwnFoodByName(db: Db, userId: string, nome: string): Food | undefined {
  const alvo = normalizeFoodText(nome);
  return db
    .select()
    .from(foods)
    .where(eq(foods.userId, userId))
    .all()
    .find((f) => normalizeFoodText(f.nome) === alvo);
}

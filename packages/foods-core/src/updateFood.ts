import { type Db, foods, type NewFood } from "@kcal/db";
import { type FoodDto, type UpdateFoodInput, UpdateFoodSchema } from "@kcal/shared";
import { and, eq } from "drizzle-orm";
import { FoodAlreadyExistsError, FoodNotFoundError } from "./errors";
import { findOwnFoodByName } from "./findOwnFoodByName";
import { toFoodDto } from "./toFoodDto";

/**
 * Altera um alimento **da própria pessoa** (validado por `UpdateFoodSchema`; lança `ZodError` se
 * inválido). Alimento inexistente, padrão ou de outra pessoa → `FoodNotFoundError`. Renomear para o
 * nome de outro alimento dela → `FoodAlreadyExistsError`.
 *
 * Lançamentos guardam snapshot dos macros: alterar o alimento não reescreve dias passados.
 */
export function updateFood(
  db: Db,
  userId: string,
  foodId: string,
  patch: UpdateFoodInput,
): FoodDto {
  const data = UpdateFoodSchema.parse(patch);

  const atual = db
    .select()
    .from(foods)
    .where(and(eq(foods.id, foodId), eq(foods.userId, userId)))
    .get();
  if (!atual) throw new FoodNotFoundError();

  if (data.nome !== undefined) {
    const mesmoNome = findOwnFoodByName(db, userId, data.nome);
    if (mesmoNome && mesmoNome.id !== atual.id) throw new FoodAlreadyExistsError();
  }

  const set: Partial<NewFood> = {};
  if (data.nome !== undefined) set.nome = data.nome;
  if (data.apelidos !== undefined) set.apelidos = data.apelidos;
  if (data.kcal100g !== undefined) set.kcal100g = data.kcal100g;
  if (data.proteina100g !== undefined) set.proteina100g = data.proteina100g;
  if (data.carbo100g !== undefined) set.carbo100g = data.carbo100g;
  if (data.gordura100g !== undefined) set.gordura100g = data.gordura100g;
  if (data.porcaoPadraoG !== undefined) set.porcaoPadraoG = data.porcaoPadraoG;
  if (data.nomePorcao !== undefined) set.nomePorcao = data.nomePorcao;
  if (data.fonte !== undefined) set.fonte = data.fonte;

  const atualizado = db
    .update(foods)
    .set(set)
    .where(and(eq(foods.id, atual.id), eq(foods.userId, userId)))
    .returning()
    .get();
  if (!atualizado) throw new FoodNotFoundError();
  return toFoodDto(atualizado);
}

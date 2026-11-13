import { type Db, foods } from "@kcal/db";
import { type CreateFoodInput, CreateFoodSchema, type FoodDto } from "@kcal/shared";
import { FoodAlreadyExistsError } from "./errors";
import { findOwnFoodByName } from "./findOwnFoodByName";
import { toFoodDto } from "./toFoodDto";

/**
 * Cadastra um alimento da pessoa (`user_id = userId`), validado por `CreateFoodSchema` (lança
 * `ZodError` se inválido). Nome repetido entre os alimentos **dela** (comparação normalizada) →
 * `FoodAlreadyExistsError`; repetir o nome de um alimento padrão é permitido.
 *
 * Síncrono de propósito: com `better-sqlite3` a checagem e o insert rodam sem ceder o event loop,
 * então não há corrida entre duas requisições.
 */
export function createFood(db: Db, userId: string, input: CreateFoodInput): FoodDto {
  const data = CreateFoodSchema.parse(input);
  if (findOwnFoodByName(db, userId, data.nome)) throw new FoodAlreadyExistsError();

  const criado = db
    .insert(foods)
    .values({
      userId,
      nome: data.nome,
      apelidos: data.apelidos,
      kcal100g: data.kcal100g,
      proteina100g: data.proteina100g,
      carbo100g: data.carbo100g,
      gordura100g: data.gordura100g,
      porcaoPadraoG: data.porcaoPadraoG ?? null,
      nomePorcao: data.nomePorcao ?? null,
      fonte: data.fonte,
    })
    .returning()
    .get();
  return toFoodDto(criado);
}

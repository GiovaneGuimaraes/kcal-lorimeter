import type { Food } from "@kcal/db";
import type { FoodDto } from "@kcal/shared";

/** Linha do banco → DTO da API: tira `userId`/`criadoEm` e expõe `isPadrao`. */
export function toFoodDto(food: Food): FoodDto {
  return {
    id: food.id,
    nome: food.nome,
    apelidos: [...food.apelidos],
    kcal100g: food.kcal100g,
    proteina100g: food.proteina100g,
    carbo100g: food.carbo100g,
    gordura100g: food.gordura100g,
    porcaoPadraoG: food.porcaoPadraoG,
    nomePorcao: food.nomePorcao,
    fonte: food.fonte,
    isPadrao: food.userId === null,
  };
}

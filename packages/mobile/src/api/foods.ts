import { type FoodDto, ListFoodsResponseSchema } from "@kcal/shared";
import { apiRequest } from "./client";

/** `GET /foods?q=` — alimentos padrão + os da pessoa cujo nome/apelido casa com `q`. */
export async function searchFoods(q: string): Promise<FoodDto[]> {
  const res = await apiRequest(`/foods?q=${encodeURIComponent(q)}`, {
    schema: ListFoodsResponseSchema,
  });
  return res.foods;
}

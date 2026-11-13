import {
  createFood,
  FoodAlreadyExistsError,
  FoodNotFoundError,
  listFoods,
  matchFood,
  updateFood,
} from "@kcal/foods-core";
import {
  CreateFoodSchema,
  type ErrorResponse,
  type FoodDto,
  type ListFoodsResponse,
  type MatchFoodResult,
  UpdateFoodSchema,
} from "@kcal/shared";
import { Hono } from "hono";
import { parseBody } from "../http/parse-body";
import { requireUser } from "../middleware/require-user";
import type { AppDeps, AuthedEnv } from "../types";

/**
 * Alimentos da pessoa logada (todas as rotas exigem `requireUser`):
 * - `GET /foods?q=` — padrões + os dela, com filtro opcional por nome/apelido;
 * - `GET /foods/match?texto=` — casa um nome falado com um alimento (`MatchFoodResult`);
 * - `POST /foods` — cadastra um alimento dela;
 * - `PATCH /foods/:id` — altera um alimento dela (padrão ou de outra pessoa → 404).
 */
export function foodsRoutes({ db, jwtSecret }: AppDeps): Hono<AuthedEnv> {
  const routes = new Hono<AuthedEnv>();
  routes.use("*", requireUser(jwtSecret));

  routes.get("/", (c) => {
    const q = c.req.query("q");
    if (q !== undefined && q.trim() === "") {
      return c.json<ErrorResponse>({ erro: "Parâmetro q não pode ser vazio" }, 400);
    }
    const foods = listFoods(db, c.get("userId"), q === undefined ? {} : { q });
    return c.json<ListFoodsResponse>({ foods });
  });

  // Antes de `/:id`, para "match" não ser tratado como id.
  routes.get("/match", (c) => {
    const texto = c.req.query("texto");
    if (texto === undefined || texto.trim() === "") {
      return c.json<ErrorResponse>({ erro: "Parâmetro texto é obrigatório" }, 400);
    }
    return c.json<MatchFoodResult>(matchFood(db, c.get("userId"), texto));
  });

  routes.post("/", async (c) => {
    const body = await parseBody(c, CreateFoodSchema);
    if (!body.ok) return c.json<ErrorResponse>({ erro: body.erro }, 400);

    try {
      return c.json<FoodDto>(createFood(db, c.get("userId"), body.data), 201);
    } catch (err) {
      if (err instanceof FoodAlreadyExistsError) {
        return c.json<ErrorResponse>({ erro: "Você já tem um alimento com este nome" }, 409);
      }
      throw err;
    }
  });

  routes.patch("/:id", async (c) => {
    const body = await parseBody(c, UpdateFoodSchema);
    if (!body.ok) return c.json<ErrorResponse>({ erro: body.erro }, 400);

    try {
      return c.json<FoodDto>(updateFood(db, c.get("userId"), c.req.param("id"), body.data));
    } catch (err) {
      if (err instanceof FoodNotFoundError) {
        return c.json<ErrorResponse>({ erro: "Alimento não encontrado" }, 404);
      }
      if (err instanceof FoodAlreadyExistsError) {
        return c.json<ErrorResponse>({ erro: "Você já tem um alimento com este nome" }, 409);
      }
      throw err;
    }
  });

  return routes;
}

import {
  createEntry,
  deleteEntry,
  EntryNotFoundError,
  updateEntry,
  VoiceLogNotFoundError,
} from "@kcal/entries-core";
import { FoodNotFoundError } from "@kcal/foods-core";
import { InvalidQuantityError, PortionRequiredError } from "@kcal/nutrition-core";
import {
  CreateEntrySchema,
  type EntryDto,
  type ErrorResponse,
  UpdateEntrySchema,
} from "@kcal/shared";
import { type Context, Hono } from "hono";
import { parseBody } from "../http/parse-body";
import { requireUser } from "../middleware/require-user";
import type { AppDeps, AuthedEnv } from "../types";

/** Traduz os erros de domínio de lançamento em resposta HTTP; `null` se não for um deles. */
function entryErrorResponse(c: Context, err: unknown): Response | null {
  if (err instanceof PortionRequiredError) {
    return c.json<ErrorResponse>(
      {
        erro: `Este alimento não tem porção padrão para "${err.unidade}": informe a quantidade em gramas`,
      },
      400,
    );
  }
  if (err instanceof InvalidQuantityError) {
    return c.json<ErrorResponse>({ erro: "Quantidade inválida" }, 400);
  }
  if (err instanceof FoodNotFoundError) {
    return c.json<ErrorResponse>({ erro: "Alimento não encontrado" }, 404);
  }
  if (err instanceof EntryNotFoundError) {
    return c.json<ErrorResponse>({ erro: "Lançamento não encontrado" }, 404);
  }
  if (err instanceof VoiceLogNotFoundError) {
    return c.json<ErrorResponse>({ erro: "Registro de voz não encontrado" }, 404);
  }
  return null;
}

/**
 * Lançamentos da pessoa logada (todas as rotas exigem `requireUser`):
 * - `POST /entries` — lança um alimento (grava gramas + snapshot dos macros);
 * - `PATCH /entries/:id` — altera quantidade/refeição/data de um lançamento dela;
 * - `DELETE /entries/:id` — apaga um lançamento dela (de outra pessoa → 404).
 */
export function entriesRoutes({ db, jwtSecret }: AppDeps): Hono<AuthedEnv> {
  const routes = new Hono<AuthedEnv>();
  routes.use("*", requireUser(jwtSecret));

  routes.post("/", async (c) => {
    const body = await parseBody(c, CreateEntrySchema);
    if (!body.ok) return c.json<ErrorResponse>({ erro: body.erro }, 400);

    try {
      return c.json<EntryDto>(createEntry(db, c.get("userId"), body.data), 201);
    } catch (err) {
      const res = entryErrorResponse(c, err);
      if (res) return res;
      throw err;
    }
  });

  routes.patch("/:id", async (c) => {
    const body = await parseBody(c, UpdateEntrySchema);
    if (!body.ok) return c.json<ErrorResponse>({ erro: body.erro }, 400);

    try {
      return c.json<EntryDto>(updateEntry(db, c.get("userId"), c.req.param("id"), body.data));
    } catch (err) {
      const res = entryErrorResponse(c, err);
      if (res) return res;
      throw err;
    }
  });

  routes.delete("/:id", (c) => {
    try {
      deleteEntry(db, c.get("userId"), c.req.param("id"));
      return c.body(null, 204);
    } catch (err) {
      const res = entryErrorResponse(c, err);
      if (res) return res;
      throw err;
    }
  });

  return routes;
}

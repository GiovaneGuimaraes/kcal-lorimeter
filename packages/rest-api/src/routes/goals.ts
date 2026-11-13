import { getGoalForDate, setGoal } from "@kcal/goals-core";
import { type ErrorResponse, GetGoalQuerySchema, type GoalDto, SetGoalSchema } from "@kcal/shared";
import { Hono } from "hono";
import { parseBody } from "../http/parse-body";
import { requireUser } from "../middleware/require-user";
import type { AppDeps, AuthedEnv } from "../types";

/** `GET /goals?data=` (meta vigente na data; default hoje) e `PUT /goals` (nova meta). */
export function goalsRoutes({ db, jwtSecret }: AppDeps): Hono<AuthedEnv> {
  const routes = new Hono<AuthedEnv>();
  routes.use("*", requireUser(jwtSecret));

  routes.get("/", (c) => {
    const query = GetGoalQuerySchema.safeParse({ data: c.req.query("data") });
    if (!query.success) {
      return c.json<ErrorResponse>(
        { erro: query.error.issues[0]?.message ?? "Dados inválidos" },
        400,
      );
    }
    const data = query.data.data ?? new Date().toISOString().slice(0, 10);
    const goal = getGoalForDate(db, c.get("userId"), data);
    if (!goal) return c.json<ErrorResponse>({ erro: "Nenhuma meta cadastrada" }, 404);
    return c.json<GoalDto>(goal);
  });

  routes.put("/", async (c) => {
    const body = await parseBody(c, SetGoalSchema);
    if (!body.ok) return c.json<ErrorResponse>({ erro: body.erro }, 400);
    return c.json<GoalDto>(setGoal(db, c.get("userId"), body.data));
  });

  return routes;
}

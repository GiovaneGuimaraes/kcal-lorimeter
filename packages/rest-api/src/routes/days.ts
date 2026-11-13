import { getDaySummary } from "@kcal/entries-core";
import { type DaySummaryDto, type ErrorResponse, IsoDateSchema } from "@kcal/shared";
import { Hono } from "hono";
import { requireUser } from "../middleware/require-user";
import type { AppDeps, AuthedEnv } from "../types";

/**
 * `GET /days/:data` (exige `requireUser`): resumo do dia da pessoa — consumido, meta vigente,
 * restante e lançamentos por refeição. Macros sem arredondar (a UI usa `formatMacros`).
 */
export function daysRoutes({ db, jwtSecret }: AppDeps): Hono<AuthedEnv> {
  const routes = new Hono<AuthedEnv>();
  routes.use("*", requireUser(jwtSecret));

  routes.get("/:data", (c) => {
    const data = IsoDateSchema.safeParse(c.req.param("data"));
    if (!data.success) {
      return c.json<ErrorResponse>(
        { erro: data.error.issues[0]?.message ?? "Data inválida (use AAAA-MM-DD)" },
        400,
      );
    }
    return c.json<DaySummaryDto>(getDaySummary(db, c.get("userId"), data.data));
  });

  return routes;
}

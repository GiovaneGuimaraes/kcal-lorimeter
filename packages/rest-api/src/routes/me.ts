import { getUserById } from "@kcal/auth-core";
import type { ErrorResponse, MeResponse } from "@kcal/shared";
import { Hono } from "hono";
import { requireUser } from "../middleware/require-user";
import type { AppDeps, AuthedEnv } from "../types";

/** `GET /me`: dados públicos da pessoa logada. */
export function meRoutes({ db, jwtSecret }: AppDeps): Hono<AuthedEnv> {
  const routes = new Hono<AuthedEnv>();

  routes.get("/", requireUser(jwtSecret), (c) => {
    const user = getUserById(db, c.get("userId"));
    // Token válido de uma conta que não existe mais: trata como sessão inválida.
    if (!user) return c.json<ErrorResponse>({ erro: "Sessão inválida ou expirada" }, 401);
    return c.json<MeResponse>(user);
  });

  return routes;
}

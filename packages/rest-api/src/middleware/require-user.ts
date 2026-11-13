import { InvalidSessionError, verifySession } from "@kcal/auth-core";
import type { ErrorResponse } from "@kcal/shared";
import { createMiddleware } from "hono/factory";
import type { AuthedEnv } from "../types";

/**
 * Exige `Authorization: Bearer <token>` válido e põe `userId` no contexto (`c.get("userId")`).
 * Sem token ou token inválido/expirado/de outro segredo → 401 `{erro}`.
 *
 * Toda rota com dado da pessoa usa isto e filtra pelo `userId` recebido.
 */
export function requireUser(jwtSecret: string) {
  return createMiddleware<AuthedEnv>(async (c, next) => {
    const header = c.req.header("Authorization") ?? "";
    const match = /^Bearer\s+(\S+)\s*$/i.exec(header);
    if (!match?.[1]) {
      c.header("WWW-Authenticate", "Bearer");
      return c.json<ErrorResponse>({ erro: "Não autenticado" }, 401);
    }

    try {
      const { userId } = await verifySession(match[1], jwtSecret);
      c.set("userId", userId);
    } catch (err) {
      if (!(err instanceof InvalidSessionError)) throw err;
      c.header("WWW-Authenticate", 'Bearer error="invalid_token"');
      return c.json<ErrorResponse>({ erro: "Sessão inválida ou expirada" }, 401);
    }

    await next();
  });
}

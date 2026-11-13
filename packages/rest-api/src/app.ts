import { type ErrorResponse, type HealthResponse, HealthResponseSchema } from "@kcal/shared";
import { Hono } from "hono";
import { authRoutes } from "./routes/auth";
import { goalsRoutes } from "./routes/goals";
import { meRoutes } from "./routes/me";
import type { AppDeps } from "./types";

/**
 * Monta o app HTTP com as dependências injetadas. Não lê env nem abre banco: quem faz isso é o
 * `server.ts` (e os testes passam um banco em memória).
 */
export function createApp(deps: AppDeps): Hono {
  const app = new Hono();

  app.get("/health", (c) => {
    const body: HealthResponse = HealthResponseSchema.parse({ ok: true });
    return c.json(body);
  });

  app.route("/auth", authRoutes(deps));
  app.route("/me", meRoutes(deps));
  app.route("/goals", goalsRoutes(deps));

  app.notFound((c) => c.json<ErrorResponse>({ erro: "Rota não encontrada" }, 404));

  app.onError((err, c) => {
    // Detalhe só no log do servidor; a resposta nunca leva stack nem mensagem interna.
    console.error(err);
    return c.json<ErrorResponse>({ erro: "Erro interno do servidor" }, 500);
  });

  return app;
}

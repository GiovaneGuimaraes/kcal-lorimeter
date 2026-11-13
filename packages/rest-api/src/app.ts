import { randomUUID } from "node:crypto";
import { type ErrorResponse, type HealthResponse, HealthResponseSchema } from "@kcal/shared";
import { Hono } from "hono";
import { authRoutes } from "./routes/auth";
import { daysRoutes } from "./routes/days";
import { entriesRoutes } from "./routes/entries";
import { foodsRoutes } from "./routes/foods";
import { goalsRoutes } from "./routes/goals";
import { meRoutes } from "./routes/me";
import { voiceRoutes } from "./routes/voice";
import type { AppDeps } from "./types";

/** Só as linhas de frame ("at ..."): descarta a mensagem, que abre a stack. */
function framesDaStack(err: unknown): string {
  if (!(err instanceof Error) || !err.stack) return "";
  return err.stack
    .split("\n")
    .filter((l) => /^\s+at /.test(l))
    .join("\n");
}

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
  app.route("/foods", foodsRoutes(deps));
  app.route("/entries", entriesRoutes(deps));
  app.route("/days", daysRoutes(deps));
  app.route("/voice", voiceRoutes(deps));

  app.notFound((c) => c.json<ErrorResponse>({ erro: "Rota não encontrada" }, 404));

  app.onError((err, c) => {
    // O log do servidor nunca leva a mensagem do erro (pode conter transcrição, hash ou parâmetro
    // de query): só o nome, um id de correlação e, fora de produção, os frames da stack.
    const id = randomUUID();
    const nome = err instanceof Error ? err.name : typeof err;
    if (process.env.NODE_ENV === "production") {
      console.error(`erro 500 [${id}] ${nome}`);
    } else {
      console.error(`erro 500 [${id}] ${nome}\n${framesDaStack(err)}`);
    }
    c.header("X-Request-Id", id);
    return c.json<ErrorResponse & { id: string }>({ erro: "Erro interno do servidor", id }, 500);
  });

  return app;
}

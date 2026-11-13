import { createDb, type DbHandle } from "@kcal/db";
import type { Hono } from "hono";
import { createApp } from "../src/app";

/** Segredos só de teste (32+ caracteres, como o server.ts exige). */
export const TEST_SECRET = "segredo-de-teste-com-mais-de-32-caracteres";
export const OTHER_SECRET = "outro-segredo-de-teste-com-mais-de-32-chars";

/** Pessoa inventada. */
export const ANA = { email: "ana@exemplo.com", nome: "Ana Teste", senha: "senha-da-ana-123" };

export interface TestApp {
  app: Hono;
  handle: DbHandle;
}

/** App com banco em memória novo. Feche com `handle.close()`. */
export function makeTestApp(jwtSecret = TEST_SECRET): TestApp {
  const handle = createDb({ path: ":memory:" });
  return { app: createApp({ db: handle.db, jwtSecret }), handle };
}

export function postJson(app: Hono, path: string, body: unknown): Promise<Response> | Response {
  return app.request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

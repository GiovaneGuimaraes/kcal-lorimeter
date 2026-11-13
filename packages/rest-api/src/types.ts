import type { Db } from "@kcal/db";

/** Dependências que o app recebe de fora (o `server.ts` monta; os testes passam as suas). */
export interface AppDeps {
  db: Db;
  /** Segredo HS256 dos tokens de sessão. Quem valida o tamanho mínimo é o `server.ts`. */
  jwtSecret: string;
}

/** Ambiente Hono das rotas autenticadas: `requireUser` põe `userId` no contexto. */
export interface AuthedEnv {
  Variables: {
    userId: string;
  };
}

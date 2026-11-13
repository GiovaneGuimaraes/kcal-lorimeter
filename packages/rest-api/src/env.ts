import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

/** Tamanho mínimo do `JWT_SECRET` (HS256 pede chave de pelo menos 256 bits). */
export const MIN_JWT_SECRET_LENGTH = 32;

/** Variável definida mas vazia (`PORT=` no `.env`) conta como ausente. */
const emptyToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

const PORT_ERROR = "PORT deve ser um número inteiro entre 1 e 65535";

const EnvSchema = z.object({
  DB_PATH: z.preprocess(emptyToUndefined, z.string().trim().default("data/kcal.sqlite")),
  JWT_SECRET: z.preprocess(
    emptyToUndefined,
    z.string({ error: "JWT_SECRET não definido (veja .env.example)" }).min(MIN_JWT_SECRET_LENGTH, {
      error: `JWT_SECRET precisa ter pelo menos ${MIN_JWT_SECRET_LENGTH} caracteres`,
    }),
  ),
  PORT: z.preprocess(
    emptyToUndefined,
    z.coerce
      .number({ error: PORT_ERROR })
      .int({ error: PORT_ERROR })
      .min(1, { error: PORT_ERROR })
      .max(65535, { error: PORT_ERROR })
      .default(3000),
  ),
});

export interface ServerEnv {
  /** Caminho absoluto do SQLite, ou `":memory:"`. */
  dbPath: string;
  jwtSecret: string;
  port: number;
}

/** Variável de ambiente ausente ou inválida. A mensagem já diz o que corrigir. */
export class InvalidEnvError extends Error {
  override readonly name = "InvalidEnvError";
}

/**
 * Lê e valida as variáveis do servidor. `DB_PATH` relativo é resolvido a partir de `baseDir`
 * (o `server.ts` passa a raiz do repo, onde `data/*.sqlite*` está no `.gitignore`).
 */
export function loadEnv(env: NodeJS.ProcessEnv, baseDir: string): ServerEnv {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    const msgs = parsed.error.issues.map((i) => `- ${i.message}`).join("\n");
    throw new InvalidEnvError(`Configuração inválida da rest-api:\n${msgs}`);
  }

  const { DB_PATH, JWT_SECRET, PORT } = parsed.data;
  const dbPath = DB_PATH === ":memory:" ? DB_PATH : path.resolve(baseDir, DB_PATH);
  return { dbPath, jwtSecret: JWT_SECRET, port: PORT };
}

/** Cria a pasta do arquivo SQLite se ainda não existir. */
export function ensureDbDir(dbPath: string): void {
  if (dbPath === ":memory:") return;
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

import path from "node:path";
import { serve } from "@hono/node-server";
import { createDb, seedDefaultFoods } from "@kcal/db";
import { config } from "dotenv";
import { createApp } from "./app";
import { ensureDbDir, InvalidEnvError, loadEnv } from "./env";
import { createVoiceProviders } from "./voice-providers";

// Raiz do repo: tanto `src/` (dev) quanto `dist/` (build) ficam em packages/rest-api/<pasta>.
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");

// O `.env` fica na raiz do repo (ao lado do `.env.example`). Não sobrescreve variáveis já
// definidas no ambiente.
config({ path: path.join(REPO_ROOT, ".env"), quiet: true });

function main(): void {
  let env: ReturnType<typeof loadEnv>;
  try {
    env = loadEnv(process.env, REPO_ROOT);
  } catch (err) {
    if (err instanceof InvalidEnvError) {
      console.error(err.message);
      process.exit(1);
    }
    throw err;
  }

  ensureDbDir(env.dbPath);
  const handle = createDb({ path: env.dbPath });
  // Idempotente: só insere os alimentos padrão que ainda não estão no banco.
  const seed = seedDefaultFoods(handle.db);
  console.log(`alimentos padrão: ${seed.inserted} inseridos`);
  const voice = createVoiceProviders(env);
  const app = createApp({ db: handle.db, jwtSecret: env.jwtSecret, voice });

  const server = serve({ fetch: app.fetch, port: env.port }, (info) => {
    console.log(`rest-api ouvindo em http://localhost:${info.port}`);
  });

  const shutdown = () => {
    server.close(() => {
      handle.close();
      process.exit(0);
    });
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main();

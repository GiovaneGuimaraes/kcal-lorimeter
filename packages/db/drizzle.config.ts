import { defineConfig } from "drizzle-kit";

// Só gera SQL a partir do schema (`pnpm --filter @kcal/db db:generate`); não conecta em banco.
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/schema.ts",
  out: "./migrations",
});

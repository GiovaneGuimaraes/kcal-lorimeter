import fs from "node:fs";
import path from "node:path";
import { config } from "dotenv";
import { createDb } from "../create-db";
import { seedDefaultFoods } from "./default-foods";

// `.env` na raiz do monorepo; `pnpm --filter` roda com cwd em packages/db.
config({ path: path.resolve(__dirname, "../../../../.env"), quiet: true });

const dbPath = process.env.DB_PATH || "data/kcal.sqlite";
if (dbPath !== ":memory:") fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });

const { db, close } = createDb({ path: dbPath });
try {
  const { inserted, skipped } = seedDefaultFoods(db);
  console.log(
    `Seed de alimentos padrão em ${dbPath}: ${inserted} inseridos, ${skipped} já existiam.`,
  );
} finally {
  close();
}

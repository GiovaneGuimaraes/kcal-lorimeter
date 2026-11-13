import path from "node:path";
import Database from "better-sqlite3";
import { type BetterSQLite3Database, drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";

export type Db = BetterSQLite3Database<typeof schema>;

export interface CreateDbOptions {
  /** Caminho do arquivo SQLite, ou `":memory:"` para um banco em memória (testes). */
  path: string;
}

export interface DbHandle {
  /** Cliente Drizzle tipado com o schema. É isto que os cores recebem. */
  db: Db;
  /** Conexão `better-sqlite3` crua (pragmas, transações manuais, diagnóstico). */
  sqlite: Database.Database;
  close(): void;
}

/**
 * Pasta das migrações geradas pelo drizzle-kit, na raiz do package. Funciona tanto rodando de
 * `src/` (testes, condição "source") quanto de `dist/` (build), pois ambos estão um nível abaixo.
 */
export const MIGRATIONS_FOLDER = path.join(__dirname, "..", "migrations");

/** Abre (ou cria) o banco, liga as foreign keys e aplica as migrações pendentes. */
export function createDb({ path: dbPath }: CreateDbOptions): DbHandle {
  const sqlite = new Database(dbPath);
  // SQLite não aplica foreign keys por padrão; é por conexão.
  sqlite.pragma("foreign_keys = ON");
  if (dbPath !== ":memory:") sqlite.pragma("journal_mode = WAL");

  const db = drizzle(sqlite, { schema });
  try {
    migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  } catch (err) {
    sqlite.close();
    throw err;
  }

  return { db, sqlite, close: () => sqlite.close() };
}

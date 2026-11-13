import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ensureDbDir, InvalidEnvError, loadEnv } from "../src/env";

const SECRET = "segredo-de-teste-com-mais-de-32-caracteres";
const BASE = path.resolve("/repo");

describe("loadEnv", () => {
  it("aplica defaults: DB_PATH data/kcal.sqlite (relativo à base) e PORT 3000", () => {
    expect(loadEnv({ JWT_SECRET: SECRET }, BASE)).toEqual({
      dbPath: path.join(BASE, "data", "kcal.sqlite"),
      jwtSecret: SECRET,
      port: 3000,
    });
  });

  it("variáveis vazias contam como ausentes", () => {
    expect(loadEnv({ JWT_SECRET: SECRET, DB_PATH: "", PORT: " " }, BASE)).toMatchObject({
      dbPath: path.join(BASE, "data", "kcal.sqlite"),
      port: 3000,
    });
  });

  it("lê DB_PATH e PORT; DB_PATH absoluto e :memory: ficam como estão", () => {
    const abs = path.resolve("/outro/lugar/k.sqlite");
    expect(loadEnv({ JWT_SECRET: SECRET, DB_PATH: abs, PORT: "8080" }, BASE)).toEqual({
      dbPath: abs,
      jwtSecret: SECRET,
      port: 8080,
    });
    expect(loadEnv({ JWT_SECRET: SECRET, DB_PATH: ":memory:" }, BASE).dbPath).toBe(":memory:");
  });

  it("JWT_SECRET ausente → erro claro", () => {
    expect(() => loadEnv({}, BASE)).toThrow(InvalidEnvError);
    expect(() => loadEnv({}, BASE)).toThrow(/JWT_SECRET não definido/);
  });

  it("JWT_SECRET com menos de 32 caracteres → erro claro", () => {
    expect(() => loadEnv({ JWT_SECRET: "a".repeat(31) }, BASE)).toThrow(
      /JWT_SECRET precisa ter pelo menos 32 caracteres/,
    );
    expect(loadEnv({ JWT_SECRET: "a".repeat(32) }, BASE).jwtSecret).toHaveLength(32);
  });

  it.each([["abc"], ["0"], ["70000"], ["3.5"]])("PORT inválida %j → erro claro", (port) => {
    expect(() => loadEnv({ JWT_SECRET: SECRET, PORT: port }, BASE)).toThrow(
      /PORT deve ser um número inteiro entre 1 e 65535/,
    );
  });
});

describe("ensureDbDir", () => {
  it("cria a pasta do arquivo se faltar", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "kcal-env-"));
    try {
      const dbPath = path.join(tmp, "data", "sub", "kcal.sqlite");
      ensureDbDir(dbPath);
      expect(fs.statSync(path.dirname(dbPath)).isDirectory()).toBe(true);
      ensureDbDir(dbPath); // idempotente
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("não faz nada para :memory:", () => {
    expect(() => ensureDbDir(":memory:")).not.toThrow();
  });
});

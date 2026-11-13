import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { eq, isNull, or } from "drizzle-orm";
import {
  createDb,
  type DbHandle,
  dailyGoals,
  foods,
  MIGRATIONS_FOLDER,
  mealEntries,
  users,
  voiceLogs,
} from "../src";

// Dados inventados; valores nutricionais aqui são só fixtures de teste, não base de alimentos.
describe("createDb", () => {
  let handle: DbHandle;

  beforeEach(() => {
    handle = createDb({ path: ":memory:" });
  });

  afterEach(() => {
    handle.close();
  });

  it("liga foreign keys e aplica as migrações", () => {
    expect(handle.sqlite.pragma("foreign_keys", { simple: true })).toBe(1);
    const tabelas = handle.sqlite
      .prepare("select name from sqlite_master where type = 'table' order by name")
      .all()
      .map((r) => (r as { name: string }).name);
    expect(tabelas).toEqual(
      expect.arrayContaining(["daily_goals", "foods", "meal_entries", "users", "voice_logs"]),
    );
    const indices = handle.sqlite
      .prepare("select name from sqlite_master where type = 'index'")
      .all()
      .map((r) => (r as { name: string }).name);
    expect(indices).toEqual(
      expect.arrayContaining([
        "meal_entries_user_data_idx",
        "foods_user_idx",
        "voice_logs_user_idx",
        "daily_goals_user_vigente_idx",
      ]),
    );
  });

  it("insere user, food padrão, food da pessoa e entry com snapshot, e lê de volta", () => {
    const { db } = handle;

    const [user] = db
      .insert(users)
      .values({ email: "ana@exemplo.test", nome: "Ana", senhaHash: "hash-fake" })
      .returning()
      .all();
    if (!user) throw new Error("user não inserido");
    expect(user.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(user.criadoEm).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    const outro = db
      .insert(users)
      .values({ email: "bia@exemplo.test", nome: "Bia", senhaHash: "hash-fake" })
      .returning()
      .get();

    const padrao = db
      .insert(foods)
      .values({
        nome: "Alimento padrão de teste",
        apelidos: ["teste", "padrão"],
        kcal100g: 100,
        proteina100g: 10,
        carbo100g: 20,
        gordura100g: 1.5,
        porcaoPadraoG: 50,
        nomePorcao: "colher",
        fonte: "fixture de teste",
      })
      .returning()
      .get();
    expect(padrao.userId).toBeNull();
    expect(padrao.apelidos).toEqual(["teste", "padrão"]);

    const daPessoa = db
      .insert(foods)
      .values({
        userId: user.id,
        nome: "Receita da Ana",
        kcal100g: 200,
        proteina100g: 5,
        carbo100g: 30,
        gordura100g: 7,
        fonte: "informado pela pessoa",
      })
      .returning()
      .get();
    expect(daPessoa.apelidos).toEqual([]);
    expect(daPessoa.porcaoPadraoG).toBeNull();

    db.insert(foods)
      .values({
        userId: outro.id,
        nome: "Receita da Bia",
        kcal100g: 1,
        proteina100g: 1,
        carbo100g: 1,
        gordura100g: 1,
        fonte: "informado pela pessoa",
      })
      .run();

    const visiveis = db
      .select()
      .from(foods)
      .where(or(isNull(foods.userId), eq(foods.userId, user.id)))
      .all()
      .map((f) => f.nome)
      .sort();
    expect(visiveis).toEqual(["Alimento padrão de teste", "Receita da Ana"]);

    const log = db
      .insert(voiceLogs)
      .values({ userId: user.id, transcricao: "texto inventado", extracaoJson: { itens: [] } })
      .returning()
      .get();
    expect(log.status).toBe("pendente");
    expect(log.extracaoJson).toEqual({ itens: [] });

    db.insert(mealEntries)
      .values({
        userId: user.id,
        data: "2026-11-12",
        refeicao: "almoço",
        foodId: padrao.id,
        gramas: 150,
        kcal: 150,
        proteinaG: 15,
        carboG: 30,
        gorduraG: 2.25,
        origem: "voz",
        voiceLogId: log.id,
      })
      .run();

    db.insert(dailyGoals)
      .values({
        userId: user.id,
        kcal: 2000,
        proteinaG: 120,
        carboG: 220,
        gorduraG: 60,
        vigenteDesde: "2026-11-01",
      })
      .run();

    // Editar o alimento não reescreve o snapshot do lançamento.
    db.update(foods).set({ kcal100g: 999 }).where(eq(foods.id, padrao.id)).run();

    const entries = db.select().from(mealEntries).where(eq(mealEntries.userId, user.id)).all();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      data: "2026-11-12",
      refeicao: "almoço",
      foodId: padrao.id,
      gramas: 150,
      kcal: 150,
      proteinaG: 15,
      carboG: 30,
      gorduraG: 2.25,
      origem: "voz",
      voiceLogId: log.id,
    });

    const metas = db.select().from(dailyGoals).where(eq(dailyGoals.userId, user.id)).all();
    expect(metas).toHaveLength(1);
    expect(metas[0]?.kcal).toBe(2000);
  });

  it("falha ao inserir entry com FK inválida", () => {
    const { db } = handle;
    const user = db
      .insert(users)
      .values({ email: "ana@exemplo.test", nome: "Ana", senhaHash: "x" })
      .returning()
      .get();

    expect(() =>
      db
        .insert(mealEntries)
        .values({
          userId: user.id,
          data: "2026-11-12",
          refeicao: "jantar",
          foodId: "nao-existe",
          gramas: 100,
          kcal: 0,
          proteinaG: 0,
          carboG: 0,
          gorduraG: 0,
          origem: "manual",
        })
        .run(),
    ).toThrow(/FOREIGN KEY constraint failed/);

    expect(() =>
      db
        .insert(foods)
        .values({
          userId: "usuario-inexistente",
          nome: "x",
          kcal100g: 0,
          proteina100g: 0,
          carbo100g: 0,
          gordura100g: 0,
          fonte: "x",
        })
        .run(),
    ).toThrow(/FOREIGN KEY constraint failed/);
  });

  it("rejeita valores fora do CHECK de status/origem e email duplicado", () => {
    const { sqlite, db } = handle;
    const user = db
      .insert(users)
      .values({ email: "ana@exemplo.test", nome: "Ana", senhaHash: "x" })
      .returning()
      .get();

    expect(() =>
      sqlite
        .prepare(
          "insert into voice_logs (id, user_id, transcricao, status, criado_em) values (?, ?, ?, ?, ?)",
        )
        .run("v1", user.id, "t", "invalido", "2026-11-12T00:00:00.000Z"),
    ).toThrow(/CHECK constraint failed/);

    expect(() =>
      db.insert(users).values({ email: "ana@exemplo.test", nome: "Outra", senhaHash: "x" }).run(),
    ).toThrow(/UNIQUE constraint failed/);
  });

  it("migrações ficam na raiz do package e reabrir arquivo não reaplica", () => {
    expect(fs.existsSync(path.join(MIGRATIONS_FOLDER, "meta", "_journal.json"))).toBe(true);

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kcal-db-"));
    const arquivo = path.join(dir, "teste.sqlite");
    try {
      const a = createDb({ path: arquivo });
      a.db.insert(users).values({ email: "c@exemplo.test", nome: "C", senhaHash: "x" }).run();
      a.close();

      const b = createDb({ path: arquivo });
      expect(b.db.select().from(users).all()).toHaveLength(1);
      b.close();
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

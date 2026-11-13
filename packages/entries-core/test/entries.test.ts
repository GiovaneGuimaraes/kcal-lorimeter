import { type DbHandle, foods, mealEntries, voiceLogs } from "@kcal/db";
import { FoodNotFoundError, updateFood } from "@kcal/foods-core";
import { PortionRequiredError } from "@kcal/nutrition-core";
import type { CreateEntryInput } from "@kcal/shared";
import { eq } from "drizzle-orm";
import { ZodError } from "zod";
import {
  createEntry,
  deleteEntry,
  EntryNotFoundError,
  listEntriesForDate,
  updateEntry,
  VoiceLogNotFoundError,
} from "../src";
import { alimentoDe, padrao, setupDb, voiceLogDe } from "./helpers";

const DIA = "2026-11-12";

// Valores por 100 g do "Arroz branco cozido" no seed (TACO 4ª ed.).
const ARROZ = { kcal: 128, proteinaG: 2.5, carboG: 28.1, gorduraG: 0.2 };

describe("entries-core: lançamentos", () => {
  let handle: DbHandle;
  let ana: string;
  let bruno: string;
  let arroz: string;

  beforeEach(() => {
    ({ handle, ana, bruno } = setupDb());
    arroz = padrao(handle, "Arroz branco cozido");
  });
  afterEach(() => handle.close());

  const lancar = (userId: string, extra: Partial<CreateEntryInput> = {}) =>
    createEntry(handle.db, userId, {
      data: DIA,
      refeicao: "almoco",
      foodId: arroz,
      quantidade: 200,
      unidade: "g",
      ...extra,
    });

  describe("createEntry", () => {
    it("200 g de arroz grava snapshot = 2 × valor por 100 g", () => {
      const e = lancar(ana);
      expect(e.gramas).toBe(200);
      expect(e.kcal).toBeCloseTo(2 * ARROZ.kcal, 10);
      expect(e.proteinaG).toBeCloseTo(2 * ARROZ.proteinaG, 10);
      expect(e.carboG).toBeCloseTo(2 * ARROZ.carboG, 10);
      expect(e.gorduraG).toBeCloseTo(2 * ARROZ.gorduraG, 10);
      expect(e).toMatchObject({
        data: DIA,
        refeicao: "almoco",
        food: { id: arroz, nome: "Arroz branco cozido" },
        origem: "manual",
        voiceLogId: null,
      });

      const row = handle.db.select().from(mealEntries).where(eq(mealEntries.id, e.id)).get();
      expect(row).toMatchObject({ userId: ana, gramas: 200, kcal: e.kcal, carboG: e.carboG });
    });

    it("0 g é aceito pelo nutrition-core, mas o schema exige quantidade > 0", () => {
      expect(() => lancar(ana, { quantidade: 0 })).toThrow(ZodError);
    });

    it("scoop num alimento da pessoa com porção padrão → quantidade × porção", () => {
      const whey = alimentoDe(handle, ana, "Whey inventado", 30);
      const e = lancar(ana, { foodId: whey, quantidade: 2, unidade: "scoop" });
      expect(e.gramas).toBe(60);
      expect(e.kcal).toBeCloseTo(240, 10); // 400 kcal/100 g × 60 g
      expect(e.proteinaG).toBeCloseTo(48, 10);
    });

    it("scoop num alimento padrão sem porção → PortionRequiredError, nada gravado", () => {
      expect(() => lancar(ana, { quantidade: 1, unidade: "scoop" })).toThrow(PortionRequiredError);
      expect(handle.db.select().from(mealEntries).all()).toHaveLength(0);
    });

    it("alimento de outra pessoa → FoodNotFoundError", () => {
      const doBruno = alimentoDe(handle, bruno, "Comida do Bruno");
      expect(() => lancar(ana, { foodId: doBruno })).toThrow(FoodNotFoundError);
      expect(lancar(bruno, { foodId: doBruno }).food.nome).toBe("Comida do Bruno");
    });

    it("alimento inexistente → FoodNotFoundError", () => {
      expect(() => lancar(ana, { foodId: "nao-existe" })).toThrow(FoodNotFoundError);
    });

    it("voiceLogId da própria pessoa grava com origem voz", () => {
      const log = voiceLogDe(handle, ana);
      const e = lancar(ana, { origem: "voz", voiceLogId: log });
      expect(e).toMatchObject({ origem: "voz", voiceLogId: log });
    });

    it("voiceLogId de outra pessoa → VoiceLogNotFoundError", () => {
      const log = voiceLogDe(handle, bruno);
      expect(() => lancar(ana, { origem: "voz", voiceLogId: log })).toThrow(VoiceLogNotFoundError);
    });

    it("voiceLogId com origem manual → ZodError", () => {
      const log = voiceLogDe(handle, ana);
      expect(() => lancar(ana, { voiceLogId: log })).toThrow(ZodError);
      expect(() => lancar(ana, { origem: "manual", voiceLogId: log })).toThrow(ZodError);
    });

    const statusDe = (id: string) =>
      handle.db.select({ s: voiceLogs.status }).from(voiceLogs).where(eq(voiceLogs.id, id)).get()
        ?.s;

    it("voiceLogId com origem texto marca o voice_log como confirmado (idempotente)", () => {
      const log = voiceLogDe(handle, ana);
      expect(statusDe(log)).toBe("pendente");
      lancar(ana, { origem: "texto", voiceLogId: log });
      expect(statusDe(log)).toBe("confirmado");
      lancar(ana, { origem: "texto", voiceLogId: log });
      expect(statusDe(log)).toBe("confirmado");
    });

    it("voice_log descartado → VoiceLogNotFoundError e nenhum lançamento gravado", () => {
      const log = voiceLogDe(handle, ana);
      handle.db.update(voiceLogs).set({ status: "descartado" }).where(eq(voiceLogs.id, log)).run();
      const antes = handle.db.select().from(mealEntries).all().length;
      expect(() => lancar(ana, { origem: "voz", voiceLogId: log })).toThrow(VoiceLogNotFoundError);
      expect(handle.db.select().from(mealEntries).all().length).toBe(antes);
      expect(statusDe(log)).toBe("descartado");
    });

    it.each([
      ["refeição inválida", { refeicao: "ceia" }],
      ["data inexistente", { data: "2026-02-30" }],
      ["quantidade negativa", { quantidade: -1 }],
      ["unidade inválida", { unidade: "kg" }],
    ])("%s → ZodError", (_n, extra) => {
      expect(() => lancar(ana, extra as Partial<CreateEntryInput>)).toThrow(ZodError);
    });
  });

  describe("snapshot", () => {
    it("editar o alimento depois não muda o lançamento", () => {
      const meu = alimentoDe(handle, ana, "Granola inventada");
      const e = lancar(ana, { foodId: meu, quantidade: 50 });
      expect(e.kcal).toBeCloseTo(200, 10);

      updateFood(handle.db, ana, meu, { kcal100g: 999, proteina100g: 1 });

      const [, almoco] = listEntriesForDate(handle.db, ana, DIA);
      expect(almoco?.entradas).toEqual([e]);
    });

    it("mudar a base padrão não muda o lançamento", () => {
      const e = lancar(ana);
      handle.db.update(foods).set({ kcal100g: 1 }).where(eq(foods.id, arroz)).run();
      expect(listEntriesForDate(handle.db, ana, DIA)[1]?.entradas[0]?.kcal).toBe(e.kcal);
    });
  });

  describe("updateEntry", () => {
    it("gramas direto recalcula o snapshot com o alimento atual", () => {
      const meu = alimentoDe(handle, ana, "Granola inventada");
      const e = lancar(ana, { foodId: meu, quantidade: 50 });
      updateFood(handle.db, ana, meu, { kcal100g: 300 });

      const u = updateEntry(handle.db, ana, e.id, { gramas: 100 });
      expect(u.gramas).toBe(100);
      expect(u.kcal).toBeCloseTo(300, 10);
    });

    it("quantidade + unidade resolve de novo em gramas", () => {
      const whey = alimentoDe(handle, ana, "Whey inventado", 30);
      const e = lancar(ana, { foodId: whey, quantidade: 1, unidade: "scoop" });
      const u = updateEntry(handle.db, ana, e.id, { quantidade: 3, unidade: "scoop" });
      expect(u.gramas).toBe(90);
      expect(u.kcal).toBeCloseTo(360, 10);
    });

    it("quantidade com unidade sem porção → PortionRequiredError, nada muda", () => {
      const e = lancar(ana);
      expect(() =>
        updateEntry(handle.db, ana, e.id, { quantidade: 1, unidade: "unidade" }),
      ).toThrow(PortionRequiredError);
      expect(listEntriesForDate(handle.db, ana, DIA)[1]?.entradas[0]).toEqual(e);
    });

    it("mudar só refeição/data mantém o snapshot (não puxa o valor atual do alimento)", () => {
      const meu = alimentoDe(handle, ana, "Granola inventada");
      const e = lancar(ana, { foodId: meu, quantidade: 50 });
      updateFood(handle.db, ana, meu, { kcal100g: 999 });

      const u = updateEntry(handle.db, ana, e.id, { refeicao: "jantar", data: "2026-11-13" });
      expect(u).toEqual({ ...e, refeicao: "jantar", data: "2026-11-13" });
    });

    it("lançamento de outra pessoa → EntryNotFoundError, nada muda", () => {
      const e = lancar(bruno);
      expect(() => updateEntry(handle.db, ana, e.id, { gramas: 1 })).toThrow(EntryNotFoundError);
      expect(listEntriesForDate(handle.db, bruno, DIA)[1]?.entradas[0]).toEqual(e);
    });

    it.each([
      ["vazio", {}],
      ["quantidade sem unidade", { quantidade: 2 }],
      ["unidade sem quantidade", { unidade: "g" }],
      ["gramas e quantidade", { gramas: 10, quantidade: 1, unidade: "g" }],
      ["gramas negativas", { gramas: -5 }],
    ])("patch inválido (%s) → ZodError", (_n, patch) => {
      const e = lancar(ana);
      expect(() => updateEntry(handle.db, ana, e.id, patch as never)).toThrow(ZodError);
    });
  });

  describe("deleteEntry", () => {
    it("apaga o próprio lançamento", () => {
      const e = lancar(ana);
      deleteEntry(handle.db, ana, e.id);
      expect(handle.db.select().from(mealEntries).all()).toHaveLength(0);
    });

    it("lançamento de outra pessoa → EntryNotFoundError, nada apagado", () => {
      const e = lancar(bruno);
      expect(() => deleteEntry(handle.db, ana, e.id)).toThrow(EntryNotFoundError);
      expect(handle.db.select().from(mealEntries).all()).toHaveLength(1);
    });

    it("id inexistente → EntryNotFoundError", () => {
      expect(() => deleteEntry(handle.db, ana, "nao-existe")).toThrow(EntryNotFoundError);
    });
  });
});

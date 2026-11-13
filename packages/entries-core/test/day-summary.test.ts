import type { DbHandle } from "@kcal/db";
import { setGoal } from "@kcal/goals-core";
import { DaySummaryDtoSchema } from "@kcal/shared";
import { createEntry, getDaySummary, listEntriesForDate } from "../src";
import { alimentoDe, padrao, setupDb } from "./helpers";

const DIA = "2026-11-12";
const META = { kcal: 2000, proteinaG: 120, carboG: 220, gorduraG: 60 };

describe("entries-core: dia", () => {
  let handle: DbHandle;
  let ana: string;
  let bruno: string;
  let comida: string;

  beforeEach(() => {
    ({ handle, ana, bruno } = setupDb());
    // 400 kcal, 80 P, 8 C, 6 G por 100 g (inventado).
    comida = alimentoDe(handle, ana, "Comida inventada");
  });
  afterEach(() => handle.close());

  const lancar = (
    userId: string,
    refeicao: "cafe" | "almoco" | "lanche" | "jantar",
    gramas: number,
    data = DIA,
    foodId = comida,
  ) => createEntry(handle.db, userId, { data, refeicao, foodId, quantidade: gramas, unidade: "g" });

  it("dia vazio: as quatro refeições, vazias, na ordem; consumido zero; sem meta → null", () => {
    const s = getDaySummary(handle.db, ana, DIA);
    expect(DaySummaryDtoSchema.parse(s)).toEqual(s);
    expect(s.refeicoes.map((r) => r.refeicao)).toEqual(["cafe", "almoco", "lanche", "jantar"]);
    expect(s.refeicoes.every((r) => r.entradas.length === 0)).toBe(true);
    expect(s.consumido).toEqual({ kcal: 0, proteinaG: 0, carboG: 0, gorduraG: 0 });
    expect(s.meta).toBeNull();
    expect(s.restante).toBeNull();
  });

  it("agrupa por refeição na ordem fixa e, dentro dela, por ordem de criação", () => {
    const j = lancar(ana, "jantar", 10);
    const a1 = lancar(ana, "almoco", 20);
    const c = lancar(ana, "cafe", 30);
    const a2 = lancar(ana, "almoco", 40);

    const grupos = listEntriesForDate(handle.db, ana, DIA);
    expect(grupos.map((g) => g.entradas.map((e) => e.id))).toEqual([
      [c.id],
      [a1.id, a2.id],
      [],
      [j.id],
    ]);
    expect(grupos[1]?.subtotal.kcal).toBeCloseTo(240, 10); // 60 g × 4 kcal/g
    expect(grupos[2]?.subtotal).toEqual({ kcal: 0, proteinaG: 0, carboG: 0, gorduraG: 0 });
  });

  it("soma só o dia e só a pessoa", () => {
    const arroz = padrao(handle, "Arroz branco cozido");
    lancar(ana, "cafe", 100); // 400 kcal
    lancar(ana, "almoco", 50); // 200 kcal
    lancar(ana, "jantar", 100, "2026-11-11"); // outro dia
    lancar(ana, "jantar", 100, "2026-11-13"); // outro dia
    lancar(bruno, "almoco", 100, DIA, arroz); // outra pessoa

    const s = getDaySummary(handle.db, ana, DIA);
    expect(s.consumido.kcal).toBeCloseTo(600, 10);
    expect(s.consumido.proteinaG).toBeCloseTo(120, 10);
    expect(s.consumido.carboG).toBeCloseTo(12, 10);
    expect(s.consumido.gorduraG).toBeCloseTo(9, 10);
    expect(s.refeicoes.flatMap((r) => r.entradas)).toHaveLength(2);

    const doBruno = getDaySummary(handle.db, bruno, DIA);
    expect(doBruno.consumido.kcal).toBeCloseTo(128, 10);
  });

  it("restante = meta vigente − consumido, sem arredondar; negativo quando passa da meta", () => {
    setGoal(handle.db, ana, { ...META, vigenteDesde: "2026-11-01" });
    lancar(ana, "almoco", 100); // 400 kcal, 80 P, 8 C, 6 G
    lancar(ana, "jantar", 100);

    const s = getDaySummary(handle.db, ana, DIA);
    expect(s.meta).toMatchObject({ ...META, vigenteDesde: "2026-11-01" });
    expect(s.restante?.kcal).toBeCloseTo(1200, 10);
    expect(s.restante?.proteinaG).toBeCloseTo(-40, 10);
    expect(s.restante?.carboG).toBeCloseTo(204, 10);
    expect(s.restante?.gorduraG).toBeCloseTo(48, 10);
  });

  it("usa a meta vigente na data do dia, não a de hoje", () => {
    setGoal(handle.db, ana, { ...META, kcal: 1800, vigenteDesde: "2026-01-01" });
    setGoal(handle.db, ana, { ...META, kcal: 2500, vigenteDesde: "2026-11-13" });
    expect(getDaySummary(handle.db, ana, DIA).meta?.kcal).toBe(1800);
    expect(getDaySummary(handle.db, ana, "2025-12-31").restante).toBeNull();
  });

  it("macros saem sem arredondar", () => {
    const arroz = padrao(handle, "Arroz branco cozido"); // 2,5 g P / 100 g
    lancar(ana, "almoco", 33, DIA, arroz);
    const s = getDaySummary(handle.db, ana, DIA);
    expect(s.consumido.proteinaG).toBeCloseTo(0.825, 10);
    expect(s.consumido.kcal).toBeCloseTo(42.24, 10);
  });
});

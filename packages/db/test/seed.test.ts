import { isNull } from "drizzle-orm";
import { createDb, DEFAULT_FOODS, type DbHandle, foods, seedDefaultFoods } from "../src";

describe("seedDefaultFoods", () => {
  let handle: DbHandle;

  beforeEach(() => {
    handle = createDb({ path: ":memory:" });
  });

  afterEach(() => {
    handle.close();
  });

  it("insere ao menos 40 alimentos padrão, sem dono, com fonte e macros não negativos", () => {
    const r = seedDefaultFoods(handle.db);
    const rows = handle.db.select().from(foods).all();

    expect(r).toEqual({ inserted: DEFAULT_FOODS.length, skipped: 0 });
    expect(rows.length).toBeGreaterThanOrEqual(40);
    for (const f of rows) {
      expect(f.userId).toBeNull();
      expect(f.fonte.trim()).not.toBe("");
      for (const v of [f.kcal100g, f.proteina100g, f.carbo100g, f.gordura100g]) {
        expect(v).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("é idempotente: rodar duas vezes mantém a contagem", () => {
    seedDefaultFoods(handle.db);
    const r2 = seedDefaultFoods(handle.db);

    expect(r2).toEqual({ inserted: 0, skipped: DEFAULT_FOODS.length });
    expect(handle.db.select().from(foods).where(isNull(foods.userId)).all()).toHaveLength(
      DEFAULT_FOODS.length,
    );
  });

  it("completa só o que falta", () => {
    seedDefaultFoods(handle.db);
    handle.sqlite.prepare("delete from foods where nome = ?").run("Ovo cozido");

    expect(seedDefaultFoods(handle.db)).toEqual({
      inserted: 1,
      skipped: DEFAULT_FOODS.length - 1,
    });
  });

  it("nomes são únicos e ovo, whey e pão francês têm porção padrão", () => {
    const nomes = DEFAULT_FOODS.map((f) => f.nome);
    expect(new Set(nomes).size).toBe(nomes.length);
    const achar = (n: string) => DEFAULT_FOODS.find((f) => f.nome === n);
    expect(achar("Ovo cozido")).toMatchObject({ porcaoPadraoG: 50, nomePorcao: "unidade" });
    expect(achar("Whey protein")).toMatchObject({ porcaoPadraoG: 30, nomePorcao: "scoop" });
    expect(achar("Pão francês")).toMatchObject({ porcaoPadraoG: 50, nomePorcao: "unidade" });
  });

  it("kcal informada bate com 4P + 4C + 9G (±15 %, ou ±10 kcal em alimento de baixa energia)", () => {
    for (const f of DEFAULT_FOODS) {
      const calculada = 4 * f.proteina100g + 4 * f.carbo100g + 9 * f.gordura100g;
      const desvio = Math.abs(calculada - f.kcal100g);
      // Fibra e água distorcem o percentual em verduras/frutas de poucas kcal.
      const ok = desvio <= 0.15 * f.kcal100g || desvio <= 10;
      expect({ nome: f.nome, ok }).toEqual({ nome: f.nome, ok: true });
    }
  });
});

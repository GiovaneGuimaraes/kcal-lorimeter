import { registerUser } from "@kcal/auth-core";
import { createDb, type DbHandle } from "@kcal/db";
import { getGoalForDate, setGoal } from "../src";

const META = { kcal: 2000, proteinaG: 120, carboG: 220, gorduraG: 60 };

describe("goals-core", () => {
  let handle: DbHandle;
  let ana: string;
  let beto: string;

  beforeEach(async () => {
    handle = createDb({ path: ":memory:" });
    const a = await registerUser(handle.db, {
      email: "ana@exemplo.com",
      nome: "Ana",
      senha: "senha-123-ana",
    });
    const b = await registerUser(handle.db, {
      email: "beto@exemplo.com",
      nome: "Beto",
      senha: "senha-123-beto",
    });
    ana = a.id;
    beto = b.id;
  });
  afterEach(() => handle.close());

  it("sem meta → null", () => {
    expect(getGoalForDate(handle.db, ana, "2026-11-12")).toBeNull();
  });

  it("ontem devolve a antiga, hoje a nova", () => {
    setGoal(handle.db, ana, { ...META, kcal: 1800 }, { hoje: "2026-11-11" });
    setGoal(handle.db, ana, { ...META, kcal: 2200 }, { hoje: "2026-11-12" });

    expect(getGoalForDate(handle.db, ana, "2026-11-11")?.kcal).toBe(1800);
    expect(getGoalForDate(handle.db, ana, "2026-11-12")?.kcal).toBe(2200);
    expect(getGoalForDate(handle.db, ana, "2026-12-01")?.kcal).toBe(2200);
  });

  it("antes da primeira meta → null", () => {
    setGoal(handle.db, ana, META, { hoje: "2026-11-11" });
    expect(getGoalForDate(handle.db, ana, "2026-11-10")).toBeNull();
  });

  it("vigenteDesde explícito vale mais que hoje", () => {
    const g = setGoal(
      handle.db,
      ana,
      { ...META, vigenteDesde: "2026-12-01" },
      { hoje: "2026-11-12" },
    );
    expect(g.vigenteDesde).toBe("2026-12-01");
    expect(getGoalForDate(handle.db, ana, "2026-11-30")).toBeNull();
    expect(getGoalForDate(handle.db, ana, "2026-12-01")?.id).toBe(g.id);
  });

  it("mesmo vigenteDesde: vale a última inserida", () => {
    setGoal(handle.db, ana, { ...META, kcal: 1500 }, { hoje: "2026-11-12" });
    setGoal(handle.db, ana, { ...META, kcal: 1700 }, { hoje: "2026-11-12" });
    expect(getGoalForDate(handle.db, ana, "2026-11-12")?.kcal).toBe(1700);
  });

  it("outro usuário não vê a meta", () => {
    setGoal(handle.db, ana, META, { hoje: "2026-11-12" });
    expect(getGoalForDate(handle.db, beto, "2026-11-12")).toBeNull();
  });

  it("sem `hoje`, usa a data UTC do servidor", () => {
    const g = setGoal(handle.db, ana, META);
    expect(g.vigenteDesde).toBe(new Date().toISOString().slice(0, 10));
  });

  it("não expõe user_id", () => {
    expect(setGoal(handle.db, ana, META)).not.toHaveProperty("userId");
  });
});

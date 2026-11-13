import { foods, mealEntries, seedDefaultFoods, voiceLogs } from "@kcal/db";
import { AuthResponseSchema, EntryDtoSchema, FoodDtoSchema } from "@kcal/shared";
import { and, eq, isNull } from "drizzle-orm";
import { ANA, makeTestApp, postJson, type TestApp } from "./helpers";

/** Outra pessoa inventada. */
const BRUNO = { email: "bruno@exemplo.com", nome: "Bruno Teste", senha: "senha-do-bruno-123" };

const DIA = "2026-11-12";
// Valores por 100 g do "Arroz branco cozido" no seed (TACO 4ª ed.).
const ARROZ = { kcal: 128, proteinaG: 2.5, carboG: 28.1, gorduraG: 0.2 };

describe("/entries", () => {
  let t: TestApp;
  let ana: { token: string; id: string };
  let bruno: { token: string; id: string };
  let arroz: string;

  beforeEach(async () => {
    t = makeTestApp();
    seedDefaultFoods(t.handle.db);
    const registrar = async (pessoa: typeof ANA) => {
      const r = AuthResponseSchema.parse(
        await (await postJson(t.app, "/auth/register", pessoa)).json(),
      );
      return { token: r.token, id: r.user.id };
    };
    ana = await registrar(ANA);
    bruno = await registrar(BRUNO);
    const row = t.handle.db
      .select({ id: foods.id })
      .from(foods)
      .where(and(eq(foods.nome, "Arroz branco cozido"), isNull(foods.userId)))
      .get();
    if (!row) throw new Error("seed sem arroz");
    arroz = row.id;
  });
  afterEach(() => t.handle.close());

  const send = (method: string, path: string, body?: unknown, token: string | null = ana.token) =>
    t.app.request(path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body === undefined
        ? {}
        : { body: typeof body === "string" ? body : JSON.stringify(body) }),
    });

  const lancamento = (extra: Record<string, unknown> = {}) => ({
    data: DIA,
    refeicao: "almoco",
    foodId: arroz,
    quantidade: 200,
    unidade: "g",
    ...extra,
  });

  const criarAlimento = async (token: string, extra: Record<string, unknown> = {}) => {
    const res = await send(
      "POST",
      "/foods",
      {
        nome: "Whey inventado",
        kcal100g: 400,
        proteina100g: 80,
        carbo100g: 8,
        gordura100g: 6,
        ...extra,
      },
      token,
    );
    expect(res.status).toBe(201);
    return FoodDtoSchema.parse(await res.json());
  };

  const erro = async (res: Response) => ((await res.json()) as { erro: string }).erro;

  it("sem token → 401", async () => {
    expect((await send("POST", "/entries", lancamento(), null)).status).toBe(401);
    expect((await send("PATCH", "/entries/x", { gramas: 1 }, null)).status).toBe(401);
    expect((await send("DELETE", "/entries/x", undefined, null)).status).toBe(401);
  });

  it("POST: 200 g de arroz → 201 com snapshot = 2 × valor por 100 g", async () => {
    const res = await send("POST", "/entries", lancamento());
    expect(res.status).toBe(201);
    const e = EntryDtoSchema.parse(await res.json());
    expect(e).toMatchObject({
      data: DIA,
      refeicao: "almoco",
      food: { id: arroz, nome: "Arroz branco cozido" },
      gramas: 200,
      origem: "manual",
      voiceLogId: null,
    });
    expect(e.kcal).toBeCloseTo(2 * ARROZ.kcal, 10);
    expect(e.proteinaG).toBeCloseTo(2 * ARROZ.proteinaG, 10);
    expect(e.carboG).toBeCloseTo(2 * ARROZ.carboG, 10);
    expect(e.gorduraG).toBeCloseTo(2 * ARROZ.gorduraG, 10);
  });

  it("editar o alimento depois não muda o lançamento", async () => {
    const meu = await criarAlimento(ana.token);
    const e = EntryDtoSchema.parse(
      await (await send("POST", "/entries", lancamento({ foodId: meu.id, quantidade: 50 }))).json(),
    );
    expect(e.kcal).toBeCloseTo(200, 10);

    expect((await send("PATCH", `/foods/${meu.id}`, { kcal100g: 999 })).status).toBe(200);

    const dia = (await (await send("GET", `/days/${DIA}`)).json()) as {
      refeicoes: { entradas: unknown[] }[];
    };
    expect(dia.refeicoes[1]?.entradas).toEqual([e]);
  });

  it("scoop num alimento da pessoa com porção → gramas = quantidade × porção", async () => {
    const whey = await criarAlimento(ana.token, { porcaoPadraoG: 30, nomePorcao: "scoop" });
    const res = await send(
      "POST",
      "/entries",
      lancamento({ foodId: whey.id, quantidade: 2, unidade: "scoop" }),
    );
    expect(res.status).toBe(201);
    const e = EntryDtoSchema.parse(await res.json());
    expect(e.gramas).toBe(60);
    expect(e.kcal).toBeCloseTo(240, 10);
  });

  it("scoop num alimento sem porção → 400 em pt-BR, nada gravado", async () => {
    const res = await send("POST", "/entries", lancamento({ quantidade: 1, unidade: "scoop" }));
    expect(res.status).toBe(400);
    expect(await erro(res)).toBe(
      'Este alimento não tem porção padrão para "scoop": informe a quantidade em gramas',
    );
    expect(t.handle.db.select().from(mealEntries).all()).toHaveLength(0);
  });

  it("alimento de outra pessoa → 404", async () => {
    const doBruno = await criarAlimento(bruno.token);
    const res = await send("POST", "/entries", lancamento({ foodId: doBruno.id }));
    expect(res.status).toBe(404);
    expect(await erro(res)).toBe("Alimento não encontrado");
  });

  it("alimento inexistente → 404", async () => {
    expect((await send("POST", "/entries", lancamento({ foodId: "nao-existe" }))).status).toBe(404);
  });

  it("voiceLogId: da pessoa → 201 com origem voz; de outra → 404; sem origem voz → 400", async () => {
    const criarLog = (userId: string) =>
      t.handle.db
        .insert(voiceLogs)
        .values({ userId, transcricao: "frase inventada de teste" })
        .returning({ id: voiceLogs.id })
        .get().id;
    const meu = criarLog(ana.id);
    const outro = criarLog(bruno.id);

    const ok = await send("POST", "/entries", lancamento({ origem: "voz", voiceLogId: meu }));
    expect(ok.status).toBe(201);
    expect(await ok.json()).toMatchObject({ origem: "voz", voiceLogId: meu });

    const deOutro = await send(
      "POST",
      "/entries",
      lancamento({ origem: "voz", voiceLogId: outro }),
    );
    expect(deOutro.status).toBe(404);
    expect(await erro(deOutro)).toBe("Registro de voz não encontrado");

    expect((await send("POST", "/entries", lancamento({ voiceLogId: meu }))).status).toBe(400);
  });

  it.each([
    ["refeição inválida", { refeicao: "ceia" }],
    ["data inexistente", { data: "2026-02-30" }],
    ["quantidade zero", { quantidade: 0 }],
    ["quantidade negativa", { quantidade: -10 }],
    ["quantidade texto", { quantidade: "200" }],
    ["unidade inválida", { unidade: "kg" }],
    ["origem inválida", { origem: "foto" }],
    ["sem alimento", { foodId: undefined }],
  ])("POST inválido (%s) → 400 com erro", async (_n, extra) => {
    const res = await send("POST", "/entries", lancamento(extra));
    expect(res.status).toBe(400);
    expect(typeof (await erro(res))).toBe("string");
  });

  it("POST com JSON inválido → 400", async () => {
    expect((await send("POST", "/entries", "{nao é json")).status).toBe(400);
  });

  describe("PATCH /entries/:id", () => {
    const criar = async (token = ana.token) =>
      EntryDtoSchema.parse(await (await send("POST", "/entries", lancamento(), token)).json());

    it("gramas → recalcula o snapshot", async () => {
      const e = await criar();
      const res = await send("PATCH", `/entries/${e.id}`, { gramas: 100 });
      expect(res.status).toBe(200);
      const u = EntryDtoSchema.parse(await res.json());
      expect(u.gramas).toBe(100);
      expect(u.kcal).toBeCloseTo(ARROZ.kcal, 10);
    });

    it("refeição e data mudam; snapshot fica", async () => {
      const e = await criar();
      const res = await send("PATCH", `/entries/${e.id}`, {
        refeicao: "jantar",
        data: "2026-11-13",
      });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ...e, refeicao: "jantar", data: "2026-11-13" });
    });

    it("quantidade + unidade sem porção → 400", async () => {
      const e = await criar();
      const res = await send("PATCH", `/entries/${e.id}`, { quantidade: 1, unidade: "fatia" });
      expect(res.status).toBe(400);
    });

    it("lançamento de outra pessoa → 404", async () => {
      const e = await criar(bruno.token);
      const res = await send("PATCH", `/entries/${e.id}`, { gramas: 1 });
      expect(res.status).toBe(404);
      expect(await erro(res)).toBe("Lançamento não encontrado");
    });

    it.each([
      ["vazio", {}],
      ["quantidade sem unidade", { quantidade: 2 }],
      ["gramas e quantidade", { gramas: 10, quantidade: 1, unidade: "g" }],
      ["refeição inválida", { refeicao: "ceia" }],
    ])("patch inválido (%s) → 400", async (_n, body) => {
      const e = await criar();
      expect((await send("PATCH", `/entries/${e.id}`, body)).status).toBe(400);
    });
  });

  describe("DELETE /entries/:id", () => {
    it("apaga o próprio → 204; de novo → 404", async () => {
      const e = EntryDtoSchema.parse(await (await send("POST", "/entries", lancamento())).json());
      const res = await send("DELETE", `/entries/${e.id}`);
      expect(res.status).toBe(204);
      expect((await send("DELETE", `/entries/${e.id}`)).status).toBe(404);
    });

    it("lançamento de outra pessoa → 404, nada apagado", async () => {
      const e = EntryDtoSchema.parse(
        await (await send("POST", "/entries", lancamento(), bruno.token)).json(),
      );
      const res = await send("DELETE", `/entries/${e.id}`);
      expect(res.status).toBe(404);
      expect(await erro(res)).toBe("Lançamento não encontrado");
      expect(t.handle.db.select().from(mealEntries).all()).toHaveLength(1);
    });
  });
});

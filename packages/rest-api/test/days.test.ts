import { seedDefaultFoods } from "@kcal/db";
import { AuthResponseSchema, DaySummaryDtoSchema, FoodDtoSchema } from "@kcal/shared";
import { ANA, makeTestApp, postJson, type TestApp } from "./helpers";

/** Outra pessoa inventada. */
const BRUNO = { email: "bruno@exemplo.com", nome: "Bruno Teste", senha: "senha-do-bruno-123" };

const DIA = "2026-11-12";
const META = { kcal: 2000, proteinaG: 120, carboG: 220, gorduraG: 60 };

describe("/days", () => {
  let t: TestApp;
  let tokenAna: string;
  let tokenBruno: string;
  let comidaAna: string;
  let comidaBruno: string;

  const send = (method: string, path: string, body: unknown, token: string) =>
    t.app.request(path, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
  const get = (path: string, token: string | null = tokenAna) =>
    t.app.request(path, token ? { headers: { Authorization: `Bearer ${token}` } } : {});

  /** Alimento inventado: 400 kcal, 80 P, 8 C, 6 G por 100 g. */
  const criarAlimento = async (token: string) =>
    FoodDtoSchema.parse(
      await (
        await send(
          "POST",
          "/foods",
          {
            nome: "Comida inventada",
            kcal100g: 400,
            proteina100g: 80,
            carbo100g: 8,
            gordura100g: 6,
          },
          token,
        )
      ).json(),
    ).id;

  const lancar = async (
    token: string,
    foodId: string,
    refeicao: string,
    quantidade: number,
    data = DIA,
  ) => {
    const res = await send(
      "POST",
      "/entries",
      { data, refeicao, foodId, quantidade, unidade: "g" },
      token,
    );
    expect(res.status).toBe(201);
  };

  beforeEach(async () => {
    t = makeTestApp();
    seedDefaultFoods(t.handle.db);
    const registrar = async (pessoa: typeof ANA) =>
      AuthResponseSchema.parse(await (await postJson(t.app, "/auth/register", pessoa)).json())
        .token;
    tokenAna = await registrar(ANA);
    tokenBruno = await registrar(BRUNO);
    comidaAna = await criarAlimento(tokenAna);
    comidaBruno = await criarAlimento(tokenBruno);
  });
  afterEach(() => t.handle.close());

  it("sem token → 401", async () => {
    expect((await get(`/days/${DIA}`, null)).status).toBe(401);
  });

  it.each(["ontem", "2026-02-30", "12-11-2026"])("data inválida (%s) → 400", async (data) => {
    const res = await get(`/days/${data}`);
    expect(res.status).toBe(400);
    expect(((await res.json()) as { erro: string }).erro).toBe("Data inválida (use AAAA-MM-DD)");
  });

  it("dia vazio sem meta: quatro refeições vazias, consumido zero, meta e restante null", async () => {
    const res = await get(`/days/${DIA}`);
    expect(res.status).toBe(200);
    const s = DaySummaryDtoSchema.parse(await res.json());
    expect(s).toEqual({
      data: DIA,
      consumido: { kcal: 0, proteinaG: 0, carboG: 0, gorduraG: 0 },
      meta: null,
      restante: null,
      refeicoes: ["cafe", "almoco", "lanche", "jantar"].map((refeicao) => ({
        refeicao,
        entradas: [],
        subtotal: { kcal: 0, proteinaG: 0, carboG: 0, gorduraG: 0 },
      })),
    });
  });

  it("soma só o dia e a pessoa; restante = meta − consumido", async () => {
    expect(
      (await send("PUT", "/goals", { ...META, vigenteDesde: "2026-11-01" }, tokenAna)).status,
    ).toBe(200);
    await lancar(tokenAna, comidaAna, "cafe", 100); // 400 kcal
    await lancar(tokenAna, comidaAna, "jantar", 50); // 200 kcal
    await lancar(tokenAna, comidaAna, "almoco", 100, "2026-11-11"); // outro dia
    await lancar(tokenBruno, comidaBruno, "almoco", 100); // outra pessoa

    const s = DaySummaryDtoSchema.parse(await (await get(`/days/${DIA}`)).json());
    expect(s.consumido.kcal).toBeCloseTo(600, 10);
    expect(s.consumido.proteinaG).toBeCloseTo(120, 10);
    expect(s.meta).toMatchObject(META);
    expect(s.restante?.kcal).toBeCloseTo(1400, 10);
    expect(s.restante?.proteinaG).toBeCloseTo(0, 10);
    expect(s.restante?.carboG).toBeCloseTo(208, 10);
    expect(s.restante?.gorduraG).toBeCloseTo(51, 10);
    expect(s.refeicoes.map((r) => r.entradas.length)).toEqual([1, 0, 0, 1]);
    expect(s.refeicoes[0]?.subtotal.kcal).toBeCloseTo(400, 10);
    expect(s.refeicoes[0]?.entradas[0]?.food).toEqual({ id: comidaAna, nome: "Comida inventada" });

    const doBruno = DaySummaryDtoSchema.parse(await (await get(`/days/${DIA}`, tokenBruno)).json());
    expect(doBruno.consumido.kcal).toBeCloseTo(400, 10);
    expect(doBruno.meta).toBeNull();
    expect(doBruno.restante).toBeNull();
  });

  it("macros saem sem arredondar no JSON", async () => {
    await lancar(tokenAna, comidaAna, "lanche", 0.3); // 1,2 kcal; 0,24 g P; 0,018 g G
    const s = DaySummaryDtoSchema.parse(await (await get(`/days/${DIA}`)).json());
    expect(s.consumido.kcal).toBeCloseTo(1.2, 10);
    expect(s.consumido.gorduraG).toBeCloseTo(0.018, 10);
  });
});

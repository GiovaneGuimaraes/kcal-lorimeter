import { AuthResponseSchema, GoalDtoSchema } from "@kcal/shared";
import { ANA, makeTestApp, postJson, type TestApp } from "./helpers";

const BETO = { email: "beto@exemplo.com", nome: "Beto Teste", senha: "senha-do-beto-123" };
const META = { kcal: 2000, proteinaG: 120, carboG: 220, gorduraG: 60 };

describe("/goals", () => {
  let t: TestApp;
  let token: string;

  async function registrar(p: typeof ANA): Promise<string> {
    const res = await postJson(t.app, "/auth/register", p);
    return AuthResponseSchema.parse(await res.json()).token;
  }
  const get = (tk: string | null, q = "") =>
    t.app.request(`/goals${q}`, tk ? { headers: { Authorization: `Bearer ${tk}` } } : {});
  const put = (tk: string | null, body: unknown) =>
    t.app.request("/goals", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(tk ? { Authorization: `Bearer ${tk}` } : {}),
      },
      body: JSON.stringify(body),
    });
  const kcalDe = async (res: Response) => ((await res.json()) as { kcal: number }).kcal;

  beforeEach(async () => {
    t = makeTestApp();
    token = await registrar(ANA);
  });
  afterEach(() => t.handle.close());

  it("sem token → 401", async () => {
    expect((await get(null)).status).toBe(401);
    expect((await put(null, META)).status).toBe(401);
  });

  it("sem meta → 404", async () => {
    const res = await get(token);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ erro: "Nenhuma meta cadastrada" });
  });

  it("PUT cria; GET devolve sem user_id", async () => {
    const res = await put(token, { ...META, vigenteDesde: "2026-01-01" });
    expect(res.status).toBe(200);
    const dto = GoalDtoSchema.parse(await res.json());
    expect(dto).toMatchObject({ ...META, vigenteDesde: "2026-01-01" });

    const got = await get(token, "?data=2026-06-01");
    expect(got.status).toBe(200);
    const body = (await got.json()) as Record<string, unknown>;
    expect(body).toEqual(dto);
    expect(body).not.toHaveProperty("userId");
  });

  it("duas metas: antes da nova devolve a antiga; depois, a nova", async () => {
    await put(token, { ...META, kcal: 1800, vigenteDesde: "2026-01-01" });
    await put(token, { ...META, kcal: 2200, vigenteDesde: "2026-03-01" });

    expect(await kcalDe(await get(token, "?data=2026-02-28"))).toBe(1800);
    expect(await kcalDe(await get(token, "?data=2026-03-01"))).toBe(2200);
    expect((await get(token, "?data=2025-12-31")).status).toBe(404);
  });

  it("sem ?data, usa hoje; PUT sem vigenteDesde vale hoje", async () => {
    await put(token, META);
    const res = await get(token);
    expect(res.status).toBe(200);
    expect(((await res.json()) as { vigenteDesde: string }).vigenteDesde).toBe(
      new Date().toISOString().slice(0, 10),
    );
  });

  it("outro usuário não vê a meta", async () => {
    await put(token, META);
    const outro = await registrar(BETO);
    expect((await get(outro)).status).toBe(404);
  });

  it.each([
    ["kcal negativa", { ...META, kcal: -1 }],
    ["kcal acima de 20000", { ...META, kcal: 20001 }],
    ["proteína acima de 2000", { ...META, proteinaG: 2001 }],
    ["valor fracionado", { ...META, carboG: 10.5 }],
    ["campo ausente", { kcal: 2000 }],
    ["tipo errado", { ...META, gorduraG: "60" }],
    ["data inexistente", { ...META, vigenteDesde: "2026-02-30" }],
    ["data em formato errado", { ...META, vigenteDesde: "12/11/2026" }],
  ])("PUT inválido (%s) → 400", async (_n, body) => {
    const res = await put(token, body);
    expect(res.status).toBe(400);
    expect(typeof ((await res.json()) as { erro: string }).erro).toBe("string");
  });

  it("aceita os limites (0 e máximos)", async () => {
    const res = await put(token, { kcal: 0, proteinaG: 0, carboG: 2000, gorduraG: 2000 });
    expect(res.status).toBe(200);
    expect((await put(token, { ...META, kcal: 20000 })).status).toBe(200);
  });

  it("GET com data inválida → 400", async () => {
    expect((await get(token, "?data=ontem")).status).toBe(400);
    expect((await get(token, "?data=2026-13-01")).status).toBe(400);
  });
});

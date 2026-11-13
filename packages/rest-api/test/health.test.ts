import { HealthResponseSchema } from "@kcal/shared";
import { makeTestApp, type TestApp } from "./helpers";

describe("GET /health", () => {
  let t: TestApp;

  beforeEach(() => {
    t = makeTestApp();
  });

  afterEach(() => {
    t.handle.close();
  });

  it('responde 200 com {"ok":true}', async () => {
    const res = await t.app.request("/health");

    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toEqual({ ok: true });
    expect(HealthResponseSchema.safeParse(body).success).toBe(true);
  });

  it("rota inexistente responde 404 com {erro}", async () => {
    const res = await t.app.request("/nao-existe");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ erro: "Rota não encontrada" });
  });
});

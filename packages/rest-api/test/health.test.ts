import { HealthResponseSchema } from "@kcal/shared";
import { app } from "../src/app";

describe("GET /health", () => {
  it('responde 200 com {"ok":true}', async () => {
    const res = await app.request("/health");

    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toEqual({ ok: true });
    expect(HealthResponseSchema.safeParse(body).success).toBe(true);
  });
});

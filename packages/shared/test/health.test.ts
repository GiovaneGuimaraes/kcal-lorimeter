import { HealthResponseSchema } from "../src";

describe("HealthResponseSchema", () => {
  it("aceita { ok: true }", () => {
    expect(HealthResponseSchema.parse({ ok: true })).toEqual({ ok: true });
  });

  it.each([[{ ok: false }], [{}], [{ ok: "true" }], [null]])("rejeita %j", (input) => {
    expect(HealthResponseSchema.safeParse(input).success).toBe(false);
  });
});

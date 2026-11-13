import { MacrosSchema, QuantityUnitSchema } from "../src";

describe("MacrosSchema", () => {
  it("aceita os quatro macros numéricos", () => {
    const m = { kcal: 128, proteinaG: 2.5, carboG: 28.1, gorduraG: 0.2 };
    expect(MacrosSchema.parse(m)).toEqual(m);
  });

  it.each([
    [{ kcal: 1, proteinaG: 1, carboG: 1 }],
    [{ kcal: "1", proteinaG: 1, carboG: 1, gorduraG: 1 }],
    [null],
  ])("rejeita %j", (input) => {
    expect(MacrosSchema.safeParse(input).success).toBe(false);
  });
});

describe("QuantityUnitSchema", () => {
  it.each(["g", "ml", "unidade", "scoop", "fatia", "colher", "xicara", "concha"])(
    "aceita %s",
    (u) => {
      expect(QuantityUnitSchema.parse(u)).toBe(u);
    },
  );

  it("rejeita unidade desconhecida", () => {
    expect(QuantityUnitSchema.safeParse("kg").success).toBe(false);
  });
});

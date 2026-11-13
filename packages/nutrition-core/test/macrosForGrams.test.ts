import { gramsFromQuantity, InvalidQuantityError, macrosForGrams } from "../src";
import { arroz, whey } from "./fixtures";

describe("macrosForGrams", () => {
  it("0 g → macros zero", () => {
    expect(macrosForGrams(arroz, 0)).toEqual({ kcal: 0, proteinaG: 0, carboG: 0, gorduraG: 0 });
  });

  it("100 g = valor do alimento", () => {
    expect(macrosForGrams(arroz, 100)).toEqual({
      kcal: 128,
      proteinaG: 2.5,
      carboG: 28.1,
      gorduraG: 0.2,
    });
  });

  it("escala linearmente sem arredondar (150 g de arroz)", () => {
    const m = macrosForGrams(arroz, 150);
    expect(m.kcal).toBeCloseTo(192, 10);
    expect(m.proteinaG).toBeCloseTo(3.75, 10);
    expect(m.carboG).toBeCloseTo(42.15, 10);
    expect(m.gorduraG).toBeCloseTo(0.3, 10);
  });

  it("não arredonda: 33 g de arroz mantém casas decimais", () => {
    const m = macrosForGrams(arroz, 33);
    expect(m.kcal).toBeCloseTo(42.24, 10);
    expect(m.proteinaG).toBeCloseTo(0.825, 10);
  });

  it("porção padrão: whey 1 scoop (30 g)", () => {
    const m = macrosForGrams(whey, gramsFromQuantity(whey, 1, "scoop"));
    expect(m).toEqual({ kcal: 120, proteinaG: 24, carboG: 3, gorduraG: 1.5 });
  });

  it("ignora campos de porção no resultado", () => {
    expect(Object.keys(macrosForGrams(whey, 10)).sort()).toEqual([
      "carboG",
      "gorduraG",
      "kcal",
      "proteinaG",
    ]);
  });

  it.each([-5, Number.NaN, Number.POSITIVE_INFINITY])(
    "gramas %p lança InvalidQuantityError",
    (g) => {
      expect(() => macrosForGrams(arroz, g)).toThrow(InvalidQuantityError);
    },
  );
});

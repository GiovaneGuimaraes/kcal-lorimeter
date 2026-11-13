import { formatMacros, macrosForGrams, roundHalfUp, sumMacros } from "../src";
import { arroz } from "./fixtures";

describe("roundHalfUp", () => {
  it.each([
    // [valor, casas, esperado]
    [0.05, 1, 0.1],
    [0.04, 1, 0],
    [0.15, 1, 0.2],
    [1.15, 1, 1.2], // 1.15 * 10 = 11.499999999999998 em ponto flutuante
    [1.25, 1, 1.3],
    [2.45, 1, 2.5],
    [42.15, 1, 42.2],
    [1.005, 2, 1.01], // 1.005 * 100 = 100.49999999999999
    [0.5, 0, 1],
    [1.5, 0, 2],
    [2.5, 0, 3],
    [191.5, 0, 192],
    [191.49, 0, 191],
    [-0.5, 0, -1], // Math.round(-0.5) daria -0
    [-0.05, 1, -0.1],
    [-1.15, 1, -1.2],
    [0, 1, 0],
    [1e-7, 1, 0],
  ])("roundHalfUp(%p, %p) = %p", (valor, casas, esperado) => {
    expect(roundHalfUp(valor, casas)).toBe(esperado);
  });

  it("nunca devolve -0", () => {
    expect(Object.is(roundHalfUp(-0.04, 1), 0)).toBe(true);
    expect(Object.is(roundHalfUp(-0, 0), 0)).toBe(true);
  });
});

describe("formatMacros", () => {
  it("kcal inteiro, gramas com 1 casa", () => {
    expect(formatMacros({ kcal: 42.24, proteinaG: 0.825, carboG: 9.273, gorduraG: 0.066 })).toEqual(
      { kcal: 42, proteinaG: 0.8, carboG: 9.3, gorduraG: 0.1 },
    );
  });

  it("arredondamento 0.05 → 0.1 na exibição", () => {
    expect(formatMacros({ kcal: 0.5, proteinaG: 0.05, carboG: 0.05, gorduraG: 0.05 })).toEqual({
      kcal: 1,
      proteinaG: 0.1,
      carboG: 0.1,
      gorduraG: 0.1,
    });
  });

  it("zeros continuam zeros", () => {
    expect(formatMacros(sumMacros([]))).toEqual({ kcal: 0, proteinaG: 0, carboG: 0, gorduraG: 0 });
  });

  it("arredonda só no fim: somar antes de arredondar difere de somar arredondados", () => {
    // 3 × 0.04 g = 0.12 → 0.1; arredondando cada parcela antes daria 0 + 0 + 0 = 0.
    const parcela = { kcal: 0.4, proteinaG: 0.04, carboG: 0, gorduraG: 0 };
    const total = formatMacros(sumMacros([parcela, parcela, parcela]));
    expect(total.proteinaG).toBe(0.1);
    expect(total.kcal).toBe(1);
  });

  it("150 g de arroz para exibição", () => {
    expect(formatMacros(macrosForGrams(arroz, 150))).toEqual({
      kcal: 192,
      proteinaG: 3.8,
      carboG: 42.2,
      gorduraG: 0.3,
    });
  });

  it("não muta a entrada", () => {
    const m = { kcal: 1.6, proteinaG: 1.66, carboG: 0, gorduraG: 0 };
    formatMacros(m);
    expect(m).toEqual({ kcal: 1.6, proteinaG: 1.66, carboG: 0, gorduraG: 0 });
  });
});

import { macrosForGrams, sumMacros } from "../src";
import { arroz, whey } from "./fixtures";

describe("sumMacros", () => {
  it("lista vazia → zeros", () => {
    expect(sumMacros([])).toEqual({ kcal: 0, proteinaG: 0, carboG: 0, gorduraG: 0 });
  });

  it("um item → o próprio item", () => {
    const m = { kcal: 1, proteinaG: 2, carboG: 3, gorduraG: 4 };
    expect(sumMacros([m])).toEqual(m);
  });

  it("soma campo a campo sem arredondar", () => {
    const total = sumMacros([macrosForGrams(arroz, 150), macrosForGrams(whey, 30)]);
    expect(total.kcal).toBeCloseTo(312, 10);
    expect(total.proteinaG).toBeCloseTo(27.75, 10);
    expect(total.carboG).toBeCloseTo(45.15, 10);
    expect(total.gorduraG).toBeCloseTo(1.8, 10);
  });

  it("não muta a entrada", () => {
    const a = { kcal: 1, proteinaG: 1, carboG: 1, gorduraG: 1 };
    sumMacros([a, a]);
    expect(a).toEqual({ kcal: 1, proteinaG: 1, carboG: 1, gorduraG: 1 });
  });
});

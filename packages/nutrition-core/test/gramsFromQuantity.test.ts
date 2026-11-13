import type { QuantityUnit } from "@kcal/shared";
import { gramsFromQuantity, InvalidQuantityError, PortionRequiredError } from "../src";
import { arroz, whey } from "./fixtures";

describe("gramsFromQuantity", () => {
  it.each<[QuantityUnit, number]>([
    ["g", 150],
    ["ml", 200],
  ])("%s vale 1:1 em gramas, com ou sem porção", (unidade, q) => {
    expect(gramsFromQuantity(arroz, q, unidade)).toBe(q);
    expect(gramsFromQuantity(whey, q, unidade)).toBe(q);
  });

  it("0 g é válido", () => {
    expect(gramsFromQuantity(arroz, 0, "g")).toBe(0);
  });

  it("porção padrão: whey 1 scoop = 30 g", () => {
    expect(gramsFromQuantity(whey, 1, "scoop")).toBe(30);
  });

  it("porção padrão: 1.5 scoop = 45 g e 0 scoop = 0 g", () => {
    expect(gramsFromQuantity(whey, 1.5, "scoop")).toBe(45);
    expect(gramsFromQuantity(whey, 0, "scoop")).toBe(0);
  });

  it.each<QuantityUnit>(["unidade", "scoop", "fatia", "colher", "xicara", "concha"])(
    "%s sem porção padrão lança PortionRequiredError",
    (unidade) => {
      expect(() => gramsFromQuantity(arroz, 1, unidade)).toThrow(PortionRequiredError);
    },
  );

  it.each([null, 0, -10, Number.NaN])("porção padrão %p é tratada como ausente", (porcao) => {
    expect(() => gramsFromQuantity({ porcaoPadraoG: porcao }, 1, "unidade")).toThrow(
      PortionRequiredError,
    );
  });

  it("o erro de porção carrega a unidade", () => {
    try {
      gramsFromQuantity(arroz, 2, "fatia");
      throw new Error("não lançou");
    } catch (e) {
      expect(e).toBeInstanceOf(PortionRequiredError);
      expect((e as PortionRequiredError).unidade).toBe("fatia");
      expect((e as PortionRequiredError).name).toBe("PortionRequiredError");
    }
  });

  it.each([-1, -0.01, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "quantidade %p lança InvalidQuantityError",
    (q) => {
      expect(() => gramsFromQuantity(arroz, q, "g")).toThrow(InvalidQuantityError);
      expect(() => gramsFromQuantity(whey, q, "scoop")).toThrow(InvalidQuantityError);
    },
  );

  it("quantidade negativa é checada antes da porção", () => {
    expect(() => gramsFromQuantity(arroz, -1, "unidade")).toThrow(InvalidQuantityError);
  });
});

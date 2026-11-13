import { ExtractedItemSchema, ExtractionResultSchema } from "../src";

describe("ExtractedItemSchema", () => {
  it("aceita item mínimo e item com refeição", () => {
    expect(
      ExtractedItemSchema.parse({ alimento: "whey", quantidade: 1, unidade: "scoop" }),
    ).toEqual({ alimento: "whey", quantidade: 1, unidade: "scoop" });
    expect(
      ExtractedItemSchema.parse({
        alimento: "arroz branco cozido",
        quantidade: 200,
        unidade: "g",
        refeicao: "almoco",
      }).refeicao,
    ).toBe("almoco");
  });

  it("remove chaves desconhecidas (ex.: kcal)", () => {
    const item = ExtractedItemSchema.parse({
      alimento: "banana",
      quantidade: 1,
      unidade: "unidade",
      kcal: 999,
      proteina_g: 1,
    });
    expect(item).toEqual({ alimento: "banana", quantidade: 1, unidade: "unidade" });
  });

  it.each([
    [{ alimento: "arroz", quantidade: 0, unidade: "g" }],
    [{ alimento: "arroz", quantidade: -5, unidade: "g" }],
    [{ alimento: "", quantidade: 100, unidade: "g" }],
    [{ alimento: "arroz", quantidade: 100, unidade: "kg" }],
    [{ alimento: "arroz", quantidade: 100, unidade: "g", refeicao: "ceia" }],
    [{ alimento: "arroz", quantidade: "100", unidade: "g" }],
  ])("rejeita %j", (input) => {
    expect(ExtractedItemSchema.safeParse(input).success).toBe(false);
  });
});

describe("ExtractionResultSchema", () => {
  it("aceita lista vazia", () => {
    expect(ExtractionResultSchema.parse({ itens: [] })).toEqual({ itens: [] });
  });
});

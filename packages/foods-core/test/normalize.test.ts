import { foodKeys, normalizeFoodText, trigramSimilarity } from "../src";

describe("normalizeFoodText", () => {
  it.each([
    ["Frangô", "frango"],
    // Singular heurístico erra aqui ("frances" → "france"), mas igual dos dois lados da comparação.
    ["  PÃO   Francês ", "pao france"],
    ["Batata-doce", "batata doce"],
    ["açúcar!", "acucar"],
    ["Feijões", "feijao"],
    ["pães", "pao"],
    ["ovos", "ovo"],
    ["Morangos maduros", "morango maduro"],
    ["uvas", "uva"],
    ["mas", "mas"],
    ["Abacaxis", "abacaxi"],
    ["Brócolis", "brocoli"],
    ["Brocolis", "brocoli"],
    ["Fit", "fit"],
    ["Expresss", "expresss"],
    ["Café, 2%", "cafe 2"],
    ["", ""],
    ["  -- ", ""],
  ])("%j → %j", (entrada, esperado) => {
    expect(normalizeFoodText(entrada)).toBe(esperado);
  });

  it("é idempotente", () => {
    // Importa porque as chaves do banco e o texto falado passam pela mesma função.
    for (const s of ["Frangôs grelhados", "pães", "Batata-doce", "brócolis", "Expresss"]) {
      const uma = normalizeFoodText(s);
      expect(normalizeFoodText(uma)).toBe(uma);
    }
  });
});

describe("foodKeys", () => {
  it("normaliza nome e apelidos, sem repetição nem vazios", () => {
    expect(
      foodKeys({ nome: "Feijão carioca", apelidos: ["feijão", "feijao", " ", "Feijões"] }),
    ).toEqual(["feijao carioca", "feijao"]);
  });
});

describe("trigramSimilarity (Dice)", () => {
  it("textos iguais → 1; nada em comum → 0; vazio → 0", () => {
    expect(trigramSimilarity("frango", "frango")).toBe(1);
    expect(trigramSimilarity("xyz", "uva")).toBe(0);
    expect(trigramSimilarity("", "uva")).toBe(0);
    expect(trigramSimilarity("", "")).toBe(0);
  });

  it("é simétrica", () => {
    expect(trigramSimilarity("beterava", "beterraba")).toBe(
      trigramSimilarity("beterraba", "beterava"),
    );
  });

  it("valores conhecidos (Dice de trigramas com padding de 2+1 espaços por palavra)", () => {
    // "ovo" → {"  o"," ov","ovo","vo "}; "ovos" → {"  o"," ov","ovo","vos","os "}: 3 em comum.
    expect(trigramSimilarity("ovo", "ovos")).toBeCloseTo((2 * 3) / (4 + 5), 10);
    expect(trigramSimilarity("lentilia", "lentilha")).toBeCloseTo(0.6667, 4);
    expect(trigramSimilarity("beterava", "beterraba")).toBeCloseTo(0.5263, 4);
    expect(trigramSimilarity("chuxu", "chuchu")).toBe(0.5);
    expect(trigramSimilarity("abobrinha", "abobora")).toBeCloseTo(0.4444, 4);
  });
});

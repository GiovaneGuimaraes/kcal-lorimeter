import { formatGrams, formatKcal, initials, parseNumber } from "../src/ui/format";

describe("formatação", () => {
  it("kcal inteiro e gramas com 1 casa (half-up, vírgula)", () => {
    expect(formatKcal(256.5)).toBe("257");
    expect(formatKcal(0)).toBe("0");
    expect(formatGrams(1.15)).toBe("1,2");
    expect(formatGrams(200)).toBe("200");
    expect(formatGrams(0.04)).toBe("0");
  });

  it("formatKcal: separador de milhar pt-BR, sem Intl", () => {
    expect(formatKcal(1215)).toBe("1.215");
    expect(formatKcal(2000)).toBe("2.000");
    expect(formatKcal(999)).toBe("999");
    expect(formatKcal(1234.6)).toBe("1.235");
    expect(formatKcal(999.5)).toBe("1.000");
    expect(formatKcal(1234567)).toBe("1.234.567");
    expect(formatKcal(-1215)).toBe("-1.215");
  });

  it("initials: até 2 letras (primeira e última palavra), maiúsculas", () => {
    expect(initials("Pessoa Teste")).toBe("PT");
    expect(initials("ana maria de souza")).toBe("AS");
    expect(initials("  Ana  ")).toBe("A");
    expect(initials("élio")).toBe("É");
    expect(initials("   ")).toBe("?");
  });

  it("parseNumber aceita vírgula e trata vazio como NaN", () => {
    expect(parseNumber("150,5")).toBe(150.5);
    expect(parseNumber(" 20 ")).toBe(20);
    expect(parseNumber("")).toBeNaN();
  });
});

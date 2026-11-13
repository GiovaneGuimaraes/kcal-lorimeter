import { addDays, formatDayLabel, mealForHour, todayLocal } from "../src/day/dates";
import { formatGrams, formatKcal, parseNumber } from "../src/ui/format";

describe("datas do painel", () => {
  it("todayLocal usa o fuso do aparelho (componentes locais do Date)", () => {
    // 23:30 local do dia 12: o dia é 12 mesmo que em UTC já seja 13.
    expect(todayLocal(new Date(2026, 10, 12, 23, 30))).toBe("2026-11-12");
    expect(todayLocal(new Date(2026, 0, 5, 0, 1))).toBe("2026-01-05");
  });

  it("addDays atravessa mês, ano e fevereiro bissexto", () => {
    expect(addDays("2026-11-12", -1)).toBe("2026-11-11");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2028-03-01", -1)).toBe("2028-02-29");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(addDays("2025-12-31", 1)).toBe("2026-01-01");
  });

  it("formatDayLabel: Hoje, Ontem, por extenso (com ano se outro ano)", () => {
    expect(formatDayLabel("2026-11-12", "2026-11-12")).toBe("Hoje");
    expect(formatDayLabel("2026-11-11", "2026-11-12")).toBe("Ontem");
    expect(formatDayLabel("2026-11-09", "2026-11-12")).toBe("segunda-feira, 9 de novembro");
    expect(formatDayLabel("2025-12-31", "2026-01-02")).toBe("quarta-feira, 31 de dezembro de 2025");
  });

  it("mealForHour sugere a refeição pela hora", () => {
    expect(mealForHour(7)).toBe("cafe");
    expect(mealForHour(12)).toBe("almoco");
    expect(mealForHour(16)).toBe("lanche");
    expect(mealForHour(20)).toBe("jantar");
  });
});

describe("formatação", () => {
  it("kcal inteiro e gramas com 1 casa (half-up, vírgula)", () => {
    expect(formatKcal(256.5)).toBe("257");
    expect(formatKcal(0)).toBe("0");
    expect(formatGrams(1.15)).toBe("1,2");
    expect(formatGrams(200)).toBe("200");
    expect(formatGrams(0.04)).toBe("0");
  });

  it("parseNumber aceita vírgula e trata vazio como NaN", () => {
    expect(parseNumber("150,5")).toBe(150.5);
    expect(parseNumber(" 20 ")).toBe(20);
    expect(parseNumber("")).toBeNaN();
  });
});

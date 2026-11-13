import {
  addDays,
  formatDayLabel,
  formatDayShortLabel,
  mealForHour,
  todayLocal,
} from "../src/day/dates";

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

  it("formatDayShortLabel: HOJE/ONTEM + dia da semana, dia e mês curtos (ano se outro ano)", () => {
    expect(formatDayShortLabel("2026-11-13", "2026-11-13")).toBe("HOJE · SEX 13 NOV");
    expect(formatDayShortLabel("2026-11-12", "2026-11-13")).toBe("ONTEM · QUI 12 NOV");
    expect(formatDayShortLabel("2026-11-09", "2026-11-13")).toBe("SEG 9 NOV");
    expect(formatDayShortLabel("2026-03-07", "2026-11-13")).toBe("SÁB 7 MAR");
    expect(formatDayShortLabel("2025-12-31", "2026-01-01")).toBe("ONTEM · QUA 31 DEZ 2025");
    expect(formatDayShortLabel("2025-12-28", "2026-01-02")).toBe("DOM 28 DEZ 2025");
  });

  it("mealForHour sugere a refeição pela hora", () => {
    expect(mealForHour(7)).toBe("cafe");
    expect(mealForHour(12)).toBe("almoco");
    expect(mealForHour(16)).toBe("lanche");
    expect(mealForHour(20)).toBe("jantar");
  });
});

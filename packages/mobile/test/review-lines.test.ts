import type { FoodDto } from "@kcal/shared";
import {
  allowedUnits,
  confirmBlockers,
  initialMeal,
  initLines,
  localIsoDate,
  mealForHour,
  parseQuantidade,
  withFood,
} from "../src/voice/review-lines";
import type { PendingReview } from "../src/voice/review-store";

/** Alimentos inventados: números só de teste. */
function food(id: string, porcaoPadraoG: number | null): FoodDto {
  return {
    id,
    nome: id,
    apelidos: [],
    kcal100g: 100,
    proteina100g: 1,
    carbo100g: 1,
    gordura100g: 1,
    porcaoPadraoG,
    nomePorcao: null,
    fonte: "teste",
    isPadrao: false,
  };
}

function review(itens: PendingReview["itens"]): PendingReview {
  return { voiceLogId: "vl", transcricao: "t", itens };
}

describe("mealForHour", () => {
  it.each([
    [0, "cafe"],
    [9, "cafe"],
    [10, "almoco"],
    [14, "almoco"],
    [15, "lanche"],
    [17, "lanche"],
    [18, "jantar"],
    [23, "jantar"],
  ])("%ih → %s", (hora, refeicao) => {
    expect(mealForHour(new Date(2026, 0, 1, hora as number, 30))).toBe(refeicao);
  });
});

describe("initialMeal", () => {
  it("usa a refeição dita pela pessoa, senão a hora", () => {
    const dita = review([
      {
        extraido: { alimento: "a", quantidade: 1, unidade: "g" },
        match: { kind: "none" },
        precisaPeso: false,
      },
      {
        extraido: { alimento: "b", quantidade: 1, unidade: "g", refeicao: "jantar" },
        match: { kind: "none" },
        precisaPeso: false,
      },
    ]);
    expect(initialMeal(dita, new Date(2026, 0, 1, 8))).toBe("jantar");
    expect(initialMeal(review([]), new Date(2026, 0, 1, 8))).toBe("cafe");
  });
});

describe("localIsoDate", () => {
  it("formata a data local com zeros", () => {
    expect(localIsoDate(new Date(2026, 2, 5, 23, 59))).toBe("2026-03-05");
  });
});

describe("parseQuantidade", () => {
  it.each([
    ["200", 200],
    ["1,5", 1.5],
    [" 2.25 ", 2.25],
    ["10000", 10000],
  ])("%s → %d", (texto, n) => {
    expect(parseQuantidade(texto)).toBe(n);
  });

  it.each(["", "0", "-1", "abc", "1,2,3", "10001", "1e3"])("%s é inválida", (texto) => {
    expect(parseQuantidade(texto)).toBeNull();
  });
});

describe("allowedUnits", () => {
  it("só g/ml sem porção; todas com porção", () => {
    expect(allowedUnits(null)).toEqual(["g", "ml"]);
    expect(allowedUnits(food("x", null))).toEqual(["g", "ml"]);
    expect(allowedUnits(food("x", 30))).toContain("scoop");
  });
});

describe("initLines / withFood", () => {
  it("exact com unidade sem porção pede o peso em gramas", () => {
    const [line] = initLines(
      review([
        {
          extraido: { alimento: "whey", quantidade: 1, unidade: "scoop" },
          match: { kind: "exact", food: food("whey", null) },
          precisaPeso: true,
        },
      ]),
    );
    expect(line).toMatchObject({ precisaPeso: true, unidade: "g", quantidade: "" });
  });

  it("exact com porção mantém a unidade falada", () => {
    const [line] = initLines(
      review([
        {
          extraido: { alimento: "ovo", quantidade: 2, unidade: "unidade" },
          match: { kind: "exact", food: food("ovo", 50) },
          gramas: 100,
          precisaPeso: false,
        },
      ]),
    );
    expect(line).toMatchObject({ precisaPeso: false, unidade: "unidade", quantidade: "2" });
  });

  it("candidatos não vêm escolhidos; escolher um sem porção para unidade pede o peso", () => {
    const [line] = initLines(
      review([
        {
          extraido: { alimento: "pão", quantidade: 1.5, unidade: "fatia" },
          match: { kind: "candidates", foods: [food("p1", 25), food("p2", null)] },
          precisaPeso: false,
        },
      ]),
    );
    expect(line?.food).toBeNull();
    expect(line?.quantidade).toBe("1,5");
    if (!line) throw new Error("sem item");
    expect(withFood(line, food("p1", 25))).toMatchObject({ unidade: "fatia", precisaPeso: false });
    expect(withFood(line, food("p2", null))).toMatchObject({
      unidade: "g",
      quantidade: "",
      precisaPeso: true,
    });
  });
});

describe("confirmBlockers", () => {
  const base = initLines(
    review([
      {
        extraido: { alimento: "arroz", quantidade: 100, unidade: "g" },
        match: { kind: "exact", food: food("arroz", null) },
        precisaPeso: false,
      },
      {
        extraido: { alimento: "feijão", quantidade: 100, unidade: "g" },
        match: { kind: "none" },
        precisaPeso: false,
      },
    ]),
  );

  it("aponta o item sem alimento", () => {
    expect(confirmBlockers(base)).toEqual([
      "Item 2 (feijão): escolha, busque ou cadastre o alimento.",
    ]);
  });

  it("item removido não bloqueia; quantidade inválida bloqueia", () => {
    const lines = base.map((l, i) =>
      i === 1 ? { ...l, removido: true } : { ...l, quantidade: "0" },
    );
    expect(confirmBlockers(lines)).toEqual(["Item 1 (arroz): informe uma quantidade válida."]);
  });

  it("tudo removido não deixa confirmar", () => {
    expect(confirmBlockers(base.map((l) => ({ ...l, removido: true })))).toEqual([
      "Nenhum item para salvar.",
    ]);
  });
});

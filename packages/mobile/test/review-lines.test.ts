import { macrosForGrams } from "@kcal/nutrition-core";
import type { FoodDto } from "@kcal/shared";
import {
  allowedUnits,
  confirmBlockers,
  firstPendingIndex,
  formatKcalMilhar,
  initialMeal,
  initLines,
  itemNumber,
  lineMacros,
  localIsoDate,
  mealForHour,
  parseQuantidade,
  reviewTotal,
  unitChoices,
  withFood,
  withQuantidade,
  withUnidade,
} from "../src/voice/review-lines";

// Espião na função real: prova que o app usa a mesma conta do servidor (nada de conta própria).
jest.mock("@kcal/nutrition-core", () => {
  const real = jest.requireActual("@kcal/nutrition-core");
  return { ...real, macrosForGrams: jest.fn(real.macrosForGrams) };
});
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
  it("só g sem porção; g e as de porção com porção; nunca ml", () => {
    expect(allowedUnits(null)).toEqual(["g"]);
    expect(allowedUnits(food("x", null))).toEqual(["g"]);
    expect(allowedUnits(food("x", 30))).toContain("scoop");
    expect(allowedUnits(food("x", 30))).not.toContain("ml");
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

describe("lineMacros / reviewTotal", () => {
  const arroz = food("arroz", null);
  const ovo = food("ovo", 50);
  const MACROS_API = { kcal: 200, proteinaG: 2, carboG: 2, gorduraG: 2 };
  const [arrozLine, ovoLine, nadaLine] = initLines(
    review([
      {
        extraido: { alimento: "arroz", quantidade: 200, unidade: "g" },
        match: { kind: "exact", food: arroz },
        gramas: 200,
        macros: MACROS_API,
        precisaPeso: false,
      },
      {
        extraido: { alimento: "ovo", quantidade: 2, unidade: "unidade" },
        match: { kind: "exact", food: ovo },
        gramas: 100,
        precisaPeso: false,
      },
      {
        extraido: { alimento: "farofa", quantidade: 1, unidade: "colher" },
        match: { kind: "none" },
        precisaPeso: false,
      },
    ]),
  );
  if (!arrozLine || !ovoLine || !nadaLine) throw new Error("sem itens");

  beforeEach(() => jest.mocked(macrosForGrams).mockClear());

  it("sem edição usa os macros da API, sem recalcular", () => {
    expect(lineMacros(arrozLine)).toBe(MACROS_API);
    expect(macrosForGrams).not.toHaveBeenCalled();
  });

  it("depois de editar a quantidade recalcula com gramsFromQuantity + macrosForGrams", () => {
    const editada = withQuantidade(arrozLine, "150,5");
    expect(editada.macrosApi).toBeNull();
    expect(lineMacros(editada)).toEqual({
      kcal: 150.5,
      proteinaG: 1.505,
      carboG: 1.505,
      gorduraG: 1.505,
    });
    expect(macrosForGrams).toHaveBeenCalledWith(
      { kcal: 100, proteinaG: 1, carboG: 1, gorduraG: 1 },
      150.5,
    );
  });

  it("unidade de porção usa a porção do alimento; trocar unidade ou alimento recalcula", () => {
    expect(lineMacros(ovoLine)?.kcal).toBe(100);
    expect(macrosForGrams).toHaveBeenLastCalledWith(expect.anything(), 100);
    expect(lineMacros(withUnidade(ovoLine, "g"))?.kcal).toBe(2);
    expect(withFood(arrozLine, ovo).macrosApi).toBeNull();
  });

  it("sem alimento, quantidade inválida ou unidade sem porção → null", () => {
    expect(lineMacros(nadaLine)).toBeNull();
    expect(lineMacros(withQuantidade(ovoLine, "0"))).toBeNull();
    expect(
      lineMacros({ ...withFood(nadaLine, arroz), unidade: "colher", quantidade: "1" }),
    ).toBeNull();
  });

  it("total soma só os não removidos com macros conhecidos, arredondado", () => {
    const lines = [arrozLine, withQuantidade(ovoLine, "1,5"), nadaLine];
    // 200 (API) + 75 (1,5 × 50 g) = 275; farofa sem alimento fica de fora.
    expect(reviewTotal(lines)).toEqual({ kcal: 275, contados: 2, itens: 3 });
    expect(reviewTotal(lines.map((l, i) => (i === 0 ? { ...l, removido: true } : l)))).toEqual({
      kcal: 75,
      contados: 1,
      itens: 2,
    });
    expect(reviewTotal([withQuantidade(arrozLine, "0,4")])).toEqual({
      kcal: 0,
      contados: 1,
      itens: 1,
    });
  });

  it("primeiro item pendente e número com 2 dígitos", () => {
    expect(firstPendingIndex([arrozLine, ovoLine, nadaLine])).toBe(2);
    expect(firstPendingIndex([arrozLine, { ...nadaLine, removido: true }])).toBe(-1);
    expect(firstPendingIndex([withQuantidade(arrozLine, ""), nadaLine])).toBe(0);
    expect(itemNumber(0)).toBe("01");
    expect(itemNumber(11)).toBe("12");
  });

  it("unitChoices: só g sem porção; g + a unidade de porção falada", () => {
    expect(unitChoices(arrozLine)).toEqual(["g"]);
    expect(unitChoices(ovoLine)).toEqual(["g", "unidade"]);
    expect(unitChoices(withUnidade(ovoLine, "g"))).toEqual(["g", "unidade"]);
    expect(unitChoices({ ...ovoLine, unidade: "scoop" })).toEqual(["g", "scoop"]);
  });
});

describe("formatKcalMilhar", () => {
  it.each([
    [0, "0"],
    [256, "256"],
    [1215, "1.215"],
    [2000, "2.000"],
    [1234567, "1.234.567"],
  ])("%d → %s", (n, texto) => {
    expect(formatKcalMilhar(n)).toBe(texto);
  });
});

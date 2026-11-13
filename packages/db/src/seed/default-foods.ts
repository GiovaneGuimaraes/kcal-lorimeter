import { isNull } from "drizzle-orm";
import type { Db } from "../create-db";
import { foods, type NewFood } from "../schema";

/** Alimento padrão: sem `userId` (visível a todos), macros por 100 g, com fonte. */
export type DefaultFood = Pick<
  NewFood,
  | "nome"
  | "apelidos"
  | "kcal100g"
  | "proteina100g"
  | "carbo100g"
  | "gordura100g"
  | "porcaoPadraoG"
  | "nomePorcao"
  | "fonte"
>;

const taco = (item: string) => `TACO 4ª ed. — ${item}`;
const rotulo = (item: string) => `rótulo médio — ${item}`;

/**
 * Valores por 100 g. Alimentos in natura/preparados: TACO (4ª ed., NEPA/Unicamp), item citado no
 * campo `fonte`. Industrializados: valores típicos de rótulo no Brasil (não é de uma marca só).
 * Porção padrão só quando o peso da unidade é conhecido.
 */
export const DEFAULT_FOODS: readonly DefaultFood[] = [
  // Cereais, tubérculos e leguminosas
  {
    nome: "Arroz branco cozido",
    apelidos: ["arroz", "arroz branco"],
    kcal100g: 128,
    proteina100g: 2.5,
    carbo100g: 28.1,
    gordura100g: 0.2,
    fonte: taco("Arroz, tipo 1, cozido"),
  },
  {
    nome: "Arroz integral cozido",
    apelidos: ["arroz integral"],
    kcal100g: 124,
    proteina100g: 2.6,
    carbo100g: 25.8,
    gordura100g: 1.0,
    fonte: taco("Arroz, integral, cozido"),
  },
  {
    nome: "Feijão carioca cozido",
    apelidos: ["feijão", "feijao", "feijão carioca"],
    kcal100g: 76,
    proteina100g: 4.8,
    carbo100g: 13.6,
    gordura100g: 0.5,
    fonte: taco("Feijão, carioca, cozido"),
  },
  {
    nome: "Feijão preto cozido",
    apelidos: ["feijão preto", "feijao preto"],
    kcal100g: 77,
    proteina100g: 4.5,
    carbo100g: 14.0,
    gordura100g: 0.5,
    fonte: taco("Feijão, preto, cozido"),
  },
  {
    nome: "Lentilha cozida",
    apelidos: ["lentilha"],
    kcal100g: 93,
    proteina100g: 6.3,
    carbo100g: 16.3,
    gordura100g: 0.5,
    fonte: taco("Lentilha, cozida"),
  },
  {
    nome: "Batata inglesa cozida",
    apelidos: ["batata", "batata cozida", "batata inglesa"],
    kcal100g: 52,
    proteina100g: 1.2,
    carbo100g: 11.9,
    gordura100g: 0.0,
    fonte: taco("Batata, inglesa, cozida"),
  },
  {
    nome: "Batata-doce cozida",
    apelidos: ["batata doce", "batata-doce"],
    kcal100g: 77,
    proteina100g: 0.6,
    carbo100g: 18.4,
    gordura100g: 0.1,
    fonte: taco("Batata, doce, cozida"),
  },
  {
    nome: "Mandioca cozida",
    apelidos: ["mandioca", "aipim", "macaxeira"],
    kcal100g: 125,
    proteina100g: 0.6,
    carbo100g: 30.1,
    gordura100g: 0.3,
    fonte: taco("Mandioca, cozida"),
  },
  {
    nome: "Farinha de mandioca torrada",
    apelidos: ["farinha de mandioca", "farinha"],
    kcal100g: 365,
    proteina100g: 1.2,
    carbo100g: 89.2,
    gordura100g: 0.3,
    fonte: taco("Farinha, de mandioca, torrada"),
  },
  {
    nome: "Aveia em flocos",
    apelidos: ["aveia", "flocos de aveia"],
    kcal100g: 394,
    proteina100g: 13.9,
    carbo100g: 66.6,
    gordura100g: 8.5,
    fonte: taco("Aveia, flocos, crua"),
  },
  {
    nome: "Pão francês",
    apelidos: ["pão", "pao", "pãozinho", "pão de sal", "pao frances"],
    kcal100g: 300,
    proteina100g: 8.0,
    carbo100g: 58.6,
    gordura100g: 3.1,
    porcaoPadraoG: 50,
    nomePorcao: "unidade",
    fonte: taco("Pão, trigo, francês"),
  },

  // Carnes e ovos
  {
    nome: "Peito de frango grelhado",
    apelidos: ["frango", "frango grelhado", "peito de frango"],
    kcal100g: 159,
    proteina100g: 32.0,
    carbo100g: 0.0,
    gordura100g: 2.5,
    fonte: taco("Frango, peito, sem pele, grelhado"),
  },
  {
    nome: "Patinho grelhado",
    apelidos: ["carne", "bife", "patinho", "carne bovina"],
    kcal100g: 219,
    proteina100g: 35.9,
    carbo100g: 0.0,
    gordura100g: 7.3,
    fonte: taco("Carne, bovina, patinho, sem gordura, grelhado"),
  },
  {
    nome: "Ovo cozido",
    apelidos: ["ovo", "ovos", "ovo de galinha"],
    kcal100g: 146,
    proteina100g: 13.3,
    carbo100g: 0.6,
    gordura100g: 9.5,
    porcaoPadraoG: 50,
    nomePorcao: "unidade",
    fonte: taco("Ovo, de galinha, inteiro, cozido"),
  },

  // Frutas
  {
    nome: "Banana prata",
    apelidos: ["banana"],
    kcal100g: 98,
    proteina100g: 1.3,
    carbo100g: 26.0,
    gordura100g: 0.1,
    fonte: taco("Banana, prata, crua"),
  },
  {
    nome: "Maçã",
    apelidos: ["maca", "maçã fuji"],
    kcal100g: 56,
    proteina100g: 0.3,
    carbo100g: 15.2,
    gordura100g: 0.4,
    fonte: taco("Maçã, Fuji, com casca, crua"),
  },
  {
    nome: "Laranja",
    apelidos: ["laranja pera", "laranja pêra"],
    kcal100g: 37,
    proteina100g: 1.0,
    carbo100g: 8.9,
    gordura100g: 0.1,
    fonte: taco("Laranja, pêra, crua"),
  },
  {
    nome: "Mamão",
    apelidos: ["mamao", "mamão papaia", "papaia"],
    kcal100g: 40,
    proteina100g: 0.5,
    carbo100g: 10.4,
    gordura100g: 0.1,
    fonte: taco("Mamão, papaia, cru"),
  },
  {
    nome: "Abacate",
    apelidos: ["abacate"],
    kcal100g: 96,
    proteina100g: 1.2,
    carbo100g: 6.0,
    gordura100g: 8.4,
    fonte: taco("Abacate, cru"),
  },
  {
    nome: "Uva",
    apelidos: ["uva itália", "uva italia"],
    kcal100g: 53,
    proteina100g: 0.7,
    carbo100g: 13.6,
    gordura100g: 0.2,
    fonte: taco("Uva, Itália, crua"),
  },
  {
    nome: "Melancia",
    apelidos: ["melancia"],
    kcal100g: 33,
    proteina100g: 0.9,
    carbo100g: 8.1,
    gordura100g: 0.0,
    fonte: taco("Melancia, crua"),
  },
  {
    nome: "Manga",
    apelidos: ["manga tommy"],
    kcal100g: 51,
    proteina100g: 0.9,
    carbo100g: 12.8,
    gordura100g: 0.2,
    fonte: taco("Manga, Tommy Atkins, crua"),
  },
  {
    nome: "Abacaxi",
    apelidos: ["abacaxi"],
    kcal100g: 48,
    proteina100g: 0.9,
    carbo100g: 12.3,
    gordura100g: 0.1,
    fonte: taco("Abacaxi, cru"),
  },
  {
    nome: "Morango",
    apelidos: ["morangos"],
    kcal100g: 30,
    proteina100g: 0.9,
    carbo100g: 6.8,
    gordura100g: 0.3,
    fonte: taco("Morango, cru"),
  },

  // Verduras e legumes
  {
    nome: "Tomate",
    apelidos: ["tomates"],
    kcal100g: 15,
    proteina100g: 1.1,
    carbo100g: 3.1,
    gordura100g: 0.2,
    fonte: taco("Tomate, com semente, cru"),
  },
  {
    nome: "Alface",
    apelidos: ["alface crespa", "salada"],
    kcal100g: 11,
    proteina100g: 1.3,
    carbo100g: 1.7,
    gordura100g: 0.2,
    fonte: taco("Alface, crespa, crua"),
  },
  {
    nome: "Cenoura crua",
    apelidos: ["cenoura"],
    kcal100g: 34,
    proteina100g: 1.3,
    carbo100g: 7.7,
    gordura100g: 0.2,
    fonte: taco("Cenoura, crua"),
  },
  {
    nome: "Brócolis cozido",
    apelidos: ["brócolis", "brocolis"],
    kcal100g: 25,
    proteina100g: 2.1,
    carbo100g: 4.4,
    gordura100g: 0.5,
    fonte: taco("Brócolis, cozido"),
  },
  {
    nome: "Abóbora cozida",
    apelidos: ["abóbora", "abobora", "abóbora cabotiá"],
    kcal100g: 48,
    proteina100g: 1.4,
    carbo100g: 10.8,
    gordura100g: 0.7,
    fonte: taco("Abóbora, cabotian, cozida"),
  },
  {
    nome: "Beterraba cozida",
    apelidos: ["beterraba"],
    kcal100g: 32,
    proteina100g: 1.3,
    carbo100g: 7.2,
    gordura100g: 0.1,
    fonte: taco("Beterraba, cozida"),
  },
  {
    nome: "Chuchu cozido",
    apelidos: ["chuchu"],
    kcal100g: 19,
    proteina100g: 0.4,
    carbo100g: 4.8,
    gordura100g: 0.0,
    fonte: taco("Chuchu, cozido"),
  },

  // Laticínios, gorduras, açúcar e oleaginosas
  {
    nome: "Leite integral",
    apelidos: ["leite", "leite de vaca"],
    kcal100g: 61,
    proteina100g: 2.9,
    carbo100g: 4.3,
    gordura100g: 3.2,
    fonte: taco("Leite, de vaca, integral"),
  },
  {
    nome: "Queijo mussarela",
    apelidos: ["mussarela", "muçarela", "queijo"],
    kcal100g: 330,
    proteina100g: 22.6,
    carbo100g: 3.0,
    gordura100g: 25.2,
    porcaoPadraoG: 20,
    nomePorcao: "fatia",
    fonte: taco("Queijo, mussarela"),
  },
  {
    nome: "Queijo minas frescal",
    apelidos: ["queijo minas", "minas frescal", "queijo branco"],
    kcal100g: 264,
    proteina100g: 17.4,
    carbo100g: 3.2,
    gordura100g: 20.2,
    fonte: taco("Queijo, minas, frescal"),
  },
  {
    nome: "Iogurte natural",
    apelidos: ["iogurte"],
    kcal100g: 51,
    proteina100g: 4.1,
    carbo100g: 1.9,
    gordura100g: 3.0,
    fonte: taco("Iogurte, natural"),
  },
  {
    nome: "Azeite de oliva",
    apelidos: ["azeite"],
    kcal100g: 884,
    proteina100g: 0.0,
    carbo100g: 0.0,
    gordura100g: 100.0,
    fonte: taco("Azeite, de oliva, extra virgem"),
  },
  {
    nome: "Manteiga",
    apelidos: ["manteiga com sal"],
    kcal100g: 726,
    proteina100g: 0.4,
    carbo100g: 0.1,
    gordura100g: 82.4,
    fonte: taco("Manteiga, com sal"),
  },
  {
    nome: "Açúcar",
    apelidos: ["acucar", "açúcar cristal"],
    kcal100g: 387,
    proteina100g: 0.3,
    carbo100g: 99.6,
    gordura100g: 0.0,
    fonte: taco("Açúcar, cristal"),
  },
  {
    nome: "Amendoim torrado",
    apelidos: ["amendoim"],
    kcal100g: 606,
    proteina100g: 22.5,
    carbo100g: 18.7,
    gordura100g: 54.0,
    fonte: taco("Amendoim, torrado, salgado"),
  },

  // Industrializados (rótulo médio)
  {
    nome: "Whey protein",
    apelidos: ["whey", "whey protein", "proteína em pó", "suplemento"],
    kcal100g: 400,
    proteina100g: 80,
    carbo100g: 10,
    gordura100g: 5,
    porcaoPadraoG: 30,
    nomePorcao: "scoop",
    fonte: rotulo("whey protein concentrado, porção de 30 g ≈ 120 kcal, 24 g de proteína"),
  },
  {
    nome: "Pasta de amendoim",
    apelidos: ["pasta de amendoim", "manteiga de amendoim"],
    kcal100g: 600,
    proteina100g: 27,
    carbo100g: 18,
    gordura100g: 50,
    porcaoPadraoG: 15,
    nomePorcao: "colher de sopa",
    fonte: rotulo("pasta de amendoim integral"),
  },
  {
    nome: "Requeijão cremoso",
    apelidos: ["requeijão", "requeijao"],
    kcal100g: 250,
    proteina100g: 8,
    carbo100g: 4,
    gordura100g: 22,
    fonte: rotulo("requeijão cremoso tradicional"),
  },
  {
    nome: "Pão de forma",
    apelidos: ["pão de forma", "pao de forma", "fatia de pão"],
    kcal100g: 260,
    proteina100g: 8,
    carbo100g: 50,
    gordura100g: 3,
    porcaoPadraoG: 25,
    nomePorcao: "fatia",
    fonte: rotulo("pão de forma tradicional"),
  },
  {
    nome: "Biscoito cream cracker",
    apelidos: ["cream cracker", "bolacha", "biscoito salgado"],
    kcal100g: 430,
    proteina100g: 10,
    carbo100g: 70,
    gordura100g: 12,
    fonte: rotulo("biscoito cream cracker"),
  },
  {
    nome: "Granola",
    apelidos: ["granola"],
    kcal100g: 400,
    proteina100g: 9,
    carbo100g: 65,
    gordura100g: 12,
    fonte: rotulo("granola tradicional"),
  },
  {
    nome: "Chocolate ao leite",
    apelidos: ["chocolate"],
    kcal100g: 540,
    proteina100g: 7,
    carbo100g: 58,
    gordura100g: 31,
    fonte: rotulo("chocolate ao leite em barra"),
  },
];

/**
 * Insere os alimentos padrão que ainda não existem (chave natural: `nome` com `user_id` nulo).
 * Idempotente: rodar de novo não duplica nem sobrescreve (alimento já existente fica como está).
 */
export function seedDefaultFoods(db: Db): { inserted: number; skipped: number } {
  return db.transaction((tx) => {
    const existentes = new Set(
      tx
        .select({ nome: foods.nome })
        .from(foods)
        .where(isNull(foods.userId))
        .all()
        .map((r) => r.nome),
    );
    const faltando = DEFAULT_FOODS.filter((f) => !existentes.has(f.nome));
    if (faltando.length > 0) {
      tx.insert(foods)
        .values(faltando.map((f) => ({ ...f, apelidos: [...(f.apelidos ?? [])] })))
        .run();
    }
    return { inserted: faltando.length, skipped: DEFAULT_FOODS.length - faltando.length };
  });
}

import { formatMacros, gramsFromQuantity, macrosForGrams, sumMacros } from "@kcal/nutrition-core";
import {
  type CreateEntryInput,
  type ExtractedItem,
  type FoodDto,
  type Macros,
  MAX_ENTRY_QUANTITY,
  type MealKind,
  QUANTITY_UNITS,
  type QuantityUnit,
} from "@kcal/shared";
import type { PendingReview, ReviewOrigem } from "./review-store";

/**
 * Estado de um item na tela de revisão. Os macros mostrados vêm da API (`item.macros`, calculados
 * pelo servidor) ou, depois que a pessoa edita o item, do `@kcal/nutrition-core` (mesma função do
 * servidor). O snapshot gravado continua sendo o do servidor na confirmação (`POST /entries`).
 */
export type ReviewLine = {
  /** O que a IA entendeu (só para mostrar; não é editado). */
  extraido: ExtractedItem;
  /** Alimento escolhido; `null` enquanto a pessoa não escolheu/cadastrou. */
  food: FoodDto | null;
  /** Alimentos parecidos sugeridos pelo casamento (`candidates`). */
  candidatos: FoodDto[];
  /** Texto do campo de quantidade (aceita vírgula decimal). */
  quantidade: string;
  unidade: QuantityUnit;
  /**
   * Macros que a API mandou para o item (`item.macros`). Valem só para o alimento/quantidade/unidade
   * originais: qualquer edição zera e a tela recalcula com `lineMacros`.
   */
  macrosApi: Macros | null;
  /** A unidade falada exige porção padrão que o alimento não tem: a revisão pede o peso. */
  precisaPeso: boolean;
  removido: boolean;
  /** Já virou lançamento numa tentativa anterior de confirmar: não reenvia. */
  salvo: boolean;
  /** Erro do `POST /entries` deste item (pt-BR, vindo do servidor). */
  erro: string | null;
};

/** Unidades de peso: valem para qualquer alimento (1 ml = 1 g). */
export const WEIGHT_UNITS: readonly QuantityUnit[] = ["g", "ml"];

/** Nomes das unidades para a tela. */
export const UNIT_LABELS: Record<QuantityUnit, string> = {
  g: "g",
  ml: "ml",
  unidade: "unidade",
  scoop: "scoop",
  fatia: "fatia",
  colher: "colher",
  xicara: "xícara",
  concha: "concha",
};

/** Nomes das refeições para a tela. */
export const MEAL_LABELS: Record<MealKind, string> = {
  cafe: "Café",
  almoco: "Almoço",
  lanche: "Lanche",
  jantar: "Jantar",
};

export function unitNeedsPortion(unidade: QuantityUnit): boolean {
  return !WEIGHT_UNITS.includes(unidade);
}

/**
 * Unidades oferecidas para o alimento: `g` sempre; as de porção só com porção cadastrada. Sem
 * `ml` (F-5): não há alimento líquido ainda e o servidor trata ml como grama (1:1).
 */
export function allowedUnits(food: FoodDto | null): QuantityUnit[] {
  const oferecidas = (food?.porcaoPadraoG ? QUANTITY_UNITS : WEIGHT_UNITS).filter(
    (u) => u !== "ml",
  );
  return [...oferecidas];
}

/**
 * Troca o alimento do item. Se a unidade atual exige porção e o novo alimento não tem, a revisão
 * passa a pedir o peso: unidade vira `g` e a quantidade fica vazia (a quantidade falada era em
 * outra unidade, não serve como gramas).
 */
export function withFood(line: ReviewLine, food: FoodDto): ReviewLine {
  const base = { ...line, food, erro: null, macrosApi: null };
  if (unitNeedsPortion(line.unidade) && !food.porcaoPadraoG) {
    return { ...base, unidade: "g", quantidade: "", precisaPeso: true };
  }
  return base;
}

/** Monta os itens da revisão a partir da resposta da API. */
export function initLines(review: PendingReview): ReviewLine[] {
  return review.itens.map((item) => {
    const line: ReviewLine = {
      extraido: item.extraido,
      food: null,
      candidatos: item.match.kind === "candidates" ? item.match.foods : [],
      quantidade: formatNumber(item.extraido.quantidade),
      unidade: item.extraido.unidade,
      macrosApi: null,
      precisaPeso: false,
      removido: false,
      salvo: false,
      erro: null,
    };
    // Só o casamento `exact` já vem escolhido; candidatos exigem a escolha da pessoa.
    if (item.match.kind !== "exact") return line;
    return { ...withFood(line, item.match.food), macrosApi: item.macros ?? null };
  });
}

function formatNumber(n: number): string {
  return String(n).replace(".", ",");
}

/** Quantidade digitada → número (> 0 e ≤ teto da API), aceitando vírgula. `null` se inválida. */
export function parseQuantidade(texto: string): number | null {
  const normalizado = texto.trim().replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(normalizado)) return null;
  const n = Number(normalizado);
  if (!Number.isFinite(n) || n <= 0 || n > MAX_ENTRY_QUANTITY) return null;
  return n;
}

/** Itens que ainda vão ser enviados ao confirmar (nem removidos, nem já salvos). */
export function pendingLines(lines: readonly ReviewLine[]): ReviewLine[] {
  return lines.filter((l) => !l.removido && !l.salvo);
}

/** Rótulo de um item nas mensagens: "Item 2 (arroz)". */
export function lineLabel(line: ReviewLine, index: number): string {
  return `Item ${index + 1} (${line.extraido.alimento})`;
}

/**
 * Por que o botão Confirmar está bloqueado, uma mensagem por item. Lista vazia → pode confirmar.
 */
export function confirmBlockers(lines: readonly ReviewLine[]): string[] {
  const out: string[] = [];
  lines.forEach((line, i) => {
    if (line.removido || line.salvo) return;
    const rotulo = lineLabel(line, i);
    if (!line.food) {
      out.push(`${rotulo}: escolha, busque ou cadastre o alimento.`);
    } else if (parseQuantidade(line.quantidade) === null) {
      out.push(
        line.precisaPeso
          ? `${rotulo}: informe o peso em gramas.`
          : `${rotulo}: informe uma quantidade válida.`,
      );
    }
  });
  if (pendingLines(lines).length === 0 && !lines.some((l) => l.salvo)) {
    out.push("Nenhum item para salvar.");
  }
  return out;
}

/** Refeição pela hora local: < 10h café, < 15h almoço, < 18h lanche, senão jantar. */
export function mealForHour(date: Date): MealKind {
  const h = date.getHours();
  if (h < 10) return "cafe";
  if (h < 15) return "almoco";
  if (h < 18) return "lanche";
  return "jantar";
}

/** Refeição inicial: a que a pessoa disse (primeiro item que tiver), senão pela hora. */
export function initialMeal(review: PendingReview, now: Date): MealKind {
  return review.itens.find((i) => i.extraido.refeicao)?.extraido.refeicao ?? mealForHour(now);
}

/** Data local `YYYY-MM-DD` (não UTC: à noite no Brasil o UTC já é o dia seguinte). */
export function localIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Body do `POST /entries` de um item pronto. `voiceLogId` vai em voz e texto (a API recusa
 * só a origem manual com voiceLogId).
 */
export function entryBody(
  line: ReviewLine,
  ctx: { data: string; refeicao: MealKind; origem: ReviewOrigem; voiceLogId: string },
): CreateEntryInput {
  const quantidade = parseQuantidade(line.quantidade);
  if (!line.food || quantidade === null) throw new Error("Item incompleto não pode ser enviado");
  return {
    data: ctx.data,
    refeicao: ctx.refeicao,
    foodId: line.food.id,
    quantidade,
    unidade: line.unidade,
    origem: ctx.origem,
    voiceLogId: ctx.voiceLogId,
  };
}

/** Muda a quantidade digitada: os macros da API deixam de valer (a tela recalcula). */
export function withQuantidade(line: ReviewLine, quantidade: string): ReviewLine {
  return { ...line, quantidade, erro: null, macrosApi: null };
}

/** Muda a unidade: os macros da API deixam de valer (a tela recalcula). */
export function withUnidade(line: ReviewLine, unidade: QuantityUnit): ReviewLine {
  return { ...line, unidade, erro: null, macrosApi: null };
}

/**
 * Unidades do seletor do item: "g" e, se o alimento tem porção, uma unidade de porção (a falada,
 * se for de porção; senão "unidade"). Todas as unidades de porção valem `quantidade × porção`, então
 * oferecer as seis seria só ruído.
 */
export function unitChoices(line: ReviewLine): QuantityUnit[] {
  if (!line.food?.porcaoPadraoG) return ["g"];
  return ["g", unitNeedsPortion(line.unidade) ? line.unidade : "unidade"];
}

/**
 * Macros do item para exibir, ou `null` se ainda não dá para saber (sem alimento, quantidade
 * inválida ou unidade sem porção). Sem edição, usa os da API; depois de editar, calcula com
 * `gramsFromQuantity` + `macrosForGrams` do `@kcal/nutrition-core` — a mesma conta do servidor,
 * a partir dos valores por 100 g do alimento. Nada de conta própria aqui. Sem arredondar.
 */
export function lineMacros(line: ReviewLine): Macros | null {
  if (line.macrosApi) return line.macrosApi;
  const quantidade = parseQuantidade(line.quantidade);
  if (!line.food || quantidade === null) return null;
  if (unitNeedsPortion(line.unidade) && !line.food.porcaoPadraoG) return null;
  const food = line.food;
  const gramas = gramsFromQuantity(food, quantidade, line.unidade);
  // Só adapta os nomes dos campos (FoodDto → por 100 g), como o `macrosForFood` do voice-core.
  return macrosForGrams(
    {
      kcal: food.kcal100g,
      proteinaG: food.proteina100g,
      carboG: food.carbo100g,
      gorduraG: food.gordura100g,
    },
    gramas,
  );
}

/** O item ainda impede salvar (sem alimento ou quantidade inválida)? Removido/salvo não impede. */
export function isLinePending(line: ReviewLine): boolean {
  if (line.removido || line.salvo) return false;
  return !line.food || parseQuantidade(line.quantidade) === null;
}

/** Índice do primeiro item pendente, ou -1. */
export function firstPendingIndex(lines: readonly ReviewLine[]): number {
  return lines.findIndex(isLinePending);
}

/** Número do item na tela, com 2 dígitos: 0 → "01". */
export function itemNumber(index: number): string {
  return String(index + 1).padStart(2, "0");
}

/**
 * Total da revisão: soma (`sumMacros`) dos itens não removidos com macros conhecidos, já
 * arredondado para exibir (`formatMacros`). `contados` de `itens` entraram na soma; item sem
 * alimento ou sem peso fica de fora (e é pendência).
 */
export function reviewTotal(lines: readonly ReviewLine[]): {
  kcal: number;
  contados: number;
  itens: number;
} {
  const ativos = lines.filter((l) => !l.removido);
  const conhecidos = ativos.map(lineMacros).filter((m): m is Macros => m !== null);
  return {
    kcal: formatMacros(sumMacros(conhecidos)).kcal,
    contados: conhecidos.length,
    itens: ativos.length,
  };
}

/** Kcal inteiro com separador de milhar: `1215` → `"1.215"` (sem `Intl`, que o Hermes não garante). */
export function formatKcalMilhar(kcal: number): string {
  return String(kcal).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

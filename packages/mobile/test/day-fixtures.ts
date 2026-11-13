import type { DaySummaryDto, EntryDto, FoodDto, GoalDto } from "@kcal/shared";
import { jsonResponse } from "./helpers";

/** Dados inventados para o painel (nenhum dado real de pessoa em teste). */
export const GOAL: GoalDto = {
  id: "g1",
  kcal: 2000,
  proteinaG: 120,
  carboG: 250,
  gorduraG: 70,
  vigenteDesde: "2026-01-01",
};

export function entry(over: Partial<EntryDto> & Pick<EntryDto, "id">): EntryDto {
  return {
    data: "2026-11-12",
    refeicao: "almoco",
    food: { id: "f1", nome: "arroz branco cozido" },
    gramas: 200,
    kcal: 256.4,
    proteinaG: 5.04,
    carboG: 56.25,
    gorduraG: 0.45,
    origem: "voz",
    voiceLogId: null,
    ...over,
  };
}

/** Dia com macros "quebrados" para testar o arredondamento só na exibição. */
export function day(data: string, meta: GoalDto | null = GOAL): DaySummaryDto {
  const arroz = entry({ id: "e1", data });
  const ovo = entry({
    id: "e2",
    data,
    refeicao: "cafe",
    food: { id: "f2", nome: "ovo cozido" },
    gramas: 12.34,
    kcal: 19.16,
    proteinaG: 1.6,
    carboG: 0.1,
    gorduraG: 1.3,
  });
  const consumido = { kcal: 1234.6, proteinaG: 50.04, carboG: 120.25, gorduraG: 33.35 };
  return {
    data,
    consumido,
    meta,
    restante: meta
      ? {
          kcal: meta.kcal - consumido.kcal,
          proteinaG: meta.proteinaG - consumido.proteinaG,
          carboG: meta.carboG - consumido.carboG,
          gorduraG: meta.gorduraG - consumido.gorduraG,
        }
      : null,
    refeicoes: [
      { refeicao: "cafe", entradas: [ovo], subtotal: ovo },
      { refeicao: "almoco", entradas: [arroz], subtotal: arroz },
      { refeicao: "lanche", entradas: [], subtotal: zero() },
      { refeicao: "jantar", entradas: [], subtotal: zero() },
    ],
  };
}

function zero() {
  return { kcal: 0, proteinaG: 0, carboG: 0, gorduraG: 0 };
}

export const FOOD: FoodDto = {
  id: "f1",
  nome: "arroz branco cozido",
  apelidos: ["arroz"],
  kcal100g: 128.2,
  proteina100g: 2.5,
  carbo100g: 28.1,
  gordura100g: 0.2,
  porcaoPadraoG: null,
  nomePorcao: null,
  fonte: "teste (valor inventado)",
  isPadrao: true,
};

/**
 * `fetch` que responde `GET /days/:data` com `day(data)` e delega o resto a `outras`
 * (sem `outras`, 204 vazio).
 */
export function dayFetch(
  fetchMock: jest.Mock,
  opts: { meta?: GoalDto | null; outras?: (url: string, init: RequestInit) => Response } = {},
): jest.Mock {
  return fetchMock.mockImplementation(async (url: string, init: RequestInit = {}) => {
    const m = /\/days\/(\d{4}-\d{2}-\d{2})$/.exec(url);
    if (m?.[1] && (init.method ?? "GET") === "GET") {
      return jsonResponse(200, day(m[1], opts.meta === undefined ? GOAL : opts.meta));
    }
    return opts.outras ? opts.outras(url, init) : jsonResponse(204);
  });
}

/** Chamadas ao `fetch` cujo caminho (sem a base) e método batem. */
export function callsTo(fetchMock: jest.Mock, method: string, path: string): RequestInit[] {
  return fetchMock.mock.calls
    .filter(([url, init]) => {
      const caminho = String(url).replace(/^https?:\/\/[^/]+/, "");
      return caminho === path && ((init as RequestInit | undefined)?.method ?? "GET") === method;
    })
    .map(([, init]) => (init ?? {}) as RequestInit);
}

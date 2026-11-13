import type { Db, Food } from "@kcal/db";
import type { MatchFoodResult } from "@kcal/shared";
import { foodKeys } from "./foodKeys";
import { loadVisibleFoods } from "./loadVisibleFoods";
import { normalizeFoodText } from "./normalizeFoodText";
import { toFoodDto } from "./toFoodDto";
import { trigramSimilarity } from "./trigramSimilarity";

/**
 * Similaridade mínima (Dice sobre trigramas, ver `trigramSimilarity`) para um alimento virar
 * candidato na etapa aproximada (inclusivo: 0,5 passa). 0,5 = metade dos trigramas em comum: pega
 * erro de digitação/transcrição de uma ou duas letras ("lentilia" × "lentilha" = 0,67; "beterava" ×
 * "beterraba" = 0,53) e descarta palavras que só dividem um pedaço ("abobrinha" × "abobora" = 0,44).
 * Valor do brief da T-006; os testes cobrem esses casos (acima, no limite e abaixo).
 */
export const SIMILARITY_THRESHOLD = 0.5;

/** Máximo de candidatos devolvidos nas etapas por trecho (2) e por similaridade (3). */
export const MAX_CANDIDATES = 5;

/** Tamanho mínimo (em caracteres normalizados) para a etapa por trecho valer. */
const MIN_CONTAINS_LENGTH = 3;

interface Avaliado {
  food: Food;
  keys: string[];
  proprio: boolean;
}

/**
 * Casa um nome falado/digitado com um alimento que a pessoa enxerga (padrões + os dela). Tudo em
 * memória, sobre o texto normalizado (`normalizeFoodText`), em etapas — a primeira que achar algo
 * decide:
 *
 * 1. **Igual**: nome ou apelido igual ao texto. Um só → `exact`. Vários → ordena (da pessoa antes do
 *    padrão; depois nome mais curto) e devolve `exact` só se houver exatamente um da pessoa entre
 *    eles; senão `candidates` com todos, nessa ordem.
 * 2. **Trecho** (texto ≥ 3 caracteres): texto contido em nome/apelido ("frang" → "peito de
 *    frango"), ou nome/apelido (≥ 3) contido no texto **como palavras inteiras** ("ovo frito" →
 *    "ovo", mas "macarrao" não casa com "maca") → `candidates`, menor diferença de tamanho primeiro.
 * 3. **Parecido**: similaridade ≥ `SIMILARITY_THRESHOLD` → `candidates`, mais parecido primeiro.
 * 4. Nada → `none`.
 *
 * Empates em 2 e 3: da pessoa antes do padrão, depois nome mais curto. Até `MAX_CANDIDATES`.
 */
export function matchFood(db: Db, userId: string, texto: string): MatchFoodResult {
  const alvo = normalizeFoodText(texto);
  if (alvo.length === 0) return { kind: "none" };

  const avaliados: Avaliado[] = loadVisibleFoods(db, userId).map((food) => ({
    food,
    keys: foodKeys(food),
    proprio: food.userId === userId,
  }));

  // 1. Igual.
  const iguais = avaliados.filter((a) => a.keys.includes(alvo)).sort(desempate);
  if (iguais.length > 0) {
    const [unico] = iguais;
    if (iguais.length === 1 && unico) return { kind: "exact", food: toFoodDto(unico.food) };
    const proprios = iguais.filter((a) => a.proprio);
    const [proprio] = proprios;
    if (proprios.length === 1 && proprio) return { kind: "exact", food: toFoodDto(proprio.food) };
    return { kind: "candidates", foods: iguais.map((a) => toFoodDto(a.food)) };
  }

  // 2. Trecho.
  if (alvo.length >= MIN_CONTAINS_LENGTH) {
    const porTrecho = avaliados
      .map((a) => ({ a, dist: distanciaPorTrecho(alvo, a.keys) }))
      .filter((x): x is { a: Avaliado; dist: number } => x.dist !== null)
      .sort((x, y) => x.dist - y.dist || desempate(x.a, y.a));
    if (porTrecho.length > 0) return candidatos(porTrecho.map((x) => x.a));
  }

  // 3. Parecido.
  const parecidos = avaliados
    .map((a) => ({ a, score: Math.max(...a.keys.map((k) => trigramSimilarity(alvo, k))) }))
    .filter((x) => x.score >= SIMILARITY_THRESHOLD)
    .sort((x, y) => y.score - x.score || desempate(x.a, y.a));
  if (parecidos.length > 0) return candidatos(parecidos.map((x) => x.a));

  return { kind: "none" };
}

/** Menor diferença de tamanho entre o texto e uma chave que o contém ou que ele contém. */
function distanciaPorTrecho(alvo: string, keys: string[]): number | null {
  let melhor: number | null = null;
  for (const k of keys) {
    // Chaves e texto normalizados só têm [a-z0-9] e espaços simples: cercar de espaço basta para
    // exigir palavras inteiras.
    const casa =
      k.includes(alvo) || (k.length >= MIN_CONTAINS_LENGTH && ` ${alvo} `.includes(` ${k} `));
    if (!casa) continue;
    const dist = Math.abs(k.length - alvo.length);
    if (melhor === null || dist < melhor) melhor = dist;
  }
  return melhor;
}

/** Da pessoa antes do padrão; depois nome mais curto; depois alfabética (ordem estável). */
function desempate(a: Avaliado, b: Avaliado): number {
  if (a.proprio !== b.proprio) return a.proprio ? -1 : 1;
  return a.food.nome.length - b.food.nome.length || a.food.nome.localeCompare(b.food.nome, "pt-BR");
}

function candidatos(lista: Avaliado[]): MatchFoodResult {
  return {
    kind: "candidates",
    foods: lista.slice(0, MAX_CANDIDATES).map((a) => toFoodDto(a.food)),
  };
}

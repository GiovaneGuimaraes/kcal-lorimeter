import type { Macros } from "@kcal/shared";

/** Soma uma lista de macros, sem arredondar. Lista vazia → zeros. */
export function sumMacros(list: readonly Macros[]): Macros {
  return list.reduce<Macros>(
    (acc, m) => ({
      kcal: acc.kcal + m.kcal,
      proteinaG: acc.proteinaG + m.proteinaG,
      carboG: acc.carboG + m.carboG,
      gorduraG: acc.gorduraG + m.gorduraG,
    }),
    { kcal: 0, proteinaG: 0, carboG: 0, gorduraG: 0 },
  );
}

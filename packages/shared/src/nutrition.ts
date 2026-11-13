import { z } from "zod";

/**
 * Macros de uma quantidade de alimento (ou de 100 g, conforme o contexto).
 * Valores sem arredondamento: arredonda-se só na exibição (`formatMacros`, em `@kcal/nutrition-core`).
 */
export const MacrosSchema = z.object({
  kcal: z.number(),
  proteinaG: z.number(),
  carboG: z.number(),
  gorduraG: z.number(),
});

export type Macros = z.infer<typeof MacrosSchema>;

/** Macros de um alimento por 100 g, com a porção padrão opcional (ex.: whey, 1 scoop = 30 g). */
export type FoodMacrosPer100g = Macros & {
  porcaoPadraoG?: number | null;
  nomePorcao?: string | null;
};

/** Unidades de quantidade. `g` e `ml` são peso (1 ml = 1 g); as demais exigem porção padrão. */
export const QUANTITY_UNITS = [
  "g",
  "ml",
  "unidade",
  "scoop",
  "fatia",
  "colher",
  "xicara",
  "concha",
] as const;

export const QuantityUnitSchema = z.enum(QUANTITY_UNITS);

export type QuantityUnit = z.infer<typeof QuantityUnitSchema>;

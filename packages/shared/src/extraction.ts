import { z } from "zod";

/** Refeição em que o item foi consumido, quando a pessoa disser. */
export const MealKindSchema = z.enum(["cafe", "almoco", "lanche", "jantar"]);
export type MealKind = z.infer<typeof MealKindSchema>;

/** Unidades que a extração pode devolver. A conversão para gramas é feita pelo código, não pelo LLM. */
export const ExtractionUnitSchema = z.enum([
  "g",
  "ml",
  "unidade",
  "scoop",
  "fatia",
  "colher",
  "xicara",
  "concha",
]);
export type ExtractionUnit = z.infer<typeof ExtractionUnitSchema>;

/**
 * Um item extraído de uma frase falada. Só interpretação: nenhum valor nutricional.
 * `z.object` (não `.strict()`) descarta chaves desconhecidas — ex.: `kcal` que o LLM inventar.
 */
export const ExtractedItemSchema = z.object({
  alimento: z.string().trim().min(1),
  quantidade: z.number().positive(),
  unidade: ExtractionUnitSchema,
  refeicao: MealKindSchema.optional(),
});
export type ExtractedItem = z.infer<typeof ExtractedItemSchema>;

/** Raiz da saída estruturada do LLM (saída estruturada exige objeto na raiz). */
export const ExtractionResultSchema = z.object({
  itens: z.array(ExtractedItemSchema),
});
export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;

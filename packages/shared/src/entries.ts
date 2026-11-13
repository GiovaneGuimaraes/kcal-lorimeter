import { z } from "zod";
import { MealKindSchema } from "./extraction";
import { GoalDtoSchema, IsoDateSchema } from "./goals";
import { MacrosSchema, QUANTITY_UNITS } from "./nutrition";

/** Ordem das refeições no dia (painel e resumo). */
export const MEAL_ORDER = MealKindSchema.options;

/** Refeição de um lançamento, com mensagem em pt-BR. */
export const EntryMealSchema = z.enum(MEAL_ORDER, {
  error: "Refeição inválida (use cafe, almoco, lanche ou jantar)",
});

/** De onde veio o lançamento. */
export const ENTRY_ORIGENS = ["voz", "texto", "manual"] as const;
export const EntryOrigemSchema = z.enum(ENTRY_ORIGENS, {
  error: "Origem inválida (use voz, texto ou manual)",
});
export type EntryOrigem = z.infer<typeof EntryOrigemSchema>;

/** Teto de sanidade para uma quantidade (ou gramas) num lançamento. */
export const MAX_ENTRY_QUANTITY = 10000;

const positivo = (rotulo: string) =>
  z
    .number({ error: `${rotulo} deve ser um número` })
    .finite({ error: `${rotulo} deve ser um número` })
    .positive({ error: `${rotulo} deve ser maior que zero` })
    .max(MAX_ENTRY_QUANTITY, { error: `${rotulo} deve ser no máximo ${MAX_ENTRY_QUANTITY}` });

const unidade = z.enum(QUANTITY_UNITS, { error: "Unidade inválida" });

const id = (rotulo: string) =>
  z
    .string({ error: `${rotulo} é obrigatório` })
    .trim()
    .min(1, { error: `${rotulo} é obrigatório` });

/**
 * Body de `POST /entries`. A quantidade é convertida em gramas pelo código (`gramsFromQuantity`);
 * só as gramas resolvidas são gravadas. `voiceLogId` exige `origem = "voz"`.
 */
export const CreateEntrySchema = z
  .object({
    data: IsoDateSchema,
    refeicao: EntryMealSchema,
    foodId: id("Alimento"),
    quantidade: positivo("Quantidade"),
    unidade,
    origem: EntryOrigemSchema.default("manual"),
    voiceLogId: id("Registro de voz").optional(),
  })
  .refine((e) => e.voiceLogId === undefined || e.origem === "voz", {
    error: "Lançamento ligado a um registro de voz deve ter origem voz",
  });
export type CreateEntryInput = z.input<typeof CreateEntrySchema>;
export type CreateEntryBody = z.output<typeof CreateEntrySchema>;

/**
 * Body de `PATCH /entries/:id`: `gramas` direto **ou** `quantidade` + `unidade` (resolvidas de novo
 * em gramas), e/ou `refeicao`/`data`. Pelo menos um campo.
 */
export const UpdateEntrySchema = z
  .object({
    gramas: positivo("Gramas").optional(),
    quantidade: positivo("Quantidade").optional(),
    unidade: unidade.optional(),
    refeicao: EntryMealSchema.optional(),
    data: IsoDateSchema.optional(),
  })
  .refine((p) => Object.values(p).some((v) => v !== undefined), {
    error: "Informe pelo menos um campo para alterar",
  })
  .refine((p) => (p.quantidade === undefined) === (p.unidade === undefined), {
    error: "Informe quantidade e unidade juntas",
  })
  .refine((p) => p.gramas === undefined || p.quantidade === undefined, {
    error: "Informe gramas ou quantidade, não os dois",
  });
export type UpdateEntryInput = z.input<typeof UpdateEntrySchema>;
export type UpdateEntryBody = z.output<typeof UpdateEntrySchema>;

/**
 * Lançamento como sai da API. Macros são o **snapshot** gravado no lançamento, sem arredondar
 * (a UI arredonda com `formatMacros`).
 */
export const EntryDtoSchema = z.object({
  id: z.string(),
  data: z.string(),
  refeicao: EntryMealSchema,
  food: z.object({ id: z.string(), nome: z.string() }),
  gramas: z.number(),
  kcal: z.number(),
  proteinaG: z.number(),
  carboG: z.number(),
  gorduraG: z.number(),
  origem: EntryOrigemSchema,
  voiceLogId: z.string().nullable(),
});
export type EntryDto = z.infer<typeof EntryDtoSchema>;

/** Lançamentos de uma refeição no dia, com o subtotal (sem arredondar). */
export const MealGroupSchema = z.object({
  refeicao: EntryMealSchema,
  entradas: z.array(EntryDtoSchema),
  subtotal: MacrosSchema,
});
export type MealGroup = z.infer<typeof MealGroupSchema>;

/**
 * Resposta de `GET /days/:data`. `restante` = meta − consumido (pode ser negativo; `null` sem meta).
 * `refeicoes` traz sempre as quatro refeições, na ordem de `MEAL_ORDER`.
 */
export const DaySummaryDtoSchema = z.object({
  data: z.string(),
  consumido: MacrosSchema,
  meta: GoalDtoSchema.nullable(),
  restante: MacrosSchema.nullable(),
  refeicoes: z.array(MealGroupSchema),
});
export type DaySummaryDto = z.infer<typeof DaySummaryDtoSchema>;

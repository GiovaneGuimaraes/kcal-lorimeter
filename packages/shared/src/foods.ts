import { z } from "zod";

const macro100g = (rotulo: string) =>
  z
    .number({ error: `${rotulo} deve ser um número` })
    .finite({ error: `${rotulo} deve ser um número` })
    .min(0, { error: `${rotulo} não pode ser negativo` });

/**
 * Campos de um alimento da pessoa, sem defaults (base de `CreateFoodSchema` e `UpdateFoodSchema`).
 * Macros por 100 g, sem arredondamento. Mensagens em pt-BR: vão direto para a pessoa.
 */
const foodFields = {
  nome: z
    .string({ error: "Nome é obrigatório" })
    .trim()
    .min(1, { error: "Nome é obrigatório" })
    .max(80, { error: "Nome deve ter no máximo 80 caracteres" }),
  apelidos: z
    .array(
      z
        .string({ error: "Apelido deve ser texto" })
        .trim()
        .min(1, { error: "Apelido não pode ser vazio" })
        .max(80, { error: "Apelido deve ter no máximo 80 caracteres" }),
      { error: "Apelidos devem ser uma lista de textos" },
    )
    .max(10, { error: "No máximo 10 apelidos" }),
  kcal100g: macro100g("Kcal por 100 g"),
  proteina100g: macro100g("Proteína por 100 g"),
  carbo100g: macro100g("Carboidrato por 100 g"),
  gordura100g: macro100g("Gordura por 100 g"),
  porcaoPadraoG: z
    .number({ error: "Porção padrão deve ser um número" })
    .finite({ error: "Porção padrão deve ser um número" })
    .positive({ error: "Porção padrão deve ser maior que zero" })
    .nullable(),
  nomePorcao: z
    .string({ error: "Nome da porção deve ser texto" })
    .trim()
    .min(1, { error: "Nome da porção não pode ser vazio" })
    .max(40, { error: "Nome da porção deve ter no máximo 40 caracteres" })
    .nullable(),
  fonte: z
    .string({ error: "Fonte deve ser texto" })
    .trim()
    .min(1, { error: "Fonte não pode ser vazia" })
    .max(200, { error: "Fonte deve ter no máximo 200 caracteres" }),
};

/** Fonte gravada quando a pessoa cadastra um alimento sem dizer de onde vêm os valores. */
export const DEFAULT_FOOD_FONTE = "cadastro da pessoa";

/** Body de `POST /foods`. */
export const CreateFoodSchema = z.object({
  nome: foodFields.nome,
  apelidos: foodFields.apelidos.default([]),
  kcal100g: foodFields.kcal100g,
  proteina100g: foodFields.proteina100g,
  carbo100g: foodFields.carbo100g,
  gordura100g: foodFields.gordura100g,
  porcaoPadraoG: foodFields.porcaoPadraoG.optional(),
  nomePorcao: foodFields.nomePorcao.optional(),
  fonte: foodFields.fonte.default(DEFAULT_FOOD_FONTE),
});
export type CreateFoodInput = z.input<typeof CreateFoodSchema>;
export type CreateFoodBody = z.output<typeof CreateFoodSchema>;

/**
 * Body de `PATCH /foods/:id`: qualquer subconjunto dos campos, pelo menos um. `null` em
 * `porcaoPadraoG`/`nomePorcao` limpa o valor. Sem defaults: campo ausente não é alterado.
 */
export const UpdateFoodSchema = z
  .object(foodFields)
  .partial()
  .refine((patch) => Object.values(patch).some((v) => v !== undefined), {
    error: "Informe pelo menos um campo para alterar",
  });
export type UpdateFoodInput = z.input<typeof UpdateFoodSchema>;
export type UpdateFoodBody = z.output<typeof UpdateFoodSchema>;

/** Alimento como sai da API: sem `user_id`; `isPadrao` diz se é da base padrão. */
export const FoodDtoSchema = z.object({
  id: z.string(),
  nome: z.string(),
  apelidos: z.array(z.string()),
  kcal100g: z.number(),
  proteina100g: z.number(),
  carbo100g: z.number(),
  gordura100g: z.number(),
  porcaoPadraoG: z.number().nullable(),
  nomePorcao: z.string().nullable(),
  fonte: z.string(),
  isPadrao: z.boolean(),
});
export type FoodDto = z.infer<typeof FoodDtoSchema>;

/** Resposta de `GET /foods`. */
export const ListFoodsResponseSchema = z.object({ foods: z.array(FoodDtoSchema) });
export type ListFoodsResponse = z.infer<typeof ListFoodsResponseSchema>;

/**
 * Resultado do casamento de um nome falado com a base (`GET /foods/match`):
 * - `exact`: um alimento só, sem ambiguidade;
 * - `candidates`: a pessoa escolhe (mais provável primeiro);
 * - `none`: nada parecido — a pessoa cadastra ou digita.
 */
export const MatchFoodResultSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("exact"), food: FoodDtoSchema }),
  z.object({ kind: z.literal("candidates"), foods: z.array(FoodDtoSchema).min(1) }),
  z.object({ kind: z.literal("none") }),
]);
export type MatchFoodResult = z.infer<typeof MatchFoodResultSchema>;

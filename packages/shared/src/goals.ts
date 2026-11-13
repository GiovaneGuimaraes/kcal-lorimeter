import { z } from "zod";

/** Data `YYYY-MM-DD` que existe no calendário (rejeita 2026-02-30). */
export const IsoDateSchema = z
  .string({ error: "Data inválida (use AAAA-MM-DD)" })
  .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Data inválida (use AAAA-MM-DD)" })
  .refine(
    (s) => {
      const d = new Date(`${s}T00:00:00Z`);
      return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
    },
    { error: "Data inválida (use AAAA-MM-DD)" },
  );

const meta = (nome: string, max: number, unidade: string) =>
  z
    .number({ error: `${nome} é obrigatório(a)` })
    .int({ error: `${nome} deve ser um número inteiro` })
    .min(0, { error: `${nome} não pode ser negativo(a)` })
    .max(max, { error: `${nome} deve ser no máximo ${max} ${unidade}` });

/** Body de `PUT /goals`. */
export const SetGoalSchema = z.object({
  kcal: meta("Calorias", 20000, "kcal"),
  proteinaG: meta("Proteína", 2000, "g"),
  carboG: meta("Carboidrato", 2000, "g"),
  gorduraG: meta("Gordura", 2000, "g"),
  vigenteDesde: IsoDateSchema.optional(),
});
export type SetGoalBody = z.infer<typeof SetGoalSchema>;

/** Query de `GET /goals`. */
export const GetGoalQuerySchema = z.object({ data: IsoDateSchema.optional() });

/** Meta diária devolvida pela API (sem `user_id`). */
export const GoalDtoSchema = z.object({
  id: z.string(),
  kcal: z.number(),
  proteinaG: z.number(),
  carboG: z.number(),
  gorduraG: z.number(),
  vigenteDesde: z.string(),
});
export type GoalDto = z.infer<typeof GoalDtoSchema>;

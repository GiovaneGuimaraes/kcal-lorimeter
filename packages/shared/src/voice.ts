import { z } from "zod";
import { ExtractedItemSchema } from "./extraction";
import { MatchFoodResultSchema } from "./foods";

/**
 * Um item da tela de revisão do lançamento por voz/texto (F5/F6):
 * - `extraido`: o que a IA entendeu (`{alimento, quantidade, unidade, refeicao?}`), sem macros;
 * - `match`: o casamento com a base (`exact` / `candidates` / `none`);
 * - `gramas`: só quando o casamento é `exact` e a unidade converte (g/ml, ou porção cadastrada);
 * - `precisaPeso`: `true` quando o casamento é `exact` mas a unidade ("scoop", "unidade"...) exige
 *   porção padrão que o alimento não tem — a revisão pede o peso.
 *
 * Nenhum valor nutricional aqui: os macros são calculados na confirmação (entries-core).
 */
export const VoiceReviewItemSchema = z.object({
  extraido: ExtractedItemSchema,
  match: MatchFoodResultSchema,
  gramas: z.number().nonnegative().optional(),
  precisaPeso: z.boolean(),
});
export type VoiceReviewItem = z.infer<typeof VoiceReviewItemSchema>;

/** Resposta de `POST /voice` e `POST /voice/text`. `voiceLogId` vai na confirmação dos itens. */
export const VoiceReviewSchema = z.object({
  voiceLogId: z.string(),
  transcricao: z.string(),
  itens: z.array(VoiceReviewItemSchema),
});
export type VoiceReview = z.infer<typeof VoiceReviewSchema>;

/** Tamanho máximo do texto digitado em `POST /voice/text`. */
export const VOICE_TEXT_MAX_LENGTH = 500;

/** Body de `POST /voice/text`. Mensagens em pt-BR: vão direto para a pessoa. */
export const VoiceTextBodySchema = z.object({
  texto: z
    .string({ error: "Texto é obrigatório" })
    .trim()
    .min(1, { error: "Texto é obrigatório" })
    .max(VOICE_TEXT_MAX_LENGTH, {
      error: `Texto deve ter no máximo ${VOICE_TEXT_MAX_LENGTH} caracteres`,
    }),
});
export type VoiceTextBody = z.output<typeof VoiceTextBodySchema>;

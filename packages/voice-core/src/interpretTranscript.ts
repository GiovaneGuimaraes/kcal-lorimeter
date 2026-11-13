import { type Db, voiceLogs } from "@kcal/db";
import type { ItemExtractor } from "@kcal/llm";
import type { ExtractedItem, VoiceReview } from "@kcal/shared";
import { VoiceProviderError } from "./errors";
import { reviewItem } from "./reviewItem";
import type { VoiceExtractionJson, VoiceOrigem } from "./types";

/**
 * Parte comum de voz e texto: extrai os itens da frase (LLM), casa cada um com a base e grava o
 * `voice_log` `pendente` da pessoa. Só grava depois que extração e casamento deram certo.
 * `transcricao` já vem aparada e não vazia.
 */
export async function interpretTranscript(
  db: Db,
  extractor: ItemExtractor,
  userId: string,
  transcricao: string,
  origem: VoiceOrigem,
): Promise<VoiceReview> {
  let extraidos: ExtractedItem[];
  try {
    extraidos = await extractor.extract(transcricao);
  } catch (err) {
    throw new VoiceProviderError("llm", { cause: err });
  }

  const itens = extraidos.map((item) => reviewItem(db, userId, item));

  const extracaoJson: VoiceExtractionJson = { origem, itens: extraidos };
  const { id } = db
    .insert(voiceLogs)
    .values({ userId, transcricao, extracaoJson, status: "pendente" })
    .returning({ id: voiceLogs.id })
    .get();

  return { voiceLogId: id, transcricao, itens };
}

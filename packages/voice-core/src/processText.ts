import type { VoiceReview } from "@kcal/shared";
import { EmptyTranscriptError, VoiceProviderUnavailableError } from "./errors";
import { interpretTranscript } from "./interpretTranscript";
import type { VoiceDeps } from "./types";

/**
 * Lançamento por texto digitado (F6): mesmo fluxo de `processVoice`, sem STT; `origem` `texto`.
 * Não precisa de `transcriber`. Texto vazio após aparar → `EmptyTranscriptError`.
 */
export async function processText(
  { db, extractor }: VoiceDeps,
  userId: string,
  texto: string,
): Promise<VoiceReview> {
  if (!extractor) throw new VoiceProviderUnavailableError("llm");
  const transcricao = texto.trim();
  if (transcricao.length === 0) throw new EmptyTranscriptError();
  return interpretTranscript(db, extractor, userId, transcricao, "texto");
}

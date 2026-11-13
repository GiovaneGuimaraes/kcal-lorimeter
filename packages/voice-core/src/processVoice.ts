import type { VoiceReview } from "@kcal/shared";
import { type AudioInput, SttEmptyTranscriptError } from "@kcal/stt";
import { EmptyTranscriptError, VoiceProviderError, VoiceProviderUnavailableError } from "./errors";
import { interpretTranscript } from "./interpretTranscript";
import type { VoiceDeps } from "./types";

/**
 * Lançamento por voz (F5): áudio → transcrição (STT) → extração (LLM) → casamento com a base →
 * `voice_log` `pendente`. Devolve a revisão; nada vira lançamento aqui.
 *
 * O áudio só passa pela memória: não é gravado em disco nem no banco.
 *
 * Erros: integração não configurada → `VoiceProviderUnavailableError` (checado antes de chamar o
 * STT, para não pagar transcrição que não dá para interpretar); transcrição vazia →
 * `EmptyTranscriptError`; falha do STT/LLM → `VoiceProviderError`.
 */
export async function processVoice(
  { db, transcriber, extractor }: VoiceDeps,
  userId: string,
  audio: AudioInput,
): Promise<VoiceReview> {
  if (!transcriber) throw new VoiceProviderUnavailableError("stt");
  if (!extractor) throw new VoiceProviderUnavailableError("llm");

  let texto: string;
  try {
    texto = (await transcriber.transcribe(audio)).text.trim();
  } catch (err) {
    if (err instanceof SttEmptyTranscriptError) throw new EmptyTranscriptError();
    throw new VoiceProviderError("stt", { cause: err });
  }
  if (texto.length === 0) throw new EmptyTranscriptError();

  return interpretTranscript(db, extractor, userId, texto, "voz");
}

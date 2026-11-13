import { VoiceReviewSchema } from "@kcal/shared";
import type { PendingReview } from "../voice/review-store";
import { apiRequest } from "./client";

/** Arquivo gravado pelo `expo-audio` (preset HIGH_QUALITY: AAC em contêiner MPEG-4 → `.m4a`). */
export const AUDIO_FILE_NAME = "audio.m4a";
export const AUDIO_MIME_TYPE = "audio/m4a";

/**
 * `POST /voice` (multipart, campo `audio`). No React Native o `FormData` aceita
 * `{ uri, name, type }` e o próprio runtime lê o arquivo local e envia os bytes.
 * A revisão volta marcada com `origem: "voz"` (vai na confirmação dos lançamentos).
 */
export async function sendVoiceAudio(uri: string): Promise<PendingReview> {
  const form = new FormData();
  form.append("audio", {
    uri,
    name: AUDIO_FILE_NAME,
    type: AUDIO_MIME_TYPE,
  } as unknown as Blob);
  const review = await apiRequest("/voice", { method: "POST", form, schema: VoiceReviewSchema });
  return { ...review, origem: "voz" };
}

/** `POST /voice/text` — a mesma revisão, a partir do texto digitado (`origem: "texto"`). */
export async function sendVoiceText(texto: string): Promise<PendingReview> {
  const review = await apiRequest("/voice/text", {
    method: "POST",
    json: { texto },
    schema: VoiceReviewSchema,
  });
  return { ...review, origem: "texto" };
}

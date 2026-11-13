import { type VoiceReview, VoiceReviewSchema } from "@kcal/shared";
import { apiRequest } from "./client";

/** Arquivo gravado pelo `expo-audio` (preset HIGH_QUALITY: AAC em contêiner MPEG-4 → `.m4a`). */
export const AUDIO_FILE_NAME = "audio.m4a";
export const AUDIO_MIME_TYPE = "audio/m4a";

/**
 * `POST /voice` (multipart, campo `audio`). No React Native o `FormData` aceita
 * `{ uri, name, type }` e o próprio runtime lê o arquivo local e envia os bytes.
 */
export function sendVoiceAudio(uri: string): Promise<VoiceReview> {
  const form = new FormData();
  form.append("audio", {
    uri,
    name: AUDIO_FILE_NAME,
    type: AUDIO_MIME_TYPE,
  } as unknown as Blob);
  return apiRequest("/voice", { method: "POST", form, schema: VoiceReviewSchema });
}

/** `POST /voice/text` — a mesma revisão, a partir do texto digitado. */
export function sendVoiceText(texto: string): Promise<VoiceReview> {
  return apiRequest("/voice/text", { method: "POST", json: { texto }, schema: VoiceReviewSchema });
}

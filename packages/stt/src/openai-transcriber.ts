import { SttEmptyTranscriptError, SttHttpError } from "./errors";
import type { Transcriber } from "./types";

const ENDPOINT = "https://api.openai.com/v1/audio/transcriptions";
const MAX_BODY = 500;

const EXTENSIONS: Record<string, string> = {
  "audio/m4a": "m4a",
  "audio/x-m4a": "m4a",
  "audio/mp4": "mp4",
  "audio/webm": "webm",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
};

export function fileNameFor(mimeType: string): string {
  const base = mimeType.split(";")[0]?.trim().toLowerCase() ?? "";
  return `audio.${EXTENSIONS[base] ?? "bin"}`;
}

export function createOpenAiTranscriber(opts: {
  apiKey: string;
  fetch?: typeof fetch;
}): Transcriber {
  const doFetch = opts.fetch ?? fetch;
  return {
    async transcribe(audio) {
      const form = new FormData();
      form.append("model", "whisper-1");
      form.append("language", "pt");
      form.append("response_format", "json");
      const blob = new Blob([audio.bytes], { type: audio.mimeType });
      form.append("file", blob, fileNameFor(audio.mimeType));
      const res = await doFetch(ENDPOINT, {
        method: "POST",
        headers: { Authorization: `Bearer ${opts.apiKey}` },
        body: form,
      });
      if (!res.ok) {
        const body = (await res.text().catch(() => "")).slice(0, MAX_BODY);
        throw new SttHttpError(res.status, body);
      }
      const json = (await res.json().catch(() => null)) as { text?: unknown } | null;
      const text = typeof json?.text === "string" ? json.text.trim() : "";
      if (!text) throw new SttEmptyTranscriptError();
      return { text };
    },
  };
}

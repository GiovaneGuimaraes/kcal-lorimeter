import type { Transcriber } from "./types";

export function createFakeTranscriber(text: string): Transcriber {
  return { transcribe: async () => ({ text }) };
}

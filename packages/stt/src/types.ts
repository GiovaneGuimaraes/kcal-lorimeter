export type AudioInput = { bytes: Uint8Array; mimeType: string };
export type Transcription = { text: string };
export type Transcriber = {
  transcribe(audio: AudioInput): Promise<Transcription>;
};

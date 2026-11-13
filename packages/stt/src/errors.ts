export class SttHttpError extends Error {
  readonly status: number;
  readonly body: string;
  constructor(status: number, body: string) {
    super(`STT HTTP ${status}`);
    this.name = "SttHttpError";
    this.status = status;
    this.body = body;
  }
}

export class SttEmptyTranscriptError extends Error {
  constructor() {
    super("STT devolveu transcrição vazia");
    this.name = "SttEmptyTranscriptError";
  }
}

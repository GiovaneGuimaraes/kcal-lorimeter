/** Qual integração externa: transcrição (STT) ou extração (LLM). */
export type VoiceProvider = "stt" | "llm";

/** A integração não está configurada no servidor (sem chave no `.env`). A rota responde 503. */
export class VoiceProviderUnavailableError extends Error {
  override readonly name = "VoiceProviderUnavailableError";

  constructor(readonly provider: VoiceProvider) {
    super(
      provider === "stt"
        ? "Transcrição de áudio não configurada no servidor"
        : "Interpretação de texto não configurada no servidor",
    );
  }
}

/**
 * A integração falhou (rede, HTTP 4xx/5xx, saída do LLM fora do schema). O erro original fica em
 * `cause` (só para log). A rota responde 502.
 */
export class VoiceProviderError extends Error {
  override readonly name = "VoiceProviderError";

  constructor(
    readonly provider: VoiceProvider,
    options: { cause: unknown },
  ) {
    super(
      provider === "stt" ? "Falha na transcrição do áudio" : "Falha na interpretação do texto",
      options,
    );
  }
}

/** Nada para interpretar: transcrição (ou texto digitado) vazia. A rota responde 422. */
export class EmptyTranscriptError extends Error {
  override readonly name = "EmptyTranscriptError";

  constructor() {
    super("Não entendi o áudio. Tente de novo.");
  }
}

/**
 * Registro de voz não existe, é de outra pessoa ou não está mais `pendente`. Mesma classe nos três
 * casos, para não revelar registros de outras pessoas. A rota responde 404.
 */
export class VoiceLogNotFoundError extends Error {
  override readonly name = "VoiceLogNotFoundError";

  constructor() {
    super("Registro de voz não encontrado");
  }
}

/**
 * Lançamento não existe ou é de outra pessoa. Mesma classe nos dois casos, para não revelar a
 * existência de lançamentos de outras pessoas.
 */
export class EntryNotFoundError extends Error {
  override readonly name = "EntryNotFoundError";

  constructor() {
    super("Lançamento não encontrado");
  }
}

/** Registro de voz não existe ou é de outra pessoa. */
export class VoiceLogNotFoundError extends Error {
  override readonly name = "VoiceLogNotFoundError";

  constructor() {
    super("Registro de voz não encontrado");
  }
}

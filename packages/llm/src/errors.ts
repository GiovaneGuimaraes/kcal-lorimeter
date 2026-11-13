/**
 * A resposta do LLM não virou uma lista de itens válida: `parsed_output` ausente/nulo
 * (recusa, corte por `max_tokens`, sem bloco de texto) ou item fora do schema.
 * Erros do próprio SDK (rede, 4xx/5xx, JSON inválido) não são embrulhados aqui: propagam.
 */
export class ExtractionParseError extends Error {
  override readonly name = "ExtractionParseError";

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
  }
}

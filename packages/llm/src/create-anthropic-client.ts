import Anthropic from "@anthropic-ai/sdk";

/** Conveniência para o servidor: cria o cliente real. A chave vem do `.env`, nunca do app. */
export function createAnthropicClient({ apiKey }: { apiKey: string }): Anthropic {
  return new Anthropic({ apiKey });
}

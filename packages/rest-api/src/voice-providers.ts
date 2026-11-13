import { createAnthropicClient, createItemExtractor } from "@kcal/llm";
import { createOpenAiTranscriber } from "@kcal/stt";
import type { ServerEnv } from "./env";
import type { VoiceProviders } from "./types";

/**
 * Monta STT e LLM a partir das chaves do `.env`. Chave ausente → `null` (a rota responde 503) e
 * um aviso no log; a API sobe do mesmo jeito.
 */
export function createVoiceProviders(
  env: Pick<ServerEnv, "openaiApiKey" | "anthropicApiKey">,
  log: (msg: string) => void = console.warn,
): VoiceProviders {
  const transcriber = env.openaiApiKey
    ? createOpenAiTranscriber({ apiKey: env.openaiApiKey })
    : null;
  if (!transcriber) log("STT desativado (sem OPENAI_API_KEY): POST /voice responde 503.");

  const extractor = env.anthropicApiKey
    ? createItemExtractor({ client: createAnthropicClient({ apiKey: env.anthropicApiKey }) })
    : null;
  if (!extractor) {
    log("Extração desativada (sem ANTHROPIC_API_KEY): POST /voice e /voice/text respondem 503.");
  }

  return { transcriber, extractor };
}

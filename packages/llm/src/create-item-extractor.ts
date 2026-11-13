import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { type ExtractedItem, ExtractionResultSchema } from "@kcal/shared";
import { ExtractionParseError } from "./errors";
import { EXTRACTION_SYSTEM_PROMPT } from "./system-prompt";

/** Modelo da extração (decisão de stack: Claude Haiku 5.5). */
export const EXTRACTION_MODEL = "claude-haiku-5-5";
export const EXTRACTION_MAX_TOKENS = 4096;

type MessageParseParams = Parameters<Anthropic["messages"]["parse"]>[0];

/**
 * O mínimo do cliente Anthropic que a extração usa. Um `Anthropic` real satisfaz; nos testes,
 * um objeto falso sem rede.
 */
export interface ItemExtractorClient {
  messages: {
    parse(params: MessageParseParams): PromiseLike<{ parsed_output?: unknown }>;
  };
}

export interface ItemExtractor {
  /** Interpreta uma frase em pt-BR e devolve os itens citados. Sem valor nutricional. */
  extract(text: string): Promise<ExtractedItem[]>;
}

export function createItemExtractor({ client }: { client: ItemExtractorClient }): ItemExtractor {
  return {
    async extract(text) {
      const response = await client.messages.parse({
        model: EXTRACTION_MODEL,
        max_tokens: EXTRACTION_MAX_TOKENS,
        system: EXTRACTION_SYSTEM_PROMPT,
        messages: [{ role: "user", content: text }],
        output_config: { format: zodOutputFormat(ExtractionResultSchema) },
      });

      const output = response.parsed_output;
      if (output === null || output === undefined) {
        throw new ExtractionParseError("Resposta do LLM sem saída estruturada (parsed_output).");
      }

      // Não confiamos no que veio: revalida com o nosso schema, que também descarta chaves
      // desconhecidas (ex.: `kcal` inventado pelo LLM).
      const result = ExtractionResultSchema.safeParse(output);
      if (!result.success) {
        throw new ExtractionParseError("Saída do LLM fora do schema de extração.", {
          cause: result.error,
        });
      }
      return result.data.itens;
    },
  };
}

import type { Db } from "@kcal/db";
import type { ItemExtractor } from "@kcal/llm";
import type { ExtractedItem } from "@kcal/shared";
import type { Transcriber } from "@kcal/stt";

/**
 * Dependências injetadas. `null` = integração não configurada (sem chave): a função lança
 * `VoiceProviderUnavailableError` em vez de tentar.
 */
export interface VoiceDeps {
  db: Db;
  transcriber: Transcriber | null;
  extractor: ItemExtractor | null;
}

/** De onde veio a frase. Mesmos valores de `meal_entries.origem`. */
export type VoiceOrigem = "voz" | "texto";

/**
 * Conteúdo de `voice_logs.extracao_json`. A tabela não tem coluna `origem`: ela fica aqui dentro,
 * junto dos itens extraídos (sem macros).
 */
export interface VoiceExtractionJson {
  origem: VoiceOrigem;
  itens: ExtractedItem[];
}

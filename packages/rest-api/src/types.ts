import type { Db } from "@kcal/db";
import type { ItemExtractor } from "@kcal/llm";
import type { Transcriber } from "@kcal/stt";

/** Dependências que o app recebe de fora (o `server.ts` monta; os testes passam as suas). */
export interface AppDeps {
  db: Db;
  /** Segredo HS256 dos tokens de sessão. Quem valida o tamanho mínimo é o `server.ts`. */
  jwtSecret: string;
  /** STT e LLM do lançamento por voz/texto. Ausente ou `null` = sem chave: as rotas `/voice` dão 503. */
  voice?: VoiceProviders;
}

export interface VoiceProviders {
  transcriber: Transcriber | null;
  extractor: ItemExtractor | null;
}

/** Ambiente Hono das rotas autenticadas: `requireUser` põe `userId` no contexto. */
export interface AuthedEnv {
  Variables: {
    userId: string;
  };
}

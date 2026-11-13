import { ExtractionParseError } from "@kcal/llm";
import { type ErrorResponse, type VoiceReview, VoiceTextBodySchema } from "@kcal/shared";
import {
  discardVoiceLog,
  EmptyTranscriptError,
  processText,
  processVoice,
  type VoiceDeps,
  VoiceLogNotFoundError,
  VoiceProviderError,
  VoiceProviderUnavailableError,
} from "@kcal/voice-core";
import type { Context } from "hono";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { parseBody } from "../http/parse-body";
import { requireUser } from "../middleware/require-user";
import type { AppDeps, AuthedEnv } from "../types";

/** Tamanho máximo do áudio enviado em `POST /voice`. */
export const MAX_AUDIO_BYTES = 5 * 1024 * 1024;

/** Folga para os cabeçalhos do multipart em volta do arquivo (limite do corpo inteiro). */
const MULTIPART_OVERHEAD_BYTES = 64 * 1024;

const ERRO_AUDIO_GRANDE = "Áudio muito grande (máximo 5 MB)";

/**
 * Lançamento por voz/texto da pessoa logada (todas as rotas exigem `requireUser`):
 * - `POST /voice` — multipart com o campo `audio` (≤ 5 MB, `audio/*`) → `VoiceReview`;
 * - `POST /voice/text` — `{ texto }` (1–500) → `VoiceReview`;
 * - `POST /voice/:id/discard` — descarta a revisão pendente → 204.
 *
 * O áudio só passa pela memória: vai do corpo da requisição para o STT e não é gravado em disco
 * nem no banco. Sem chave de STT/LLM no servidor → 503.
 */
export function voiceRoutes({ db, jwtSecret, voice }: AppDeps): Hono<AuthedEnv> {
  const deps: VoiceDeps = {
    db,
    transcriber: voice?.transcriber ?? null,
    extractor: voice?.extractor ?? null,
  };
  const routes = new Hono<AuthedEnv>();
  routes.use("*", requireUser(jwtSecret));

  routes.post(
    "/",
    // Checa antes de ler o corpo: sem chave não adianta receber 5 MB.
    async (c, next) => {
      if (!deps.transcriber) return indisponivel(c, new VoiceProviderUnavailableError("stt"));
      if (!deps.extractor) return indisponivel(c, new VoiceProviderUnavailableError("llm"));
      await next();
    },
    bodyLimit({
      maxSize: MAX_AUDIO_BYTES + MULTIPART_OVERHEAD_BYTES,
      onError: (c) => c.json<ErrorResponse>({ erro: ERRO_AUDIO_GRANDE }, 413),
    }),
    async (c) => {
      let form: Record<string, string | File>;
      try {
        form = await c.req.parseBody();
      } catch {
        return c.json<ErrorResponse>({ erro: "Envie o áudio como multipart/form-data" }, 400);
      }
      const audio = form.audio;
      if (!(audio instanceof File)) {
        return c.json<ErrorResponse>({ erro: "Envie o áudio no campo audio" }, 400);
      }
      if (audio.size > MAX_AUDIO_BYTES) {
        return c.json<ErrorResponse>({ erro: ERRO_AUDIO_GRANDE }, 413);
      }
      if (!audio.type.toLowerCase().startsWith("audio/")) {
        return c.json<ErrorResponse>({ erro: "O arquivo enviado não é um áudio" }, 400);
      }
      if (audio.size === 0) {
        return c.json<ErrorResponse>({ erro: "Não entendi o áudio. Tente de novo." }, 422);
      }

      const bytes = new Uint8Array(await audio.arrayBuffer());
      try {
        const review = await processVoice(deps, c.get("userId"), { bytes, mimeType: audio.type });
        return c.json<VoiceReview>(review);
      } catch (err) {
        return erroDeVoz(c, err);
      }
    },
  );

  routes.post("/text", async (c) => {
    if (!deps.extractor) return indisponivel(c, new VoiceProviderUnavailableError("llm"));
    const body = await parseBody(c, VoiceTextBodySchema);
    if (!body.ok) return c.json<ErrorResponse>({ erro: body.erro }, 400);
    try {
      return c.json<VoiceReview>(await processText(deps, c.get("userId"), body.data.texto));
    } catch (err) {
      return erroDeVoz(c, err);
    }
  });

  routes.post("/:id/discard", (c) => {
    try {
      discardVoiceLog(db, c.get("userId"), c.req.param("id"));
      return c.body(null, 204);
    } catch (err) {
      if (err instanceof VoiceLogNotFoundError) {
        return c.json<ErrorResponse>({ erro: "Registro de voz não encontrado" }, 404);
      }
      throw err;
    }
  });

  return routes;
}

function indisponivel(c: Context, err: VoiceProviderUnavailableError) {
  const erro =
    err.provider === "stt"
      ? "Lançamento por voz indisponível: transcrição não configurada no servidor."
      : "Interpretação indisponível: extração não configurada no servidor.";
  return c.json<ErrorResponse>({ erro }, 503);
}

/** Traduz os erros do voice-core em status; o resto sobe para o `onError` (500). */
function erroDeVoz(c: Context, err: unknown) {
  if (err instanceof VoiceProviderUnavailableError) return indisponivel(c, err);
  if (err instanceof EmptyTranscriptError) {
    return c.json<ErrorResponse>({ erro: "Não entendi o áudio. Tente de novo." }, 422);
  }
  if (err instanceof VoiceProviderError) {
    // Detalhe (status HTTP, corpo da resposta do provedor) só no log do servidor.
    console.error(err, err.cause);
    let erro: string;
    if (err.provider === "stt") {
      erro = "Não consegui transcrever o áudio agora. Tente de novo ou digite.";
    } else if (err.cause instanceof ExtractionParseError) {
      erro = "Não consegui interpretar o que você disse. Tente de novo ou digite.";
    } else {
      erro = "Não consegui interpretar agora. Tente de novo ou digite.";
    }
    return c.json<ErrorResponse>({ erro }, 502);
  }
  throw err;
}

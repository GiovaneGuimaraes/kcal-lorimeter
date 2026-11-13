import fs from "node:fs";
import path from "node:path";
import { createDb, type DbHandle, seedDefaultFoods, voiceLogs } from "@kcal/db";
import { ExtractionParseError, type ItemExtractor } from "@kcal/llm";
import { AuthResponseSchema, type ExtractedItem, VoiceReviewSchema } from "@kcal/shared";
import { createFakeTranscriber, SttHttpError, type Transcriber } from "@kcal/stt";
import type { Hono } from "hono";
import { createApp } from "../src/app";
import { MAX_AUDIO_BYTES } from "../src/routes/voice";
import type { VoiceProviders } from "../src/types";
import { ANA, postJson, TEST_SECRET } from "./helpers";

const BRUNO = { email: "bruno@exemplo.com", nome: "Bruno Teste", senha: "senha-do-bruno-123" };

/** Itens da frase inventada "200 g de arroz, 100 g de frango empanado e 1 xyz". */
const TRES_ITENS: ExtractedItem[] = [
  { alimento: "arroz", quantidade: 200, unidade: "g" },
  { alimento: "frango empanado", quantidade: 100, unidade: "g" },
  { alimento: "xyz", quantidade: 1, unidade: "unidade" },
];

const fakeExtractor = (itens: ExtractedItem[] = TRES_ITENS): ItemExtractor => ({
  extract: async () => itens,
});
const falhando = (err: unknown) => async () => {
  throw err;
};

/** Bytes inventados (não é áudio de ninguém). */
const bytesFalsos = (n = 16) => new Uint8Array(n).fill(7);

function formComAudio(bytes: Uint8Array = bytesFalsos(), type = "audio/m4a", campo = "audio") {
  const form = new FormData();
  form.append(campo, new Blob([bytes], { type }), "gravacao.m4a");
  return form;
}

describe("/voice", () => {
  let handle: DbHandle;
  let app: Hono;
  let tokenAna: string;
  let tokenBruno: string;

  async function montar(voice?: VoiceProviders) {
    handle = createDb({ path: ":memory:" });
    seedDefaultFoods(handle.db);
    app = createApp(
      voice
        ? { db: handle.db, jwtSecret: TEST_SECRET, voice }
        : { db: handle.db, jwtSecret: TEST_SECRET },
    );
    const registrar = async (p: typeof ANA) =>
      AuthResponseSchema.parse(await (await postJson(app, "/auth/register", p)).json()).token;
    tokenAna = await registrar(ANA);
    tokenBruno = await registrar(BRUNO);
  }

  const comFakes = (over: Partial<VoiceProviders> = {}) =>
    montar({
      transcriber: createFakeTranscriber("200 g de arroz, 100 g de frango empanado e 1 xyz"),
      extractor: fakeExtractor(),
      ...over,
    });

  afterEach(() => {
    jest.restoreAllMocks();
    handle.close();
  });

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
  const enviarAudio = (form: FormData, token: string | null = tokenAna) =>
    app.request("/voice", { method: "POST", headers: token ? auth(token) : {}, body: form });
  const enviarTexto = (body: unknown, token = tokenAna) =>
    app.request("/voice/text", {
      method: "POST",
      headers: { ...auth(token), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  const descartar = (id: string, token = tokenAna) =>
    app.request(`/voice/${id}/discard`, { method: "POST", headers: auth(token) });
  const logs = () => handle.db.select().from(voiceLogs).all();

  describe("POST /voice", () => {
    it("com fakes → 200 VoiceReview com 3 itens (exact/candidates/none) e voice_log da pessoa", async () => {
      await comFakes();
      const res = await enviarAudio(formComAudio());
      expect(res.status).toBe(200);
      const review = VoiceReviewSchema.parse(await res.json());
      expect(review.transcricao).toBe("200 g de arroz, 100 g de frango empanado e 1 xyz");
      expect(review.itens.map((i) => i.match.kind)).toEqual(["exact", "candidates", "none"]);
      expect(review.itens[0]?.gramas).toBe(200);

      const [log] = logs();
      expect(log).toMatchObject({
        id: review.voiceLogId,
        status: "pendente",
        extracaoJson: { origem: "voz", itens: TRES_ITENS },
      });
      const me = (await (await app.request("/me", { headers: auth(tokenAna) })).json()) as {
        id: string;
      };
      expect(log?.userId).toBe(me.id);
    });

    it("entrega ao STT os bytes e o mime enviados", async () => {
      const recebidos: { bytes: Uint8Array; mimeType: string }[] = [];
      const transcriber: Transcriber = {
        async transcribe(audio) {
          recebidos.push(audio);
          return { text: "200 g de arroz" };
        },
      };
      await comFakes({ transcriber });
      const bytes = bytesFalsos(32);
      expect((await enviarAudio(formComAudio(bytes, "audio/webm"))).status).toBe(200);
      expect(recebidos).toHaveLength(1);
      expect(Array.from(recebidos[0]?.bytes ?? [])).toEqual(Array.from(bytes));
      expect(recebidos[0]?.mimeType).toBe("audio/webm");
    });

    it("sem chaves (deps padrão) → 503 {erro}", async () => {
      await montar();
      const res = await enviarAudio(formComAudio());
      expect(res.status).toBe(503);
      expect(await res.json()).toEqual({
        erro: "Lançamento por voz indisponível: transcrição não configurada no servidor.",
      });
    });

    it("só sem a chave do LLM → 503", async () => {
      await comFakes({ extractor: null });
      const res = await enviarAudio(formComAudio());
      expect(res.status).toBe(503);
      expect(((await res.json()) as { erro: string }).erro).toMatch(/extração não configurada/);
    });

    it("sem token → 401 (antes do 503)", async () => {
      await montar();
      expect((await enviarAudio(formComAudio(), null)).status).toBe(401);
    });

    it("transcrição vazia → 422 com mensagem para a pessoa; nada gravado", async () => {
      await comFakes({ transcriber: createFakeTranscriber("   ") });
      const res = await enviarAudio(formComAudio());
      expect(res.status).toBe(422);
      expect(await res.json()).toEqual({ erro: "Não entendi o áudio. Tente de novo." });
      expect(logs()).toEqual([]);
    });

    it("arquivo vazio → 422", async () => {
      await comFakes();
      expect((await enviarAudio(formComAudio(new Uint8Array(0)))).status).toBe(422);
    });

    it("áudio acima de 5 MB → 413", async () => {
      await comFakes();
      const logo = await enviarAudio(formComAudio(new Uint8Array(MAX_AUDIO_BYTES + 1)));
      expect(logo.status).toBe(413);
      expect(await logo.json()).toEqual({ erro: "Áudio muito grande (máximo 5 MB)" });

      // Bem acima: barrado pelo limite do corpo, antes de montar o multipart.
      const muito = await enviarAudio(formComAudio(new Uint8Array(MAX_AUDIO_BYTES * 2)));
      expect(muito.status).toBe(413);
      expect(logs()).toEqual([]);
    });

    it("exatamente 5 MB → aceito", async () => {
      await comFakes();
      expect((await enviarAudio(formComAudio(new Uint8Array(MAX_AUDIO_BYTES)))).status).toBe(200);
    });

    it("arquivo que não é áudio → 400", async () => {
      await comFakes();
      const res = await enviarAudio(formComAudio(bytesFalsos(), "image/png"));
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ erro: "O arquivo enviado não é um áudio" });
    });

    it("sem o campo audio, ou campo de texto → 400", async () => {
      await comFakes();
      expect((await enviarAudio(formComAudio(bytesFalsos(), "audio/m4a", "outro"))).status).toBe(
        400,
      );
      const form = new FormData();
      form.append("audio", "nao sou arquivo");
      expect((await enviarAudio(form)).status).toBe(400);
    });

    it("corpo JSON em vez de multipart → 400", async () => {
      await comFakes();
      const res = await app.request("/voice", {
        method: "POST",
        headers: { ...auth(tokenAna), "Content-Type": "application/json" },
        body: JSON.stringify({ audio: "x" }),
      });
      expect(res.status).toBe(400);
    });

    it("falha HTTP do STT → 502 sem detalhe interno", async () => {
      jest.spyOn(console, "error").mockImplementation(() => {});
      await comFakes({
        transcriber: { transcribe: falhando(new SttHttpError(500, "corpo-interno-do-provedor")) },
      });
      const res = await enviarAudio(formComAudio());
      expect(res.status).toBe(502);
      const corpo = await res.text();
      expect(corpo).not.toMatch(/corpo-interno|500/);
      expect(JSON.parse(corpo)).toEqual({
        erro: "Não consegui transcrever o áudio agora. Tente de novo ou digite.",
      });
    });

    it("ExtractionParseError → 502; erro de rede do LLM → 502", async () => {
      jest.spyOn(console, "error").mockImplementation(() => {});
      await comFakes({ extractor: { extract: falhando(new ExtractionParseError("x")) } });
      const res = await enviarAudio(formComAudio());
      expect(res.status).toBe(502);
      expect(await res.json()).toEqual({
        erro: "Não consegui interpretar o que você disse. Tente de novo ou digite.",
      });
      handle.close();

      await comFakes({ extractor: { extract: falhando(new TypeError("fetch failed")) } });
      expect((await enviarAudio(formComAudio())).status).toBe(502);
      expect(logs()).toEqual([]);
    });

    it("não escreve nenhum arquivo em disco", async () => {
      await comFakes();
      const espioes = [
        jest.spyOn(fs, "writeFileSync"),
        jest.spyOn(fs, "writeFile"),
        jest.spyOn(fs, "createWriteStream"),
        jest.spyOn(fs.promises, "writeFile"),
      ];
      expect((await enviarAudio(formComAudio())).status).toBe(200);
      for (const e of espioes) expect(e).not.toHaveBeenCalled();
    });

    it("a rota não importa fs", () => {
      const codigo = fs.readFileSync(
        path.join(__dirname, "..", "src", "routes", "voice.ts"),
        "utf8",
      );
      expect(codigo).not.toMatch(/["'](node:)?fs(\/promises)?["']/);
    });
  });

  describe("POST /voice/text", () => {
    it("com extractor e sem STT → 200 VoiceReview, origem texto", async () => {
      await comFakes({ transcriber: null });
      const res = await enviarTexto({ texto: "  200 g de arroz, frango empanado e xyz " });
      expect(res.status).toBe(200);
      const review = VoiceReviewSchema.parse(await res.json());
      expect(review.transcricao).toBe("200 g de arroz, frango empanado e xyz");
      expect(review.itens).toHaveLength(3);
      expect(logs()[0]?.extracaoJson).toEqual({ origem: "texto", itens: TRES_ITENS });
    });

    it("sem chave do LLM → 503", async () => {
      await montar();
      const res = await enviarTexto({ texto: "arroz" });
      expect(res.status).toBe(503);
      expect(await res.json()).toEqual({
        erro: "Interpretação indisponível: extração não configurada no servidor.",
      });
    });

    it.each([
      [{}, "Texto é obrigatório"],
      [{ texto: "  " }, "Texto é obrigatório"],
      [{ texto: "a".repeat(501) }, "Texto deve ter no máximo 500 caracteres"],
    ])("body %j → 400", async (body, erro) => {
      await comFakes();
      const res = await enviarTexto(body);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ erro });
    });
  });

  describe("POST /voice/:id/discard", () => {
    const criarRevisao = async (token = tokenAna) =>
      VoiceReviewSchema.parse(await (await enviarTexto({ texto: "arroz" }, token)).json())
        .voiceLogId;
    const status = (id: string) => logs().find((l) => l.id === id)?.status;

    it("própria revisão pendente → 204 e status descartado", async () => {
      await comFakes();
      const id = await criarRevisao();
      const res = await descartar(id);
      expect(res.status).toBe(204);
      expect(await res.text()).toBe("");
      expect(status(id)).toBe("descartado");
    });

    it("de outro usuário → 404 e nada muda", async () => {
      await comFakes();
      const id = await criarRevisao(tokenAna);
      const res = await descartar(id, tokenBruno);
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ erro: "Registro de voz não encontrado" });
      expect(status(id)).toBe("pendente");
    });

    it("já descartado ou inexistente → 404", async () => {
      await comFakes();
      const id = await criarRevisao();
      expect((await descartar(id)).status).toBe(204);
      expect((await descartar(id)).status).toBe(404);
      expect((await descartar("nao-existe")).status).toBe(404);
    });

    it("funciona mesmo sem chaves (não chama STT/LLM)", async () => {
      await montar();
      expect((await descartar("nao-existe")).status).toBe(404);
    });
  });
});

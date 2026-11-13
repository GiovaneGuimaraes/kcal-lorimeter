import fs from "node:fs";
import path from "node:path";
import { type DbHandle, voiceLogs } from "@kcal/db";
import { ExtractionParseError } from "@kcal/llm";
import { VoiceReviewSchema } from "@kcal/shared";
import {
  createFakeTranscriber,
  SttEmptyTranscriptError,
  SttHttpError,
  type Transcriber,
} from "@kcal/stt";
import { eq } from "drizzle-orm";
import {
  discardVoiceLog,
  EmptyTranscriptError,
  processText,
  processVoice,
  type VoiceDeps,
  VoiceLogNotFoundError,
  VoiceProviderError,
  VoiceProviderUnavailableError,
} from "../src";
import { AUDIO_FALSO, criarAlimentoSemPorcao, fakeExtractor, setupDb, TRES_ITENS } from "./helpers";

describe("voice-core", () => {
  let handle: DbHandle;
  let ana: string;
  let bruno: string;

  beforeEach(() => {
    ({ handle, ana, bruno } = setupDb());
  });

  afterEach(() => {
    handle.close();
  });

  const deps = (over: Partial<VoiceDeps> = {}): VoiceDeps => ({
    db: handle.db,
    transcriber: createFakeTranscriber("  200 g de arroz, 100 g de frango empanado e 1 xyz  "),
    extractor: fakeExtractor(TRES_ITENS),
    ...over,
  });

  const logs = () => handle.db.select().from(voiceLogs).all();

  describe("processVoice", () => {
    it("frase com 3 itens → exact (com gramas), candidates e none; grava voice_log pendente", async () => {
      const extractor = fakeExtractor(TRES_ITENS);
      const review = await processVoice(deps({ extractor }), ana, AUDIO_FALSO);

      expect(VoiceReviewSchema.parse(review)).toEqual(review);
      expect(review.transcricao).toBe("200 g de arroz, 100 g de frango empanado e 1 xyz");
      expect(extractor.textos).toEqual(["200 g de arroz, 100 g de frango empanado e 1 xyz"]);
      expect(review.itens).toHaveLength(3);

      const [arroz, frango, xyz] = review.itens;
      expect(arroz?.extraido).toEqual(TRES_ITENS[0]);
      expect(arroz?.match.kind).toBe("exact");
      expect(arroz?.match.kind === "exact" && arroz.match.food.nome).toBe("Arroz branco cozido");
      expect(arroz?.gramas).toBe(200);
      expect(arroz?.precisaPeso).toBe(false);

      expect(frango?.match.kind).toBe("candidates");
      expect(
        frango?.match.kind === "candidates" && frango.match.foods.map((f) => f.nome).sort(),
      ).toEqual(["Peito de frango grelhado"]);
      expect(frango).not.toHaveProperty("gramas");
      expect(frango?.precisaPeso).toBe(false);

      expect(xyz?.match).toEqual({ kind: "none" });
      expect(xyz).not.toHaveProperty("gramas");
      expect(xyz?.precisaPeso).toBe(false);

      const salvos = logs();
      expect(salvos).toHaveLength(1);
      expect(salvos[0]).toMatchObject({
        id: review.voiceLogId,
        userId: ana,
        transcricao: "200 g de arroz, 100 g de frango empanado e 1 xyz",
        status: "pendente",
        extracaoJson: { origem: "voz", itens: TRES_ITENS },
      });
    });

    it("nunca devolve macros: a revisão só tem extraído, casamento e gramas", async () => {
      const review = await processVoice(deps(), ana, AUDIO_FALSO);
      const permitidas = new Set(["extraido", "match", "gramas", "precisaPeso"]);
      for (const item of review.itens) {
        expect(Object.keys(item).filter((k) => !permitidas.has(k))).toEqual([]);
        expect(item.extraido).not.toHaveProperty("kcal");
      }
    });

    it("passa o áudio ao transcriber como veio (bytes e mime)", async () => {
      const recebido: unknown[] = [];
      const transcriber: Transcriber = {
        async transcribe(audio) {
          recebido.push(audio);
          return { text: "200 g de arroz" };
        },
      };
      await processVoice(deps({ transcriber }), ana, AUDIO_FALSO);
      expect(recebido).toEqual([AUDIO_FALSO]);
    });

    it("gramas: g/ml 1:1; unidade com porção padrão multiplica; frango casa pelo apelido", async () => {
      const extractor = fakeExtractor([
        { alimento: "frango", quantidade: 150, unidade: "g" },
        { alimento: "leite integral", quantidade: 200, unidade: "ml" },
        { alimento: "pão francês", quantidade: 2, unidade: "unidade" },
        { alimento: "whey", quantidade: 1, unidade: "scoop" },
      ]);
      const review = await processVoice(deps({ extractor }), ana, AUDIO_FALSO);
      expect(review.itens.map((i) => i.match.kind)).toEqual(["exact", "exact", "exact", "exact"]);
      expect(review.itens.map((i) => i.gramas)).toEqual([150, 200, 100, 30]);
      expect(review.itens.every((i) => !i.precisaPeso)).toBe(true);
    });

    it("whey 1 scoop no alimento da pessoa sem porção → sem gramas e precisaPeso", async () => {
      const id = criarAlimentoSemPorcao(handle, ana, "Whey da Ana", ["whey"]);
      const extractor = fakeExtractor([{ alimento: "whey", quantidade: 1, unidade: "scoop" }]);
      const review = await processVoice(deps({ extractor }), ana, AUDIO_FALSO);
      const [whey] = review.itens;
      expect(whey?.match.kind === "exact" && whey.match.food.id).toBe(id);
      expect(whey).not.toHaveProperty("gramas");
      expect(whey?.precisaPeso).toBe(true);

      // Em g, o mesmo alimento converte normalmente.
      const emGramas = await processVoice(
        deps({ extractor: fakeExtractor([{ alimento: "whey", quantidade: 30, unidade: "g" }]) }),
        ana,
        AUDIO_FALSO,
      );
      expect(emGramas.itens[0]).toMatchObject({ gramas: 30, precisaPeso: false });
    });

    it("alimento de outra pessoa não casa", async () => {
      criarAlimentoSemPorcao(handle, bruno, "Bolo do Bruno", ["qwerty"]);
      const extractor = fakeExtractor([{ alimento: "qwerty", quantidade: 1, unidade: "fatia" }]);
      const review = await processVoice(deps({ extractor }), ana, AUDIO_FALSO);
      expect(review.itens[0]?.match).toEqual({ kind: "none" });
    });

    it("voice_log fica com o user_id de quem falou", async () => {
      const a = await processVoice(deps(), ana, AUDIO_FALSO);
      const b = await processVoice(deps(), bruno, AUDIO_FALSO);
      const porId = new Map(logs().map((l) => [l.id, l.userId]));
      expect(porId.get(a.voiceLogId)).toBe(ana);
      expect(porId.get(b.voiceLogId)).toBe(bruno);
    });

    it("extração sem itens → revisão vazia, voice_log gravado", async () => {
      const review = await processVoice(deps({ extractor: fakeExtractor([]) }), ana, AUDIO_FALSO);
      expect(review.itens).toEqual([]);
      expect(logs()).toHaveLength(1);
    });

    it.each([[""], ["   \n "]])(
      "transcrição vazia %j → EmptyTranscriptError, nada gravado",
      async (texto) => {
        const extractor = fakeExtractor(TRES_ITENS);
        await expect(
          processVoice(
            deps({ transcriber: createFakeTranscriber(texto), extractor }),
            ana,
            AUDIO_FALSO,
          ),
        ).rejects.toBeInstanceOf(EmptyTranscriptError);
        expect(extractor.textos).toEqual([]);
        expect(logs()).toEqual([]);
      },
    );

    it("SttEmptyTranscriptError do STT → EmptyTranscriptError", async () => {
      const transcriber: Transcriber = {
        transcribe: async () => {
          throw new SttEmptyTranscriptError();
        },
      };
      await expect(processVoice(deps({ transcriber }), ana, AUDIO_FALSO)).rejects.toThrow(
        "Não entendi o áudio. Tente de novo.",
      );
    });

    it("sem transcriber → VoiceProviderUnavailableError(stt)", async () => {
      const err = await processVoice(deps({ transcriber: null }), ana, AUDIO_FALSO).catch((e) => e);
      expect(err).toBeInstanceOf(VoiceProviderUnavailableError);
      expect(err.provider).toBe("stt");
      expect(logs()).toEqual([]);
    });

    it("sem extractor → VoiceProviderUnavailableError(llm) sem chamar o STT", async () => {
      const transcribe = jest.fn(async () => ({ text: "arroz" }));
      const err = await processVoice(
        deps({ transcriber: { transcribe }, extractor: null }),
        ana,
        AUDIO_FALSO,
      ).catch((e) => e);
      expect(err).toBeInstanceOf(VoiceProviderUnavailableError);
      expect(err.provider).toBe("llm");
      expect(transcribe).not.toHaveBeenCalled();
    });

    it("falha HTTP do STT → VoiceProviderError(stt) com a causa, nada gravado", async () => {
      const causa = new SttHttpError(500, "erro");
      const transcriber: Transcriber = {
        transcribe: async () => {
          throw causa;
        },
      };
      const err = await processVoice(deps({ transcriber }), ana, AUDIO_FALSO).catch((e) => e);
      expect(err).toBeInstanceOf(VoiceProviderError);
      expect(err.provider).toBe("stt");
      expect(err.cause).toBe(causa);
      expect(logs()).toEqual([]);
    });

    it.each([
      ["ExtractionParseError", new ExtractionParseError("fora do schema")],
      ["erro de rede", new TypeError("fetch failed")],
    ])("%s no LLM → VoiceProviderError(llm), nada gravado", async (_nome, causa) => {
      const extractor = {
        extract: async () => {
          throw causa;
        },
      };
      const err = await processVoice(deps({ extractor }), ana, AUDIO_FALSO).catch((e) => e);
      expect(err).toBeInstanceOf(VoiceProviderError);
      expect(err.provider).toBe("llm");
      expect(err.cause).toBe(causa);
      expect(logs()).toEqual([]);
    });
  });

  describe("processText", () => {
    it("mesmo fluxo sem STT; origem texto; funciona sem transcriber", async () => {
      const review = await processText(
        deps({ transcriber: null }),
        ana,
        "  200 g de arroz, frango empanado e xyz ",
      );
      expect(review.transcricao).toBe("200 g de arroz, frango empanado e xyz");
      expect(review.itens.map((i) => i.match.kind)).toEqual(["exact", "candidates", "none"]);
      expect(logs()[0]).toMatchObject({
        userId: ana,
        status: "pendente",
        transcricao: "200 g de arroz, frango empanado e xyz",
        extracaoJson: { origem: "texto", itens: TRES_ITENS },
      });
    });

    it("texto vazio após aparar → EmptyTranscriptError", async () => {
      await expect(processText(deps(), ana, "   ")).rejects.toBeInstanceOf(EmptyTranscriptError);
      expect(logs()).toEqual([]);
    });

    it("sem extractor → VoiceProviderUnavailableError(llm)", async () => {
      const err = await processText(deps({ extractor: null }), ana, "arroz").catch((e) => e);
      expect(err).toBeInstanceOf(VoiceProviderUnavailableError);
      expect(err.provider).toBe("llm");
    });
  });

  describe("discardVoiceLog", () => {
    const status = (id: string) =>
      handle.db.select().from(voiceLogs).where(eq(voiceLogs.id, id)).get()?.status;

    it("pendente da própria pessoa → descartado", async () => {
      const { voiceLogId } = await processVoice(deps(), ana, AUDIO_FALSO);
      discardVoiceLog(handle.db, ana, voiceLogId);
      expect(status(voiceLogId)).toBe("descartado");
    });

    it("de outra pessoa → VoiceLogNotFoundError e não muda nada", async () => {
      const { voiceLogId } = await processVoice(deps(), ana, AUDIO_FALSO);
      expect(() => discardVoiceLog(handle.db, bruno, voiceLogId)).toThrow(VoiceLogNotFoundError);
      expect(status(voiceLogId)).toBe("pendente");
    });

    it("já descartado ou confirmado → VoiceLogNotFoundError", async () => {
      const { voiceLogId } = await processVoice(deps(), ana, AUDIO_FALSO);
      discardVoiceLog(handle.db, ana, voiceLogId);
      expect(() => discardVoiceLog(handle.db, ana, voiceLogId)).toThrow(VoiceLogNotFoundError);

      const outro = await processVoice(deps(), ana, AUDIO_FALSO);
      handle.db
        .update(voiceLogs)
        .set({ status: "confirmado" })
        .where(eq(voiceLogs.id, outro.voiceLogId))
        .run();
      expect(() => discardVoiceLog(handle.db, ana, outro.voiceLogId)).toThrow(
        VoiceLogNotFoundError,
      );
      expect(status(outro.voiceLogId)).toBe("confirmado");
    });

    it("inexistente → VoiceLogNotFoundError", () => {
      expect(() => discardVoiceLog(handle.db, ana, "nao-existe")).toThrow(VoiceLogNotFoundError);
    });
  });

  describe("áudio não vai para disco", () => {
    it("nenhum arquivo do src importa fs", () => {
      const dir = path.join(__dirname, "..", "src");
      const arquivos = fs.readdirSync(dir).filter((f) => f.endsWith(".ts"));
      expect(arquivos.length).toBeGreaterThan(0);
      for (const f of arquivos) {
        const codigo = fs.readFileSync(path.join(dir, f), "utf8");
        expect({
          f,
          importaFs: /from\s+["'](node:)?fs(\/promises)?["']|require\(["'](node:)?fs/.test(codigo),
        }).toEqual({
          f,
          importaFs: false,
        });
      }
    });

    it("processVoice não escreve arquivo", async () => {
      const espioes = [
        jest.spyOn(fs, "writeFileSync"),
        jest.spyOn(fs, "writeFile"),
        jest.spyOn(fs, "createWriteStream"),
        jest.spyOn(fs.promises, "writeFile"),
      ];
      try {
        await processVoice(deps(), ana, AUDIO_FALSO);
        for (const e of espioes) expect(e).not.toHaveBeenCalled();
      } finally {
        for (const e of espioes) e.mockRestore();
      }
    });
  });
});

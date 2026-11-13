import { VoiceReviewItemSchema, VoiceReviewSchema, VoiceTextBodySchema } from "../src";

describe("VoiceTextBodySchema", () => {
  it("apara o texto", () => {
    expect(VoiceTextBodySchema.parse({ texto: "  200 g de arroz  " })).toEqual({
      texto: "200 g de arroz",
    });
  });

  it.each([
    [{}, "Texto é obrigatório"],
    [{ texto: "   " }, "Texto é obrigatório"],
    [{ texto: 42 }, "Texto é obrigatório"],
    [{ texto: "a".repeat(501) }, "Texto deve ter no máximo 500 caracteres"],
  ])("rejeita %j com mensagem em pt-BR", (body, msg) => {
    const r = VoiceTextBodySchema.safeParse(body);
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe(msg);
  });

  it("aceita exatamente 500 caracteres", () => {
    expect(VoiceTextBodySchema.safeParse({ texto: "a".repeat(500) }).success).toBe(true);
  });
});

describe("VoiceReviewSchema", () => {
  it("aceita item sem gramas (none) e item com gramas (exact)", () => {
    const food = {
      id: "f1",
      nome: "Arroz",
      apelidos: [],
      kcal100g: 100,
      proteina100g: 1,
      carbo100g: 1,
      gordura100g: 1,
      porcaoPadraoG: null,
      nomePorcao: null,
      fonte: "teste",
      isPadrao: true,
    };
    const review = {
      voiceLogId: "v1",
      transcricao: "200 g de arroz e xyz",
      itens: [
        {
          extraido: { alimento: "arroz", quantidade: 200, unidade: "g" },
          match: { kind: "exact", food },
          gramas: 200,
          precisaPeso: false,
        },
        {
          extraido: { alimento: "xyz", quantidade: 1, unidade: "unidade" },
          match: { kind: "none" },
          precisaPeso: false,
        },
      ],
    };
    expect(VoiceReviewSchema.parse(review)).toEqual(review);
  });

  describe("macros por item", () => {
    const semMacros = {
      extraido: { alimento: "arroz", quantidade: 200, unidade: "g" },
      match: { kind: "none" },
      gramas: 200,
      precisaPeso: false,
    };

    it("item com macros (sem arredondar) passa e os mantém", () => {
      const item = {
        ...semMacros,
        macros: { kcal: 256.4, proteinaG: 5.1, carboG: 56.2, gorduraG: 0.4 },
      };
      expect(VoiceReviewItemSchema.parse(item)).toEqual(item);
    });

    it("contrato antigo, sem macros, continua válido e não ganha macros", () => {
      const parsed = VoiceReviewItemSchema.parse(semMacros);
      expect(parsed).toEqual(semMacros);
      expect(parsed).not.toHaveProperty("macros");
    });

    it("macros com campo faltando falha", () => {
      const item = { ...semMacros, macros: { kcal: 256, proteinaG: 5, carboG: 56 } };
      expect(VoiceReviewItemSchema.safeParse(item).success).toBe(false);
    });

    it("macros com campo não numérico falha", () => {
      const item = { ...semMacros, macros: { kcal: "256", proteinaG: 5, carboG: 56, gorduraG: 0 } };
      expect(VoiceReviewItemSchema.safeParse(item).success).toBe(false);
    });
  });
});

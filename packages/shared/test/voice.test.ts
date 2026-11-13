import { VoiceReviewSchema, VoiceTextBodySchema } from "../src";

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
});

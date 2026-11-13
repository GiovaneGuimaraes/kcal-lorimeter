import type { DbHandle } from "@kcal/db";
import type { MatchFoodResult } from "@kcal/shared";
import { createFood, MAX_CANDIDATES, matchFood, SIMILARITY_THRESHOLD } from "../src";
import { alimento, setupDb } from "./helpers";

/** Nomes do resultado, para asserções legíveis. */
function nomes(r: MatchFoodResult): string[] {
  if (r.kind === "exact") return [r.food.nome];
  if (r.kind === "candidates") return r.foods.map((f) => f.nome);
  return [];
}

describe("matchFood", () => {
  let handle: DbHandle;
  let ana: string;
  let bruno: string;

  beforeEach(() => {
    ({ handle, ana, bruno } = setupDb());
  });

  afterEach(() => {
    handle.close();
  });

  const casar = (texto: string, userId = ana) => matchFood(handle.db, userId, texto);

  describe("etapa 1: nome ou apelido igual", () => {
    it('"arroz" casa exato com "Arroz branco cozido" pelo apelido', () => {
      const r = casar("arroz");
      expect(r.kind).toBe("exact");
      expect(nomes(r)).toEqual(["Arroz branco cozido"]);
      expect(r.kind === "exact" && r.food.isPadrao).toBe(true);
    });

    it("casa pelo nome completo", () => {
      expect(casar("arroz integral cozido")).toMatchObject({
        kind: "exact",
        food: { nome: "Arroz integral cozido" },
      });
    });

    it.each([["Frangô"], ["FRANGO"], ["  frangos "], ["frango!"]])(
      "%j (acento/caixa/plural/pontuação) casa com o frango do seed",
      (texto) => {
        // No seed, "frango" é apelido só do "Peito de frango grelhado".
        expect(casar(texto)).toMatchObject({
          kind: "exact",
          food: { nome: "Peito de frango grelhado" },
        });
      },
    );

    it.each([
      ["pães", "Pão francês"],
      ["aipim", "Mandioca cozida"],
      ["batata-doce", "Batata-doce cozida"],
      ["ovos", "Ovo cozido"],
      ["brocolis", "Brócolis cozido"],
    ])("%j → %j", (texto, esperado) => {
      expect(casar(texto)).toMatchObject({ kind: "exact", food: { nome: esperado } });
    });

    it('"frango" com dois frangos da pessoa → candidatos (os dela primeiro, depois o padrão)', () => {
      // O seed só tem um alimento com apelido "frango"; a ambiguidade vem dos cadastros dela.
      createFood(handle.db, ana, alimento("Frango cozido", ["frango"]));
      createFood(handle.db, ana, alimento("Sobrecoxa de frango assada", ["frango"]));

      const r = casar("frango");

      expect(r.kind).toBe("candidates");
      expect(nomes(r)).toEqual([
        "Frango cozido",
        "Sobrecoxa de frango assada",
        "Peito de frango grelhado",
      ]);
    });

    it("cadastros de outra pessoa não criam ambiguidade", () => {
      createFood(handle.db, bruno, alimento("Frango cozido", ["frango"]));
      createFood(handle.db, bruno, alimento("Frango assado", ["frango"]));

      expect(casar("frango", ana)).toMatchObject({
        kind: "exact",
        food: { nome: "Peito de frango grelhado" },
      });
      expect(casar("frango", bruno).kind).toBe("candidates");
    });

    it("o alimento da pessoa ganha o empate com o padrão → exato com o dela", () => {
      const meu = createFood(handle.db, ana, alimento("Arroz da casa", ["arroz"]));

      const r = casar("arroz");

      expect(r).toEqual({ kind: "exact", food: meu });
      // Para outra pessoa, o mesmo texto continua casando com o padrão.
      expect(casar("arroz", bruno)).toMatchObject({
        kind: "exact",
        food: { nome: "Arroz branco cozido" },
      });
    });

    it("nunca devolve alimento de outra pessoa", () => {
      createFood(handle.db, bruno, alimento("Shake do Bruno", ["shake"]));
      expect(casar("shake", ana)).toEqual({ kind: "none" });
      expect(casar("shake", bruno)).toMatchObject({
        kind: "exact",
        food: { nome: "Shake do Bruno" },
      });
    });
  });

  describe("etapa 2: trecho", () => {
    it("texto contido em nome/apelido → candidatos, menor diferença primeiro", () => {
      // "integral" está em "arroz integral" (dif. 6) e em "leite integral" (dif. 6) — empate pelo
      // nome mais curto.
      const r = casar("integral");
      expect(r.kind).toBe("candidates");
      expect(nomes(r)).toEqual(["Leite integral", "Arroz integral cozido"]);
    });

    it("prefixo: 'frang' → frango", () => {
      expect(casar("frang")).toMatchObject({
        kind: "candidates",
        foods: [{ nome: "Peito de frango grelhado" }],
      });
    });

    it("chave contida no texto como palavra inteira: 'ovo frito' → ovo", () => {
      expect(nomes(casar("ovo frito"))).toContain("Ovo cozido");
      expect(casar("ovo frito").kind).toBe("candidates");
    });

    it("chave contida no meio de outra palavra não vale: 'macarrao' não sai por trecho de 'maca'", () => {
      // Sem a exigência de palavra inteira, "maca" (apelido da maçã) estaria contido em
      // "macarrao". Aqui a maçã só aparece pela etapa 3 (similaridade 0,57), como candidata.
      expect(casar("macarrão")).toEqual({
        kind: "candidates",
        foods: [expect.objectContaining({ nome: "Maçã" })],
      });
    });

    it("texto com menos de 3 letras não entra na etapa de trecho", () => {
      // "ra" está dentro de "granola", "farinha"... mas é curto demais para valer como trecho.
      expect(casar("ra")).toEqual({ kind: "none" });
    });

    it(`limita a ${MAX_CANDIDATES} candidatos`, () => {
      for (let i = 0; i < 8; i++) createFood(handle.db, ana, alimento(`Bolo sabor ${i}`));
      const r = casar("bolo sabor");
      expect(r.kind).toBe("candidates");
      expect(nomes(r)).toHaveLength(MAX_CANDIDATES);
    });

    it("em empate de diferença, o da pessoa vem antes do padrão", () => {
      createFood(handle.db, ana, alimento("Leite de aveia"));
      // "leite" está em "leite integral" (padrão, apelido "leite" é igual → etapa 1). Use outro:
      // "aveia" é apelido exato da aveia padrão; "avei" é trecho dos dois.
      const r = casar("avei");
      expect(r.kind).toBe("candidates");
      // "aveia" (padrão, dif. 1) vence "leite de aveia" (dif. 10) pela diferença; a pessoa só ganha
      // em empate.
      expect(nomes(r)).toEqual(["Aveia em flocos", "Leite de aveia"]);

      createFood(handle.db, ana, alimento("Aveio"));
      // "avei" × "aveio" (da pessoa, dif. 1) empata com "aveia" (padrão, dif. 1): a dela primeiro.
      expect(nomes(casar("avei")).slice(0, 2)).toEqual(["Aveio", "Aveia em flocos"]);
    });
  });

  describe(`etapa 3: similaridade (limiar ${SIMILARITY_THRESHOLD})`, () => {
    it('logo acima do limiar: "beterava" (0,53 com "beterraba") → candidato', () => {
      expect(casar("beterava")).toMatchObject({
        kind: "candidates",
        foods: [{ nome: "Beterraba cozida" }],
      });
    });

    it('no limiar (inclusivo): "chuxu" (0,50 com "chuchu") → candidato', () => {
      expect(casar("chuxu")).toMatchObject({
        kind: "candidates",
        foods: [{ nome: "Chuchu cozido" }],
      });
    });

    it('logo abaixo do limiar: "abobrinha" (0,44 com "abobora") → none', () => {
      expect(casar("abobrinha")).toEqual({ kind: "none" });
    });

    it("erro de transcrição comum: 'lentilia' → lentilha", () => {
      expect(nomes(casar("lentilia"))[0]).toBe("Lentilha cozida");
    });
  });

  describe("etapa 4: nada", () => {
    it('"xyz" → none', () => {
      expect(casar("xyz")).toEqual({ kind: "none" });
    });

    it("texto vazio ou só pontuação → none", () => {
      expect(casar("")).toEqual({ kind: "none" });
      expect(casar(" ?! ")).toEqual({ kind: "none" });
    });
  });
});

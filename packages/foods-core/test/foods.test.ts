import { type DbHandle, DEFAULT_FOODS, foods } from "@kcal/db";
import { eq } from "drizzle-orm";
import { ZodError } from "zod";
import {
  createFood,
  FoodAlreadyExistsError,
  FoodNotFoundError,
  listFoods,
  updateFood,
} from "../src";
import { alimento, setupDb } from "./helpers";

describe("listFoods / createFood / updateFood", () => {
  let handle: DbHandle;
  let ana: string;
  let bruno: string;

  beforeEach(() => {
    ({ handle, ana, bruno } = setupDb());
  });

  afterEach(() => {
    handle.close();
  });

  describe("listFoods", () => {
    it("devolve os padrões + os da pessoa, nunca os de outra", () => {
      const daAna = createFood(handle.db, ana, alimento("Bolo da vó"));
      const doBruno = createFood(handle.db, bruno, alimento("Shake do Bruno"));

      const lista = listFoods(handle.db, ana);
      const ids = lista.map((f) => f.id);

      expect(lista).toHaveLength(DEFAULT_FOODS.length + 1);
      expect(ids).toContain(daAna.id);
      expect(ids).not.toContain(doBruno.id);
      expect(lista.filter((f) => !f.isPadrao).map((f) => f.nome)).toEqual(["Bolo da vó"]);
    });

    it("não expõe user_id e marca isPadrao", () => {
      createFood(handle.db, ana, alimento("Bolo da vó"));
      const lista = listFoods(handle.db, ana);
      for (const f of lista) {
        expect(f).not.toHaveProperty("userId");
        expect(f).not.toHaveProperty("user_id");
      }
      expect(lista.find((f) => f.nome === "Bolo da vó")?.isPadrao).toBe(false);
      expect(lista.find((f) => f.nome === "Arroz branco cozido")?.isPadrao).toBe(true);
    });

    it("filtra por nome ou apelido, ignorando caixa, acento e plural", () => {
      createFood(handle.db, ana, alimento("Bolo de cenoura"));
      createFood(handle.db, bruno, alimento("Cenoura ralada do Bruno"));

      const nomes = listFoods(handle.db, ana, { q: "CENOURAS" }).map((f) => f.nome);
      expect(nomes).toEqual(["Bolo de cenoura", "Cenoura crua"]);

      // "aipim" é apelido da mandioca cozida.
      expect(listFoods(handle.db, ana, { q: "aipim" }).map((f) => f.nome)).toEqual([
        "Mandioca cozida",
      ]);
      expect(listFoods(handle.db, ana, { q: "Feijão" }).map((f) => f.nome)).toEqual([
        "Feijão carioca cozido",
        "Feijão preto cozido",
      ]);
      expect(listFoods(handle.db, ana, { q: "xyz" })).toEqual([]);
    });

    it("q vazio (ou só pontuação) não filtra", () => {
      expect(listFoods(handle.db, ana, { q: " - " })).toHaveLength(DEFAULT_FOODS.length);
    });

    it("ordena por nome normalizado", () => {
      const nomes = listFoods(handle.db, ana, { q: "arroz" }).map((f) => f.nome);
      expect(nomes).toEqual(["Arroz branco cozido", "Arroz integral cozido"]);
    });
  });

  describe("createFood", () => {
    it("grava com user_id da pessoa e defaults (apelidos [], fonte 'cadastro da pessoa')", () => {
      const criado = createFood(handle.db, ana, {
        nome: "  Pão de queijo caseiro ",
        kcal100g: 300,
        proteina100g: 5.5,
        carbo100g: 35,
        gordura100g: 15,
      });

      expect(criado).toEqual({
        id: expect.any(String),
        nome: "Pão de queijo caseiro",
        apelidos: [],
        kcal100g: 300,
        proteina100g: 5.5,
        carbo100g: 35,
        gordura100g: 15,
        porcaoPadraoG: null,
        nomePorcao: null,
        fonte: "cadastro da pessoa",
        isPadrao: false,
      });
      const linha = handle.db.select().from(foods).where(eq(foods.id, criado.id)).get();
      expect(linha?.userId).toBe(ana);
    });

    it("aceita porção padrão, nome da porção, apelidos e fonte", () => {
      const criado = createFood(handle.db, ana, {
        ...alimento("Whey da marca X", ["whey x"]),
        porcaoPadraoG: 30,
        nomePorcao: "scoop",
        fonte: "rótulo",
      });
      expect(criado).toMatchObject({
        apelidos: ["whey x"],
        porcaoPadraoG: 30,
        nomePorcao: "scoop",
        fonte: "rótulo",
      });
    });

    it("aceita macros 0", () => {
      const criado = createFood(handle.db, ana, {
        nome: "Água",
        kcal100g: 0,
        proteina100g: 0,
        carbo100g: 0,
        gordura100g: 0,
      });
      expect(criado.kcal100g).toBe(0);
    });

    it.each([
      ["nome vazio", { ...alimento("  ") }],
      ["nome com 81 caracteres", alimento("a".repeat(81))],
      ["macro negativo", { ...alimento("X"), kcal100g: -1 }],
      ["porção 0", { ...alimento("X"), porcaoPadraoG: 0 }],
      [
        "11 apelidos",
        alimento(
          "X",
          Array.from({ length: 11 }, (_, i) => `apelido ${i}`),
        ),
      ],
    ])("rejeita %s com ZodError", (_caso, input) => {
      expect(() => createFood(handle.db, ana, input)).toThrow(ZodError);
    });

    it("nome repetido da mesma pessoa (caixa/acento diferentes) → FoodAlreadyExistsError", () => {
      createFood(handle.db, ana, alimento("Bolo da vó"));
      expect(() => createFood(handle.db, ana, alimento("BOLO DA VO"))).toThrow(
        FoodAlreadyExistsError,
      );
    });

    it("mesmo nome em pessoas diferentes, ou igual a um padrão, é permitido", () => {
      createFood(handle.db, ana, alimento("Bolo da vó"));
      expect(() => createFood(handle.db, bruno, alimento("Bolo da vó"))).not.toThrow();
      expect(() => createFood(handle.db, ana, alimento("Arroz branco cozido"))).not.toThrow();
    });
  });

  describe("updateFood", () => {
    it("altera só os campos enviados de um alimento da pessoa", () => {
      const criado = createFood(handle.db, ana, {
        ...alimento("Bolo da vó", ["bolo"]),
        porcaoPadraoG: 80,
        nomePorcao: "fatia",
      });

      const alterado = updateFood(handle.db, ana, criado.id, { kcal100g: 350, apelidos: [] });

      expect(alterado).toEqual({ ...criado, kcal100g: 350, apelidos: [] });
    });

    it("null limpa a porção padrão", () => {
      const criado = createFood(handle.db, ana, { ...alimento("Bolo"), porcaoPadraoG: 80 });
      expect(updateFood(handle.db, ana, criado.id, { porcaoPadraoG: null }).porcaoPadraoG).toBe(
        null,
      );
    });

    it("alimento padrão → FoodNotFoundError (e não altera)", () => {
      const arroz = listFoods(handle.db, ana, { q: "arroz branco" })[0];
      expect(arroz?.isPadrao).toBe(true);

      expect(() => updateFood(handle.db, ana, arroz?.id ?? "", { kcal100g: 1 })).toThrow(
        FoodNotFoundError,
      );
      const linha = handle.db
        .select()
        .from(foods)
        .where(eq(foods.id, arroz?.id ?? ""))
        .get();
      expect(linha?.kcal100g).toBe(128);
    });

    it("alimento de outra pessoa → FoodNotFoundError (e não altera)", () => {
      const doBruno = createFood(handle.db, bruno, alimento("Shake do Bruno"));
      expect(() => updateFood(handle.db, ana, doBruno.id, { nome: "Roubado" })).toThrow(
        FoodNotFoundError,
      );
      expect(listFoods(handle.db, bruno, { q: "shake" })[0]?.nome).toBe("Shake do Bruno");
    });

    it("id inexistente → FoodNotFoundError", () => {
      expect(() => updateFood(handle.db, ana, "nao-existe", { kcal100g: 1 })).toThrow(
        FoodNotFoundError,
      );
    });

    it("renomear para o nome de outro alimento dela → FoodAlreadyExistsError; o próprio nome, ok", () => {
      createFood(handle.db, ana, alimento("Bolo da vó"));
      const outro = createFood(handle.db, ana, alimento("Torta"));

      expect(() => updateFood(handle.db, ana, outro.id, { nome: "bolo da vo" })).toThrow(
        FoodAlreadyExistsError,
      );
      expect(updateFood(handle.db, ana, outro.id, { nome: "TORTA" }).nome).toBe("TORTA");
    });

    it("patch vazio ou inválido → ZodError", () => {
      const criado = createFood(handle.db, ana, alimento("Bolo"));
      expect(() => updateFood(handle.db, ana, criado.id, {})).toThrow(ZodError);
      expect(() => updateFood(handle.db, ana, criado.id, { gordura100g: -2 })).toThrow(ZodError);
    });
  });
});

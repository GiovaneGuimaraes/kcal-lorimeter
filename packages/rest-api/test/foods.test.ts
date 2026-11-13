import { DEFAULT_FOODS, seedDefaultFoods } from "@kcal/db";
import {
  AuthResponseSchema,
  FoodDtoSchema,
  ListFoodsResponseSchema,
  MatchFoodResultSchema,
} from "@kcal/shared";
import { ANA, makeTestApp, postJson, type TestApp } from "./helpers";

/** Outra pessoa inventada. */
const BRUNO = { email: "bruno@exemplo.com", nome: "Bruno Teste", senha: "senha-do-bruno-123" };

/** Alimento inventado (macros fictícios, só para teste). */
const alimento = (nome: string, apelidos: string[] = []) => ({
  nome,
  apelidos,
  kcal100g: 100,
  proteina100g: 10,
  carbo100g: 10,
  gordura100g: 1,
});

describe("/foods", () => {
  let t: TestApp;
  let tokenAna: string;
  let tokenBruno: string;

  beforeEach(async () => {
    t = makeTestApp();
    seedDefaultFoods(t.handle.db);
    const registrar = async (pessoa: typeof ANA) =>
      AuthResponseSchema.parse(await (await postJson(t.app, "/auth/register", pessoa)).json())
        .token;
    tokenAna = await registrar(ANA);
    tokenBruno = await registrar(BRUNO);
  });

  afterEach(() => {
    t.handle.close();
  });

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
  const get = (path: string, token = tokenAna) => t.app.request(path, { headers: auth(token) });
  const send = (method: "POST" | "PATCH", path: string, body: unknown, token = tokenAna) =>
    t.app.request(path, {
      method,
      headers: { ...auth(token), "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    });
  const criar = async (body: unknown, token = tokenAna) => {
    const res = await send("POST", "/foods", body, token);
    expect(res.status).toBe(201);
    return FoodDtoSchema.parse(await res.json());
  };

  describe("autenticação", () => {
    it.each([
      ["GET", "/foods"],
      ["GET", "/foods/match?texto=arroz"],
      ["POST", "/foods"],
      ["PATCH", "/foods/qualquer"],
    ])("%s %s sem token → 401", async (method, path) => {
      const res = await t.app.request(path, { method });
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ erro: "Não autenticado" });
    });
  });

  describe("GET /foods", () => {
    it("lista padrões + os da pessoa, nunca os de outra", async () => {
      const daAna = await criar(alimento("Bolo da vó"));
      const doBruno = await criar(alimento("Shake do Bruno"), tokenBruno);

      const res = await get("/foods");

      expect(res.status).toBe(200);
      const { foods } = ListFoodsResponseSchema.parse(await res.json());
      const ids = foods.map((f) => f.id);
      expect(foods).toHaveLength(DEFAULT_FOODS.length + 1);
      expect(ids).toContain(daAna.id);
      expect(ids).not.toContain(doBruno.id);
      for (const f of foods) expect(f).not.toHaveProperty("userId");
    });

    it("filtra por ?q= (nome ou apelido, sem acento/caixa)", async () => {
      const res = await get(`/foods?q=${encodeURIComponent("FEIJÃO")}`);
      const { foods } = ListFoodsResponseSchema.parse(await res.json());
      expect(foods.map((f) => f.nome)).toEqual(["Feijão carioca cozido", "Feijão preto cozido"]);
    });

    it.each([["/foods?q="], ["/foods?q=%20%20"]])("%s → 400", async (path) => {
      const res = await get(path);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ erro: "Parâmetro q não pode ser vazio" });
    });
  });

  describe("POST /foods", () => {
    it("cadastra para a pessoa → 201 com FoodDto (isPadrao false, fonte default)", async () => {
      const res = await send("POST", "/foods", alimento("Bolo da vó", ["bolo"]));

      expect(res.status).toBe(201);
      expect(await res.json()).toEqual({
        id: expect.any(String),
        nome: "Bolo da vó",
        apelidos: ["bolo"],
        kcal100g: 100,
        proteina100g: 10,
        carbo100g: 10,
        gordura100g: 1,
        porcaoPadraoG: null,
        nomePorcao: null,
        fonte: "cadastro da pessoa",
        isPadrao: false,
      });
    });

    it.each([
      [{ ...alimento("X"), kcal100g: -5 }, "Kcal por 100 g não pode ser negativo"],
      [{ ...alimento(""), nome: "" }, "Nome é obrigatório"],
      [{ ...alimento("X"), porcaoPadraoG: 0 }, "Porção padrão deve ser maior que zero"],
      ["{nao e json", "Corpo da requisição deve ser um JSON válido"],
    ])("body inválido %j → 400", async (body, erro) => {
      const res = await send("POST", "/foods", body);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ erro });
    });

    it("nome repetido da mesma pessoa → 409; de outra pessoa, ok", async () => {
      await criar(alimento("Bolo da vó"));

      const repetido = await send("POST", "/foods", alimento("bolo da VO"));
      expect(repetido.status).toBe(409);
      expect(await repetido.json()).toEqual({ erro: "Você já tem um alimento com este nome" });

      await criar(alimento("Bolo da vó"), tokenBruno);
    });
  });

  describe("PATCH /foods/:id", () => {
    it("altera um alimento da pessoa → 200", async () => {
      const criado = await criar(alimento("Bolo da vó"));

      const res = await send("PATCH", `/foods/${criado.id}`, { kcal100g: 320 });

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ...criado, kcal100g: 320 });
    });

    it("alimento padrão → 404", async () => {
      const { foods } = ListFoodsResponseSchema.parse(
        await (await get("/foods?q=arroz%20branco")).json(),
      );
      const arroz = foods[0];
      expect(arroz?.isPadrao).toBe(true);

      const res = await send("PATCH", `/foods/${arroz?.id}`, { kcal100g: 1 });

      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ erro: "Alimento não encontrado" });
    });

    it("alimento de outra pessoa → 404", async () => {
      const doBruno = await criar(alimento("Shake do Bruno"), tokenBruno);
      const res = await send("PATCH", `/foods/${doBruno.id}`, { nome: "Meu agora" });
      expect(res.status).toBe(404);
    });

    it("id inexistente → 404", async () => {
      const res = await send("PATCH", "/foods/nao-existe", { kcal100g: 1 });
      expect(res.status).toBe(404);
    });

    it("renomear para nome de outro alimento dela → 409", async () => {
      await criar(alimento("Bolo da vó"));
      const torta = await criar(alimento("Torta"));
      const res = await send("PATCH", `/foods/${torta.id}`, { nome: "Bolo da vó" });
      expect(res.status).toBe(409);
    });

    it("patch vazio → 400", async () => {
      const criado = await criar(alimento("Bolo"));
      const res = await send("PATCH", `/foods/${criado.id}`, {});
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ erro: "Informe pelo menos um campo para alterar" });
    });
  });

  describe("GET /foods/match", () => {
    const casar = async (texto: string, token = tokenAna) => {
      const res = await get(`/foods/match?texto=${encodeURIComponent(texto)}`, token);
      expect(res.status).toBe(200);
      return MatchFoodResultSchema.parse(await res.json());
    };

    it('"arroz" → exato com "Arroz branco cozido" (apelido)', async () => {
      expect(await casar("arroz")).toMatchObject({
        kind: "exact",
        food: { nome: "Arroz branco cozido", isPadrao: true },
      });
    });

    it('"Frangô" (acento/caixa) casa com o frango do seed', async () => {
      expect(await casar("Frangô")).toMatchObject({
        kind: "exact",
        food: { nome: "Peito de frango grelhado" },
      });
    });

    it('"frango" com dois frangos cadastrados pela pessoa → candidatos', async () => {
      // No seed, "frango" é apelido só do peito grelhado; a ambiguidade vem dos cadastros.
      await criar(alimento("Frango cozido", ["frango"]));
      await criar(alimento("Frango assado", ["frango"]));

      const r = await casar("frango");

      expect(r.kind).toBe("candidates");
      // Os dela primeiro (mesmo tamanho de nome → alfabética), depois o padrão.
      expect(r.kind === "candidates" && r.foods.map((f) => f.nome)).toEqual([
        "Frango assado",
        "Frango cozido",
        "Peito de frango grelhado",
      ]);
    });

    it("alimento próprio ganha o empate com o padrão", async () => {
      const meu = await criar(alimento("Arroz da casa", ["arroz"]));
      expect(await casar("arroz")).toEqual({ kind: "exact", food: meu });
      expect(await casar("arroz", tokenBruno)).toMatchObject({
        kind: "exact",
        food: { nome: "Arroz branco cozido" },
      });
    });

    it('"xyz" → none', async () => {
      expect(await casar("xyz")).toEqual({ kind: "none" });
    });

    it("não casa com alimento de outra pessoa", async () => {
      await criar(alimento("Shake do Bruno", ["shake"]), tokenBruno);
      expect(await casar("shake")).toEqual({ kind: "none" });
    });

    it.each([["/foods/match"], ["/foods/match?texto="], ["/foods/match?texto=%20"]])(
      "%s → 400",
      async (path) => {
        const res = await get(path);
        expect(res.status).toBe(400);
        expect(await res.json()).toEqual({ erro: "Parâmetro texto é obrigatório" });
      },
    );
  });
});

import { verifySession } from "@kcal/auth-core";
import { type Db, users } from "@kcal/db";
import { AuthResponseSchema } from "@kcal/shared";
import { createApp } from "../src/app";
import { ANA, makeTestApp, postJson, TEST_SECRET, type TestApp } from "./helpers";

describe("POST /auth/register", () => {
  let t: TestApp;

  beforeEach(() => {
    t = makeTestApp();
  });

  afterEach(() => {
    t.handle.close();
  });

  it("cria a conta e devolve 201 com {token, user}", async () => {
    const res = await postJson(t.app, "/auth/register", { ...ANA, email: " ANA@Exemplo.com " });

    expect(res.status).toBe(201);
    const body = AuthResponseSchema.parse(await res.json());
    expect(body.user).toEqual({ id: expect.any(String), email: ANA.email, nome: ANA.nome });
    await expect(verifySession(body.token, TEST_SECRET)).resolves.toEqual({
      userId: body.user.id,
    });
    // A resposta nunca leva o hash.
    expect(JSON.stringify(body)).not.toMatch(/scrypt|senha/i);
  });

  it("e-mail duplicado → 409", async () => {
    await postJson(t.app, "/auth/register", ANA);
    const res = await postJson(t.app, "/auth/register", {
      ...ANA,
      email: "Ana@Exemplo.com",
      nome: "Outra Ana",
    });

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ erro: "E-mail já cadastrado" });
    expect(t.handle.db.select().from(users).all()).toHaveLength(1);
  });

  it.each([
    [{ ...ANA, email: "nao-e-email" }, "E-mail inválido"],
    [{ ...ANA, nome: "" }, "Nome é obrigatório"],
    [{ ...ANA, nome: "a".repeat(81) }, "Nome deve ter no máximo 80 caracteres"],
    [{ ...ANA, senha: "curta" }, "Senha deve ter pelo menos 8 caracteres"],
    [{ email: ANA.email, nome: ANA.nome }, "Senha é obrigatória"],
    [null, "Corpo da requisição deve ser um objeto JSON"],
    [[ANA], "Corpo da requisição deve ser um objeto JSON"],
    ["{nao é json", "Corpo da requisição deve ser um JSON válido"],
  ])("body inválido %j → 400 com mensagem em pt-BR", async (body, erro) => {
    const res = await postJson(t.app, "/auth/register", body);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ erro });
    expect(t.handle.db.select().from(users).all()).toHaveLength(0);
  });

  it("erro inesperado → 500 com {erro} genérico, sem stack nem mensagem interna", async () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    // Banco falso que lança em qualquer consulta. (Fechar o banco real não serve: o erro nativo do
    // better-sqlite3 vem de outro realm no Jest e o Hono não o reconhece como `Error`.)
    const dbQuebrado = {
      select: () => {
        throw new Error("detalhe-interno-secreto");
      },
    } as unknown as Db;
    const app = createApp({ db: dbQuebrado, jwtSecret: TEST_SECRET });

    const res = await postJson(app, "/auth/register", ANA);

    expect(res.status).toBe(500);
    const texto = await res.text();
    expect(JSON.parse(texto)).toEqual({
      erro: "Erro interno do servidor",
      id: expect.any(String),
    });
    expect(texto).not.toMatch(/detalhe-interno-secreto|at |\.ts/);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe("POST /auth/login", () => {
  let t: TestApp;

  beforeEach(async () => {
    t = makeTestApp();
    await postJson(t.app, "/auth/register", ANA);
  });

  afterEach(() => {
    t.handle.close();
  });

  it("credenciais certas → 200 com {token, user}", async () => {
    const res = await postJson(t.app, "/auth/login", {
      email: "ANA@exemplo.com",
      senha: ANA.senha,
    });

    expect(res.status).toBe(200);
    const body = AuthResponseSchema.parse(await res.json());
    expect(body.user).toEqual({ id: expect.any(String), email: ANA.email, nome: ANA.nome });
    await expect(verifySession(body.token, TEST_SECRET)).resolves.toEqual({
      userId: body.user.id,
    });
  });

  it("senha errada → 401", async () => {
    const res = await postJson(t.app, "/auth/login", { email: ANA.email, senha: "senha-errada" });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ erro: "E-mail ou senha inválidos" });
  });

  it("e-mail inexistente → 401 com a mesma mensagem da senha errada", async () => {
    const res = await postJson(t.app, "/auth/login", {
      email: "ninguem@exemplo.com",
      senha: ANA.senha,
    });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ erro: "E-mail ou senha inválidos" });
  });

  it.each([
    [{ email: ANA.email }, "Senha é obrigatória"],
    [{ senha: ANA.senha }, "E-mail é obrigatório"],
    [{ email: "", senha: ANA.senha }, "E-mail é obrigatório"],
  ])("body inválido %j → 400", async (body, erro) => {
    const res = await postJson(t.app, "/auth/login", body);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ erro });
  });
});

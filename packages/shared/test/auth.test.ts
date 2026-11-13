import { AuthResponseSchema, LoginBodySchema, RegisterBodySchema } from "../src";

// Dados inventados.
describe("RegisterBodySchema", () => {
  const valido = { email: "ana@exemplo.com", nome: "Ana", senha: "12345678" };

  it("aceita body válido e apara espaços de e-mail e nome", () => {
    expect(
      RegisterBodySchema.parse({ email: " ana@exemplo.com ", nome: " Ana ", senha: "12345678" }),
    ).toEqual(valido);
  });

  it.each([
    [{ ...valido, email: "nao-e-email" }, "E-mail inválido"],
    [{ ...valido, nome: "   " }, "Nome é obrigatório"],
    [{ ...valido, nome: "a".repeat(81) }, "Nome deve ter no máximo 80 caracteres"],
    [{ ...valido, senha: "1234567" }, "Senha deve ter pelo menos 8 caracteres"],
  ])("rejeita %j com mensagem em pt-BR", (input, mensagem) => {
    const r = RegisterBodySchema.safeParse(input);
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe(mensagem);
  });

  it("aceita nome com exatamente 80 caracteres", () => {
    expect(RegisterBodySchema.safeParse({ ...valido, nome: "a".repeat(80) }).success).toBe(true);
  });

  it.each([[{}], [null], [{ email: "ana@exemplo.com" }]])("rejeita %j", (input) => {
    expect(RegisterBodySchema.safeParse(input).success).toBe(false);
  });
});

describe("LoginBodySchema", () => {
  it("aceita e-mail e senha não vazios", () => {
    expect(LoginBodySchema.parse({ email: "ana@exemplo.com", senha: "x" })).toEqual({
      email: "ana@exemplo.com",
      senha: "x",
    });
  });

  it.each([[{ email: "", senha: "x" }], [{ email: "a@b.com", senha: "" }], [{}]])(
    "rejeita %j",
    (input) => {
      expect(LoginBodySchema.safeParse(input).success).toBe(false);
    },
  );
});

describe("AuthResponseSchema", () => {
  it("aceita token + user público", () => {
    const body = { token: "t", user: { id: "1", email: "ana@exemplo.com", nome: "Ana" } };
    expect(AuthResponseSchema.parse(body)).toEqual(body);
  });
});

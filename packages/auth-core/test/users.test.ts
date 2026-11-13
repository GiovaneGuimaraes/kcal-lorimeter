import { createDb, type DbHandle, users } from "@kcal/db";
import { eq } from "drizzle-orm";
import {
  authenticate,
  EmailAlreadyUsedError,
  getUserById,
  InvalidCredentialsError,
  registerUser,
} from "../src";
import * as verifyPasswordModule from "../src/verifyPassword";

// Pessoas inventadas, só para teste.
const ANA = { email: "  Ana@Exemplo.COM ", nome: " Ana Teste ", senha: "senha-da-ana-123" };

describe("registerUser / authenticate / getUserById", () => {
  let handle: DbHandle;

  beforeEach(() => {
    handle = createDb({ path: ":memory:" });
  });

  afterEach(() => {
    handle.close();
    jest.restoreAllMocks();
  });

  it("cria a conta com e-mail normalizado e só o hash da senha", async () => {
    const user = await registerUser(handle.db, ANA);

    expect(user).toEqual({ id: expect.any(String), email: "ana@exemplo.com", nome: "Ana Teste" });
    const linha = handle.db.select().from(users).where(eq(users.id, user.id)).get();
    expect(linha?.senhaHash).toMatch(/^scrypt\$16384\$/);
    expect(linha?.senhaHash).not.toContain(ANA.senha);
  });

  it("e-mail duplicado (mesmo com outra caixa/espaços) lança EmailAlreadyUsedError", async () => {
    await registerUser(handle.db, ANA);
    await expect(
      registerUser(handle.db, { email: "ANA@exemplo.com", nome: "Outra", senha: "outra-senha-1" }),
    ).rejects.toBeInstanceOf(EmailAlreadyUsedError);
    expect(handle.db.select().from(users).all()).toHaveLength(1);
  });

  it("dois cadastros simultâneos do mesmo e-mail: um passa, o outro dá EmailAlreadyUsedError", async () => {
    const resultados = await Promise.allSettled([
      registerUser(handle.db, ANA),
      registerUser(handle.db, ANA),
    ]);
    const ok = resultados.filter((r) => r.status === "fulfilled");
    const falhas = resultados.filter((r) => r.status === "rejected");
    expect(ok).toHaveLength(1);
    expect(falhas).toHaveLength(1);
    expect((falhas[0] as PromiseRejectedResult).reason).toBeInstanceOf(EmailAlreadyUsedError);
  });

  it("authenticate devolve a pessoa com a senha certa (e-mail em qualquer caixa)", async () => {
    const criado = await registerUser(handle.db, ANA);
    await expect(
      authenticate(handle.db, { email: "ANA@EXEMPLO.com ", senha: ANA.senha }),
    ).resolves.toEqual(criado);
  });

  it("authenticate com senha errada lança InvalidCredentialsError", async () => {
    await registerUser(handle.db, ANA);
    await expect(
      authenticate(handle.db, { email: ANA.email, senha: "senha-errada-123" }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it("e-mail inexistente lança o mesmo erro, com a mesma mensagem, e ainda roda um scrypt", async () => {
    await registerUser(handle.db, ANA);
    const spy = jest.spyOn(verifyPasswordModule, "verifyPassword");

    const inexistente = authenticate(handle.db, { email: "ninguem@exemplo.com", senha: "x" });
    await expect(inexistente).rejects.toBeInstanceOf(InvalidCredentialsError);
    const senhaErrada = authenticate(handle.db, { email: ANA.email, senha: "x" });
    await expect(senhaErrada).rejects.toBeInstanceOf(InvalidCredentialsError);

    const msgs = await Promise.all([
      inexistente.catch((e: Error) => e.message),
      senhaErrada.catch((e: Error) => e.message),
    ]);
    expect(msgs[0]).toBe(msgs[1]);
    // Uma verificação de senha em cada caminho: o tempo de resposta não denuncia o e-mail.
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("getUserById devolve só os dados públicos, ou null", async () => {
    const criado = await registerUser(handle.db, ANA);
    expect(getUserById(handle.db, criado.id)).toEqual(criado);
    expect(getUserById(handle.db, "id-que-nao-existe")).toBeNull();
  });
});

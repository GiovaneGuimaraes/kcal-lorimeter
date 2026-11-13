import { hashPassword, verifyPassword } from "../src";

// Senhas inventadas, só para teste.
describe("hashPassword / verifyPassword", () => {
  it("gera hash no formato scrypt$N$salt$hash, diferente da senha", async () => {
    const hash = await hashPassword("senha-de-teste-123");

    expect(hash).not.toBe("senha-de-teste-123");
    expect(hash).not.toContain("senha-de-teste-123");
    const partes = hash.split("$");
    expect(partes).toHaveLength(4);
    expect(partes[0]).toBe("scrypt");
    expect(partes[1]).toBe("16384");
    expect(Buffer.from(partes[2] ?? "", "base64")).toHaveLength(16);
    expect(Buffer.from(partes[3] ?? "", "base64")).toHaveLength(64);
  });

  it("verifica a senha certa", async () => {
    const hash = await hashPassword("senha-de-teste-123");
    await expect(verifyPassword("senha-de-teste-123", hash)).resolves.toBe(true);
  });

  it("recusa senha errada", async () => {
    const hash = await hashPassword("senha-de-teste-123");
    await expect(verifyPassword("senha-de-teste-124", hash)).resolves.toBe(false);
    await expect(verifyPassword("", hash)).resolves.toBe(false);
  });

  it("usa salt aleatório: mesma senha, hashes diferentes, ambos válidos", async () => {
    const a = await hashPassword("mesma-senha");
    const b = await hashPassword("mesma-senha");
    expect(a).not.toBe(b);
    await expect(verifyPassword("mesma-senha", a)).resolves.toBe(true);
    await expect(verifyPassword("mesma-senha", b)).resolves.toBe(true);
  });

  it("aceita senha com acentos e emoji", async () => {
    const hash = await hashPassword("açúcar-pão-🍞");
    await expect(verifyPassword("açúcar-pão-🍞", hash)).resolves.toBe(true);
    await expect(verifyPassword("acucar-pao-🍞", hash)).resolves.toBe(false);
  });

  it.each([
    [""],
    ["texto-qualquer"],
    ["bcrypt$16384$c2FsdA==$aGFzaA=="],
    ["scrypt$abc$c2FsdA==$aGFzaA=="],
    ["scrypt$1000$c2FsdA==$aGFzaA=="],
    ["scrypt$16384$$aGFzaA=="],
    ["scrypt$16384$c2FsdA==$"],
    ["scrypt$16384$c2FsdA==$aGFzaA==$extra"],
  ])("devolve false (sem lançar) para hash malformado %j", async (armazenado) => {
    await expect(verifyPassword("qualquer", armazenado)).resolves.toBe(false);
  });
});

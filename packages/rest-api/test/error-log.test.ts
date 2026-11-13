import type { Db } from "@kcal/db";
import { createApp } from "../src/app";
import { ANA, postJson, TEST_SECRET } from "./helpers";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function appQuebrado() {
  const db = {
    select: () => {
      throw new Error("frase sensível de teste");
    },
  } as unknown as Db;
  return createApp({ db, jwtSecret: TEST_SECRET });
}

describe("log do 500 sem dado sensível", () => {
  const envOriginal = process.env.NODE_ENV;
  afterEach(() => {
    process.env.NODE_ENV = envOriginal;
    jest.restoreAllMocks();
  });

  async function dispara() {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    const res = await postJson(appQuebrado(), "/auth/register", ANA);
    const corpo = (await res.json()) as { erro: string; id: string };
    expect(res.status).toBe(500);
    expect(corpo.erro).toBe("Erro interno do servidor");
    expect(corpo.id).toMatch(UUID);
    expect(res.headers.get("X-Request-Id")).toBe(corpo.id);
    const logado = spy.mock.calls.map((c) => c.map(String).join(" ")).join("\n");
    expect(logado).not.toContain("frase sensível");
    expect(logado).toContain(corpo.id);
    expect(logado).toContain("Error");
    return logado;
  }

  it("fora de produção: loga nome, id e frames, sem a mensagem", async () => {
    process.env.NODE_ENV = "test";
    const logado = await dispara();
    expect(logado).toContain(" at ");
  });

  it("em produção: só nome e id, sem stack", async () => {
    process.env.NODE_ENV = "production";
    const logado = await dispara();
    expect(logado).not.toContain(" at ");
  });
});

import { signSession } from "@kcal/auth-core";
import { users } from "@kcal/db";
import { AuthResponseSchema, MeResponseSchema } from "@kcal/shared";
import { eq } from "drizzle-orm";
import { ANA, makeTestApp, OTHER_SECRET, postJson, type TestApp } from "./helpers";

describe("GET /me", () => {
  let t: TestApp;
  let token: string;
  let userId: string;

  beforeEach(async () => {
    t = makeTestApp();
    const res = await postJson(t.app, "/auth/register", ANA);
    const body = AuthResponseSchema.parse(await res.json());
    token = body.token;
    userId = body.user.id;
  });

  afterEach(() => {
    t.handle.close();
  });

  const getMe = (authorization?: string) =>
    t.app.request("/me", authorization ? { headers: { Authorization: authorization } } : {});

  it("com token válido → 200 com {id, email, nome}", async () => {
    const res = await getMe(`Bearer ${token}`);

    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toEqual({ id: userId, email: ANA.email, nome: ANA.nome });
    expect(MeResponseSchema.safeParse(body).success).toBe(true);
  });

  it("aceita o esquema Bearer em qualquer caixa", async () => {
    const res = await getMe(`bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it("sem token → 401", async () => {
    const res = await getMe();

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ erro: "Não autenticado" });
    expect(res.headers.get("WWW-Authenticate")).toBe("Bearer");
  });

  it.each([["token-sem-esquema"], ["Basic abc"], ["Bearer"], ["Bearer "], ["Bearer a b"]])(
    "Authorization malformado %j → 401",
    async (header) => {
      const res = await getMe(header);
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ erro: "Não autenticado" });
    },
  );

  it("token válido sem o esquema Bearer → 401", async () => {
    const res = await getMe(token);
    expect(res.status).toBe(401);
  });

  it("token assinado com outro segredo → 401", async () => {
    const forjado = await signSession({ userId }, OTHER_SECRET);
    const res = await getMe(`Bearer ${forjado}`);

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ erro: "Sessão inválida ou expirada" });
  });

  it("token lixo → 401", async () => {
    const res = await getMe("Bearer nao.e.jwt");
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ erro: "Sessão inválida ou expirada" });
  });

  it("token válido de conta apagada → 401", async () => {
    t.handle.db.delete(users).where(eq(users.id, userId)).run();
    const res = await getMe(`Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ erro: "Sessão inválida ou expirada" });
  });
});

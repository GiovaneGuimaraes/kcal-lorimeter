import { SignJWT } from "jose";
import { InvalidSessionError, signSession, verifySession } from "../src";

const SECRET = "segredo-de-teste-com-mais-de-32-caracteres";
const OUTRO_SECRET = "outro-segredo-de-teste-com-mais-de-32-chars";
const key = (s: string) => new TextEncoder().encode(s);

function decodePayload(token: string): Record<string, unknown> {
  const parte = token.split(".")[1] ?? "";
  return JSON.parse(Buffer.from(parte, "base64url").toString("utf8")) as Record<string, unknown>;
}

describe("signSession / verifySession", () => {
  it("assina HS256 com sub = userId e exp em 30 dias, e verifica de volta", async () => {
    const antes = Math.floor(Date.now() / 1000);
    const token = await signSession({ userId: "user-1" }, SECRET);

    const header = JSON.parse(Buffer.from(token.split(".")[0] ?? "", "base64url").toString("utf8"));
    expect(header).toEqual({ alg: "HS256" });
    const payload = decodePayload(token);
    expect(payload.sub).toBe("user-1");
    const trintaDias = 30 * 24 * 60 * 60;
    expect(payload.exp).toBeGreaterThanOrEqual(antes + trintaDias);
    expect(payload.exp).toBeLessThanOrEqual(antes + trintaDias + 5);

    await expect(verifySession(token, SECRET)).resolves.toEqual({ userId: "user-1" });
  });

  it("recusa token assinado com outro segredo", async () => {
    const token = await signSession({ userId: "user-1" }, OUTRO_SECRET);
    await expect(verifySession(token, SECRET)).rejects.toBeInstanceOf(InvalidSessionError);
  });

  it("recusa token expirado", async () => {
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("user-1")
      .setIssuedAt(Math.floor(Date.now() / 1000) - 100)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 10)
      .sign(key(SECRET));
    await expect(verifySession(token, SECRET)).rejects.toBeInstanceOf(InvalidSessionError);
  });

  it("recusa token sem sub", async () => {
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(key(SECRET));
    await expect(verifySession(token, SECRET)).rejects.toBeInstanceOf(InvalidSessionError);
  });

  it("recusa token com alg diferente de HS256", async () => {
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "HS512" })
      .setSubject("user-1")
      .setExpirationTime("1h")
      .sign(key(SECRET));
    await expect(verifySession(token, SECRET)).rejects.toBeInstanceOf(InvalidSessionError);
  });

  it("recusa token com payload adulterado", async () => {
    const token = await signSession({ userId: "user-1" }, SECRET);
    const [h, , s] = token.split(".");
    const outroPayload = Buffer.from(
      JSON.stringify({ ...decodePayload(token), sub: "user-2" }),
    ).toString("base64url");
    await expect(verifySession(`${h}.${outroPayload}.${s}`, SECRET)).rejects.toBeInstanceOf(
      InvalidSessionError,
    );
  });

  it.each([[""], ["abc"], ["a.b.c"]])("recusa token malformado %j", async (token) => {
    await expect(verifySession(token, SECRET)).rejects.toBeInstanceOf(InvalidSessionError);
  });
});

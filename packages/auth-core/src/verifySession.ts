import { jwtVerify } from "jose";
import { InvalidSessionError } from "./errors";
import type { SessionClaims } from "./signSession";

/**
 * Valida o token (assinatura HS256, `exp`) e devolve o `userId` do `sub`. Qualquer falha —
 * malformado, expirado, outro segredo, outro algoritmo, sem `sub` — vira `InvalidSessionError`.
 */
export async function verifySession(token: string, secret: string): Promise<SessionClaims> {
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ["HS256"],
    });
    if (typeof payload.sub !== "string" || payload.sub.length === 0) {
      throw new InvalidSessionError();
    }
    return { userId: payload.sub };
  } catch {
    throw new InvalidSessionError();
  }
}

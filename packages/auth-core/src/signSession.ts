import { SignJWT } from "jose";

/** Validade do token de sessão. Sem refresh token no MVP: expirou, faz login de novo. */
export const SESSION_TTL = "30d";

export interface SessionClaims {
  userId: string;
}

/** Assina um JWT HS256 com `sub = userId`, expirando em 30 dias. */
export async function signSession({ userId }: SessionClaims, secret: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(SESSION_TTL)
    .sign(new TextEncoder().encode(secret));
}

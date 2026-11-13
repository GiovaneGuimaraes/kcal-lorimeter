import { type Db, users } from "@kcal/db";
import { eq } from "drizzle-orm";
import { InvalidCredentialsError } from "./errors";
import { hashPassword } from "./hashPassword";
import { normalizeEmail } from "./normalizeEmail";
import type { PublicUser } from "./types";
import { verifyPassword } from "./verifyPassword";

export interface AuthenticateInput {
  email: string;
  senha: string;
}

/**
 * Hash de uma senha aleatória, calculado uma vez por processo. Quando o e-mail não existe, a senha
 * é verificada contra ele, para a resposta demorar o mesmo que uma senha errada e não revelar
 * quais e-mails têm conta.
 */
let dummyHash: Promise<string> | undefined;
function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword(`dummy-${Math.random()}-${Date.now()}`);
  return dummyHash;
}

/**
 * Confere e-mail e senha. E-mail inexistente e senha errada lançam o mesmo
 * `InvalidCredentialsError`, com custo de tempo parecido (um scrypt nos dois casos).
 */
export async function authenticate(db: Db, input: AuthenticateInput): Promise<PublicUser> {
  const email = normalizeEmail(input.email);
  const user = db.select().from(users).where(eq(users.email, email)).get();

  if (!user) {
    await verifyPassword(input.senha, await getDummyHash());
    throw new InvalidCredentialsError();
  }

  const ok = await verifyPassword(input.senha, user.senhaHash);
  if (!ok) throw new InvalidCredentialsError();

  return { id: user.id, email: user.email, nome: user.nome };
}

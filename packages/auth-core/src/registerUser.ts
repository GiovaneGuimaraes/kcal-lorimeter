import { type Db, users } from "@kcal/db";
import { eq } from "drizzle-orm";
import { EmailAlreadyUsedError } from "./errors";
import { hashPassword } from "./hashPassword";
import { normalizeEmail } from "./normalizeEmail";
import type { PublicUser } from "./types";

export interface RegisterUserInput {
  email: string;
  nome: string;
  senha: string;
}

/**
 * Cria a conta. E-mail normalizado (`trim` + minúsculas); senha guardada só como hash scrypt.
 * Lança `EmailAlreadyUsedError` se o e-mail já tiver conta.
 */
export async function registerUser(db: Db, input: RegisterUserInput): Promise<PublicUser> {
  const email = normalizeEmail(input.email);
  const nome = input.nome.trim();

  const existente = db.select({ id: users.id }).from(users).where(eq(users.email, email)).get();
  if (existente) throw new EmailAlreadyUsedError();

  const senhaHash = await hashPassword(input.senha);

  try {
    // Entre a checagem acima e este insert (o hash é assíncrono) outra requisição pode ter
    // criado a mesma conta; o índice único do e-mail é a garantia final.
    const criado = db
      .insert(users)
      .values({ email, nome, senhaHash })
      .returning({ id: users.id, email: users.email, nome: users.nome })
      .get();
    return criado;
  } catch (err) {
    if (isUniqueEmailViolation(err)) throw new EmailAlreadyUsedError();
    throw err;
  }
}

function isUniqueEmailViolation(err: unknown): boolean {
  // better-sqlite3 lança SqliteError com code SQLITE_CONSTRAINT_UNIQUE; o Drizzle pode embrulhar
  // o erro original em `cause`.
  for (let e: unknown = err; e instanceof Error; e = e.cause) {
    if (
      (e as { code?: unknown }).code === "SQLITE_CONSTRAINT_UNIQUE" &&
      /users\.email/.test(e.message)
    ) {
      return true;
    }
  }
  return false;
}

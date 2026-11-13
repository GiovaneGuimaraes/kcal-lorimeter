import { randomBytes } from "node:crypto";
import { SCRYPT_N, scryptAsync } from "./scryptAsync";

const SALT_BYTES = 16;

/** Gera o hash no formato `scrypt$<N>$<salt-b64>$<hash-b64>`, com salt aleatório. */
export async function hashPassword(senha: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const hash = await scryptAsync(senha, salt, SCRYPT_N);
  return `scrypt$${SCRYPT_N}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

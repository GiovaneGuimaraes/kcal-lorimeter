import { timingSafeEqual } from "node:crypto";
import { scryptAsync } from "./scryptAsync";

/**
 * Confere a senha contra um hash `scrypt$<N>$<salt-b64>$<hash-b64>`. Comparação em tempo
 * constante. Hash malformado devolve `false` (não lança).
 */
export async function verifyPassword(senha: string, armazenado: string): Promise<boolean> {
  const partes = armazenado.split("$");
  if (partes.length !== 4 || partes[0] !== "scrypt") return false;
  const n = Number(partes[1]);
  // N do scrypt precisa ser potência de 2 maior que 1.
  if (!Number.isInteger(n) || n < 2 || (n & (n - 1)) !== 0) return false;
  const salt = Buffer.from(partes[2] ?? "", "base64");
  const esperado = Buffer.from(partes[3] ?? "", "base64");
  if (salt.length === 0 || esperado.length === 0) return false;

  const calculado = await scryptAsync(senha, salt, n);
  if (calculado.length !== esperado.length) return false;
  return timingSafeEqual(calculado, esperado);
}

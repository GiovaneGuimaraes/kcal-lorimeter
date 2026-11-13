import { scrypt } from "node:crypto";

/** Parâmetros do scrypt. N vai no próprio hash, para poder subir no futuro sem invalidar os antigos. */
export const SCRYPT_N = 16384;
export const SCRYPT_R = 8;
export const SCRYPT_P = 1;
export const SCRYPT_KEYLEN = 64;

/** Promise em volta de `crypto.scrypt` (o `promisify` perde o overload com `options`). */
export function scryptAsync(senha: string, salt: Buffer, n: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      senha,
      salt,
      SCRYPT_KEYLEN,
      { N: n, r: SCRYPT_R, p: SCRYPT_P, maxmem: 64 * 1024 * 1024 },
      (err, key) => (err ? reject(err) : resolve(key)),
    );
  });
}

/** Forma canônica do e-mail para guardar e buscar: sem espaços nas pontas, minúsculo. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

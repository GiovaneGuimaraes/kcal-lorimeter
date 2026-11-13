/**
 * Arredonda para `casas` decimais, com meio para longe do zero (half-up simétrico):
 * 0.05 → 0.1, 1.15 → 1.2, 2.5 → 3, -0.5 → -1.
 *
 * O valor escalado passa por `toPrecision(15)` antes de arredondar, para tirar o ruído de ponto
 * flutuante (1.15 × 10 = 11.499999999999998 vira 11.5). Nunca devolve -0.
 */
export function roundHalfUp(valor: number, casas: number): number {
  if (!Number.isFinite(valor)) return valor;
  const fator = 10 ** casas;
  const escalado = Number((Math.abs(valor) * fator).toPrecision(15));
  const arredondado = Math.floor(escalado + 0.5) / fator;
  if (arredondado === 0) return 0;
  return valor < 0 ? -arredondado : arredondado;
}

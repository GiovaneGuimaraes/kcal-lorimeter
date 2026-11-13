import { InvalidQuantityError } from "./errors";

/** Lança `InvalidQuantityError` se `n` for negativo, NaN ou não finito. Zero é válido. */
export function assertValidQuantity(n: number): void {
  if (!Number.isFinite(n) || n < 0) throw new InvalidQuantityError(n);
}

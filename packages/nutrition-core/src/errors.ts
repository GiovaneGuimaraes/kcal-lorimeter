import type { QuantityUnit } from "@kcal/shared";

/** Quantidade inválida: negativa, NaN ou não finita. Zero é válido. */
export class InvalidQuantityError extends Error {
  override readonly name = "InvalidQuantityError";

  constructor(readonly quantidade: number) {
    super(`Quantidade inválida: ${quantidade}`);
  }
}

/** Unidade que não é peso (`unidade`, `scoop`...) num alimento sem `porcaoPadraoG`. */
export class PortionRequiredError extends Error {
  override readonly name = "PortionRequiredError";

  constructor(readonly unidade: QuantityUnit) {
    super(`A unidade "${unidade}" exige porção padrão cadastrada no alimento`);
  }
}

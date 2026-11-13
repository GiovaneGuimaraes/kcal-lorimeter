import type { FoodMacrosPer100g, QuantityUnit } from "@kcal/shared";
import { assertValidQuantity } from "./assertValidQuantity";
import { PortionRequiredError } from "./errors";

/**
 * Converte quantidade + unidade em gramas.
 * `g` e `ml` valem 1:1 (ml tratado como grama). As demais unidades multiplicam a porção padrão
 * do alimento; sem porção (nula, ausente, zero ou não finita) lança `PortionRequiredError`.
 */
export function gramsFromQuantity(
  food: Pick<FoodMacrosPer100g, "porcaoPadraoG">,
  quantidade: number,
  unidade: QuantityUnit,
): number {
  assertValidQuantity(quantidade);
  if (unidade === "g" || unidade === "ml") return quantidade;
  const porcao = food.porcaoPadraoG;
  if (porcao == null || !Number.isFinite(porcao) || porcao <= 0) {
    throw new PortionRequiredError(unidade);
  }
  return quantidade * porcao;
}

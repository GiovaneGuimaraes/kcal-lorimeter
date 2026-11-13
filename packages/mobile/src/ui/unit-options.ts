import type { FoodDto, QuantityUnit } from "@kcal/shared";
import { formatGrams } from "./format";

/**
 * Unidades oferecidas no lançamento manual: "g" sempre; "porção" só se o alimento tiver porção
 * padrão. Sem "ml": hoje não há campo de líquido nos alimentos e o servidor trata ml como grama
 * (1:1), o que é errado para sólido (F-5). Volta quando existir alimento líquido.
 */
export function unitOptions(food: FoodDto): { value: QuantityUnit; label: string }[] {
  const opcoes: { value: QuantityUnit; label: string }[] = [{ value: "g", label: "g" }];
  if (food.porcaoPadraoG) {
    opcoes.push({
      value: "unidade",
      label: `${food.nomePorcao ?? "porção"} (${formatGrams(food.porcaoPadraoG)} g)`,
    });
  }
  return opcoes;
}

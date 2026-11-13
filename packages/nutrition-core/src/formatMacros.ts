import type { Macros } from "@kcal/shared";
import { roundHalfUp } from "./roundHalfUp";

/** Macros prontos para exibição: `kcal` inteiro, gramas com 1 casa. Strings ficam com a UI. */
export type MacrosDisplay = Macros;

/** Arredonda macros para exibição (half-up). Só na borda de exibição, nunca antes de somar. */
export function formatMacros(m: Macros): MacrosDisplay {
  return {
    kcal: roundHalfUp(m.kcal, 0),
    proteinaG: roundHalfUp(m.proteinaG, 1),
    carboG: roundHalfUp(m.carboG, 1),
    gorduraG: roundHalfUp(m.gorduraG, 1),
  };
}

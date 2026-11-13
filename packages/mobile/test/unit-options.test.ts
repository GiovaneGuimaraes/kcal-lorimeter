import { unitOptions } from "../src/ui/unit-options";
import { FOOD } from "./day-fixtures";

describe("unitOptions (lançamento manual)", () => {
  it("sem porção padrão: só g (sem ml)", () => {
    const values = unitOptions({ ...FOOD, porcaoPadraoG: null }).map((o) => o.value);
    expect(values).toEqual(["g"]);
    expect(values).not.toContain("ml");
  });

  it("com porção padrão: g e a porção, nunca ml", () => {
    const opts = unitOptions({ ...FOOD, porcaoPadraoG: 30, nomePorcao: "scoop" });
    expect(opts.map((o) => o.value)).toEqual(["g", "unidade"]);
    expect(opts[1]?.label).toBe("scoop (30 g)");
  });
});

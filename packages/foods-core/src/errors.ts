/** A pessoa já tem um alimento com este nome (comparação normalizada: caixa, acento, plural). */
export class FoodAlreadyExistsError extends Error {
  override readonly name = "FoodAlreadyExistsError";

  constructor() {
    super("Você já tem um alimento com este nome");
  }
}

/**
 * Alimento não existe, é padrão ou é de outra pessoa. Mesma classe nos três casos, para não revelar
 * a existência de alimentos de outras pessoas.
 */
export class FoodNotFoundError extends Error {
  override readonly name = "FoodNotFoundError";

  constructor() {
    super("Alimento não encontrado");
  }
}

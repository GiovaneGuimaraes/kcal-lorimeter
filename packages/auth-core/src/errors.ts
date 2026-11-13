/** Já existe conta com este e-mail. */
export class EmailAlreadyUsedError extends Error {
  override readonly name = "EmailAlreadyUsedError";

  constructor() {
    super("E-mail já cadastrado");
  }
}

/**
 * E-mail ou senha não conferem. Mesma classe (e mesma mensagem) para e-mail inexistente e senha
 * errada, para não revelar quais e-mails têm conta.
 */
export class InvalidCredentialsError extends Error {
  override readonly name = "InvalidCredentialsError";

  constructor() {
    super("E-mail ou senha inválidos");
  }
}

/** Token de sessão ausente, malformado, expirado ou assinado com outro segredo. */
export class InvalidSessionError extends Error {
  override readonly name = "InvalidSessionError";

  constructor() {
    super("Sessão inválida ou expirada");
  }
}

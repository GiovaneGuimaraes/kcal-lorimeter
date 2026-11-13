/** Dados públicos da pessoa: o que pode sair numa resposta da API (nunca o hash da senha). */
export interface PublicUser {
  id: string;
  email: string;
  nome: string;
}

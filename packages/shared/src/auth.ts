import { z } from "zod";

/** Body de `POST /auth/register`. Mensagens em pt-BR: vão direto para a pessoa. */
export const RegisterBodySchema = z.object({
  email: z
    .string({ error: "E-mail é obrigatório" })
    .trim()
    .pipe(z.email({ error: "E-mail inválido" })),
  nome: z
    .string({ error: "Nome é obrigatório" })
    .trim()
    .min(1, { error: "Nome é obrigatório" })
    .max(80, { error: "Nome deve ter no máximo 80 caracteres" }),
  senha: z
    .string({ error: "Senha é obrigatória" })
    .min(8, { error: "Senha deve ter pelo menos 8 caracteres" }),
});
export type RegisterBody = z.infer<typeof RegisterBodySchema>;

/** Body de `POST /auth/login`. Sem regra de tamanho de senha: quem decide é a verificação. */
export const LoginBodySchema = z.object({
  email: z
    .string({ error: "E-mail é obrigatório" })
    .trim()
    .min(1, { error: "E-mail é obrigatório" }),
  senha: z.string({ error: "Senha é obrigatória" }).min(1, { error: "Senha é obrigatória" }),
});
export type LoginBody = z.infer<typeof LoginBodySchema>;

/** Dados públicos da pessoa (nunca o hash da senha). */
export const PublicUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  nome: z.string(),
});
export type PublicUser = z.infer<typeof PublicUserSchema>;

/** Resposta de `POST /auth/register` e `POST /auth/login`. */
export const AuthResponseSchema = z.object({
  token: z.string().min(1),
  user: PublicUserSchema,
});
export type AuthResponse = z.infer<typeof AuthResponseSchema>;

/** Resposta de `GET /me`. */
export const MeResponseSchema = PublicUserSchema;
export type MeResponse = z.infer<typeof MeResponseSchema>;

/** Corpo de toda resposta de erro da API. */
export const ErrorResponseSchema = z.object({ erro: z.string() });
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

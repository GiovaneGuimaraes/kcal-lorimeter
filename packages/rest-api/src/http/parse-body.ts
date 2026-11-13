import type { Context } from "hono";
import type { z } from "zod";

export type ParseBodyResult<T> = { ok: true; data: T } | { ok: false; erro: string };

/**
 * Lê o body JSON e valida com o schema. Devolve a primeira mensagem de erro do schema (em pt-BR,
 * definida em `@kcal/shared`) para a rota responder 400.
 */
export async function parseBody<S extends z.ZodType>(
  c: Context,
  schema: S,
): Promise<ParseBodyResult<z.output<S>>> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return { ok: false, erro: "Corpo da requisição deve ser um JSON válido" };
  }

  // Sem isto, `null`/array/número caem na mensagem padrão (em inglês) do Zod.
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false, erro: "Corpo da requisição deve ser um objeto JSON" };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  return { ok: true, data: parsed.data };
}

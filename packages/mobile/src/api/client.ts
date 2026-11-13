import { ErrorResponseSchema } from "@kcal/shared";

/**
 * URL da nossa API. `EXPO_PUBLIC_*` é embutida no bundle (pública): aqui só vai endereço, nunca
 * segredo. O Expo só substitui o valor com acesso direto `process.env.EXPO_PUBLIC_API_URL`.
 */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000").replace(
  /\/+$/,
  "",
);

/** Status usado quando a requisição nem chegou ao servidor (rede, URL errada, servidor fora). */
export const NETWORK_ERROR_STATUS = 0;

const ERRO_REDE = "Não foi possível falar com o servidor. Verifique sua conexão e tente de novo.";
const ERRO_RESPOSTA = "Resposta inesperada do servidor. Tente de novo.";

/** Erro da API com a mensagem em pt-BR que vai direto para a tela (`{ erro }` do servidor). */
export class ApiError extends Error {
  readonly status: number;
  readonly erro: string;

  constructor(status: number, erro: string) {
    super(erro);
    this.name = "ApiError";
    this.status = status;
    this.erro = erro;
  }
}

/** Mensagem para mostrar na tela a partir de qualquer erro. */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.erro;
  return "Algo deu errado. Tente de novo.";
}

/** Validador mínimo (compatível com os schemas zod do `@kcal/shared`). */
interface ResponseSchema<T> {
  safeParse(data: unknown): { success: true; data: T } | { success: false };
}

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

/** Token mandado em `Authorization: Bearer`. Quem guarda/carrega é a sessão (`auth/session`). */
export function setAuthToken(token: string | null): void {
  authToken = token;
}

/** Chamado quando uma requisição autenticada volta 401 (token expirado/inválido). */
export function setOnUnauthorized(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

type RequestOptions<T> = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Corpo JSON. */
  json?: unknown;
  /** Corpo multipart (o `Content-Type` com boundary é posto pelo fetch). */
  form?: FormData;
  /** Schema da resposta de sucesso: resposta fora do contrato vira `ApiError`. */
  schema?: ResponseSchema<T>;
};

/**
 * `fetch` na nossa API. Sucesso → corpo validado pelo `schema`. Erro → `ApiError` com o `erro`
 * do servidor (pt-BR); sem `{ erro }` legível, uma mensagem genérica com o status.
 */
export async function apiRequest<T = void>(
  path: string,
  options: RequestOptions<T> = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const sentToken = authToken;
  if (sentToken) headers.Authorization = `Bearer ${sentToken}`;

  let body: string | FormData | undefined;
  if (options.form) {
    body = options.form;
  } else if (options.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.json);
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: options.method ?? (body === undefined ? "GET" : "POST"),
      headers,
      body,
    });
  } catch {
    throw new ApiError(NETWORK_ERROR_STATUS, ERRO_REDE);
  }

  const data = await readJson(res);

  if (!res.ok) {
    if (res.status === 401 && sentToken) onUnauthorized?.();
    const parsed = ErrorResponseSchema.safeParse(data);
    throw new ApiError(
      res.status,
      parsed.success ? parsed.data.erro : `Erro no servidor (${res.status}). Tente de novo.`,
    );
  }

  if (!options.schema) return undefined as T;
  const parsed = options.schema.safeParse(data);
  if (!parsed.success) throw new ApiError(res.status, ERRO_RESPOSTA);
  return parsed.data;
}

async function readJson(res: Response): Promise<unknown> {
  try {
    const text = await res.text();
    return text ? JSON.parse(text) : undefined;
  } catch {
    return undefined;
  }
}

import type { AuthResponse, VoiceReview } from "@kcal/shared";
import type { ReactNode } from "react";
import { SessionProvider } from "../src/auth/session";
import { ReviewProvider } from "../src/voice/review-store";

/** Dados inventados (nenhum dado real de pessoa em teste). */
export const AUTH: AuthResponse = {
  token: "token-de-teste",
  user: { id: "u1", email: "teste@exemplo.com", nome: "Pessoa Teste" },
};

export const REVIEW: VoiceReview = {
  voiceLogId: "vl1",
  transcricao: "duzentos gramas de arroz",
  itens: [
    {
      extraido: { alimento: "arroz", quantidade: 200, unidade: "g" },
      match: { kind: "none" },
      precisaPeso: false,
    },
  ],
};

/** Resposta mínima de `fetch` que o cliente usa (`ok`, `status`, `text`). */
export function jsonResponse(status: number, body?: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? "" : JSON.stringify(body)),
  } as Response;
}

export function mockFetch(): jest.Mock {
  const fn = jest.fn();
  globalThis.fetch = fn as unknown as typeof fetch;
  return fn;
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ReviewProvider>{children}</ReviewProvider>
    </SessionProvider>
  );
}

import type { VoiceReview } from "@kcal/shared";
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { useSession } from "../auth/session";

/** Como a revisão foi pedida: gravação (`POST /voice`) ou texto digitado (`POST /voice/text`). */
export type ReviewOrigem = "voz" | "texto";

/**
 * A `VoiceReview` da API mais a origem, que a API não devolve: quem preenche é `api/voice.ts`
 * (`sendVoiceAudio` → `voz`, `sendVoiceText` → `texto`). Opcional só para aceitar uma
 * `VoiceReview` crua; a revisão trata ausente como `voz`.
 */
export type PendingReview = VoiceReview & { origem?: ReviewOrigem };

type ReviewContextValue = {
  /** Última revisão devolvida por `POST /voice` ou `POST /voice/text` (só em memória). */
  review: PendingReview | null;
  setReview(review: PendingReview | null): void;
};

const ReviewContext = createContext<ReviewContextValue | null>(null);

/**
 * Leva a `VoiceReview` da tela inicial para `/revisao`. Fica só em memória: transcrição é dado
 * sensível e não precisa sobreviver ao app fechar (a revisão pendente pode ser refeita).
 */
export function ReviewProvider({
  children,
  initialReview = null,
}: {
  children: ReactNode;
  initialReview?: PendingReview | null;
}) {
  const { status } = useSession();
  const [review, setReview] = useState<PendingReview | null>(initialReview);
  // Sair (ou 401 automático) descarta a transcrição pendente: outra conta no mesmo aparelho não a vê.
  useEffect(() => {
    if (status === "signedOut") setReview(null);
  }, [status]);
  const value = useMemo(() => ({ review, setReview }), [review]);
  return <ReviewContext.Provider value={value}>{children}</ReviewContext.Provider>;
}

export function useReview(): ReviewContextValue {
  const ctx = useContext(ReviewContext);
  if (!ctx) throw new Error("useReview precisa estar dentro de <ReviewProvider>");
  return ctx;
}

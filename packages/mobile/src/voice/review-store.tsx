import type { VoiceReview } from "@kcal/shared";
import { createContext, type ReactNode, useContext, useMemo, useState } from "react";

type ReviewContextValue = {
  /** Última revisão devolvida por `POST /voice` ou `POST /voice/text` (só em memória). */
  review: VoiceReview | null;
  setReview(review: VoiceReview | null): void;
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
  initialReview?: VoiceReview | null;
}) {
  const [review, setReview] = useState<VoiceReview | null>(initialReview);
  const value = useMemo(() => ({ review, setReview }), [review]);
  return <ReviewContext.Provider value={value}>{children}</ReviewContext.Provider>;
}

export function useReview(): ReviewContextValue {
  const ctx = useContext(ReviewContext);
  if (!ctx) throw new Error("useReview precisa estar dentro de <ReviewProvider>");
  return ctx;
}

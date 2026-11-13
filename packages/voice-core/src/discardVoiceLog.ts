import { type Db, voiceLogs } from "@kcal/db";
import { and, eq } from "drizzle-orm";
import { VoiceLogNotFoundError } from "./errors";

/**
 * A pessoa desistiu da revisão: `pendente` → `descartado`. Só o próprio registro e só se ainda
 * estiver `pendente`; senão (não existe, de outra pessoa, já confirmado/descartado)
 * `VoiceLogNotFoundError`. Um só UPDATE condicional: sem janela entre checar e alterar.
 */
export function discardVoiceLog(db: Db, userId: string, id: string): void {
  const alterado = db
    .update(voiceLogs)
    .set({ status: "descartado" })
    .where(
      and(eq(voiceLogs.id, id), eq(voiceLogs.userId, userId), eq(voiceLogs.status, "pendente")),
    )
    .returning({ id: voiceLogs.id })
    .get();
  if (!alterado) throw new VoiceLogNotFoundError();
}

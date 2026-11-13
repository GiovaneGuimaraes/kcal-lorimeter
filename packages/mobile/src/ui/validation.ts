/** Issue mínimo do zod (o que usamos de `error.issues`). */
type Issue = { path: PropertyKey[]; message: string };

/** Primeira mensagem de erro de cada campo, para mostrar embaixo do input. */
export function fieldErrors(issues: readonly Issue[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "");
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

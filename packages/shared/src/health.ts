import { z } from "zod";

/** Resposta de `GET /health` da rest-api. */
export const HealthResponseSchema = z.object({ ok: z.literal(true) });

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

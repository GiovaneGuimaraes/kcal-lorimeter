import { type HealthResponse, HealthResponseSchema } from "@kcal/shared";
import { Hono } from "hono";

export const app = new Hono();

app.get("/health", (c) => {
  const body: HealthResponse = HealthResponseSchema.parse({ ok: true });
  return c.json(body);
});

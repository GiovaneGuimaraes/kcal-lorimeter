import {
  authenticate,
  EmailAlreadyUsedError,
  InvalidCredentialsError,
  registerUser,
  signSession,
} from "@kcal/auth-core";
import {
  type AuthResponse,
  type ErrorResponse,
  LoginBodySchema,
  RegisterBodySchema,
} from "@kcal/shared";
import { Hono } from "hono";
import { parseBody } from "../http/parse-body";
import type { AppDeps } from "../types";

/** `POST /auth/register` e `POST /auth/login`. Ambos devolvem `{ token, user }`. */
export function authRoutes({ db, jwtSecret }: AppDeps): Hono {
  const routes = new Hono();

  routes.post("/register", async (c) => {
    const body = await parseBody(c, RegisterBodySchema);
    if (!body.ok) return c.json<ErrorResponse>({ erro: body.erro }, 400);

    try {
      const user = await registerUser(db, body.data);
      const token = await signSession({ userId: user.id }, jwtSecret);
      return c.json<AuthResponse>({ token, user }, 201);
    } catch (err) {
      if (err instanceof EmailAlreadyUsedError) {
        return c.json<ErrorResponse>({ erro: "E-mail já cadastrado" }, 409);
      }
      throw err;
    }
  });

  routes.post("/login", async (c) => {
    const body = await parseBody(c, LoginBodySchema);
    if (!body.ok) return c.json<ErrorResponse>({ erro: body.erro }, 400);

    try {
      const user = await authenticate(db, body.data);
      const token = await signSession({ userId: user.id }, jwtSecret);
      return c.json<AuthResponse>({ token, user }, 200);
    } catch (err) {
      if (err instanceof InvalidCredentialsError) {
        return c.json<ErrorResponse>({ erro: "E-mail ou senha inválidos" }, 401);
      }
      throw err;
    }
  });

  return routes;
}

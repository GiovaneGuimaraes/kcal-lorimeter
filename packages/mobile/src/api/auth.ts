import {
  type AuthResponse,
  AuthResponseSchema,
  type LoginBody,
  type RegisterBody,
} from "@kcal/shared";
import { apiRequest } from "./client";

/** `POST /auth/login`. 401 → `ApiError` "E-mail ou senha inválidos". */
export function login(body: LoginBody): Promise<AuthResponse> {
  return apiRequest("/auth/login", { method: "POST", json: body, schema: AuthResponseSchema });
}

/** `POST /auth/register`. 409 → `ApiError` "E-mail já cadastrado". */
export function register(body: RegisterBody): Promise<AuthResponse> {
  return apiRequest("/auth/register", { method: "POST", json: body, schema: AuthResponseSchema });
}

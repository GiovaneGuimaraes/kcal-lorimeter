import { type GoalDto, GoalDtoSchema, type SetGoalBody } from "@kcal/shared";
import { ApiError, apiRequest } from "./client";

/** `GET /goals?data=` — meta vigente na data; sem meta (404) → `null`. */
export async function getGoal(data: string): Promise<GoalDto | null> {
  try {
    return await apiRequest(`/goals?data=${encodeURIComponent(data)}`, { schema: GoalDtoSchema });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

/** `PUT /goals` — grava uma nova meta (vale a partir de `vigenteDesde`). */
export function setGoal(body: SetGoalBody): Promise<GoalDto> {
  return apiRequest("/goals", { method: "PUT", json: body, schema: GoalDtoSchema });
}

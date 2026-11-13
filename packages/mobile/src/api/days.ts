import { type DaySummaryDto, DaySummaryDtoSchema } from "@kcal/shared";
import { apiRequest } from "./client";

/** `GET /days/:data` — consumido, meta vigente, restante e lançamentos por refeição (sem arredondar). */
export function getDay(data: string): Promise<DaySummaryDto> {
  return apiRequest(`/days/${encodeURIComponent(data)}`, { schema: DaySummaryDtoSchema });
}

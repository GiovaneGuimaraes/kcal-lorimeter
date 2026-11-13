import { type Db, users } from "@kcal/db";
import { eq } from "drizzle-orm";
import type { PublicUser } from "./types";

/** Dados públicos da pessoa pelo id, ou `null` se a conta não existe (mais). */
export function getUserById(db: Db, userId: string): PublicUser | null {
  const user = db
    .select({ id: users.id, email: users.email, nome: users.nome })
    .from(users)
    .where(eq(users.id, userId))
    .get();
  return user ?? null;
}

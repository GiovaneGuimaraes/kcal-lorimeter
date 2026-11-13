import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { check, index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** Id textual (uuid v4) gerado na aplicação. */
const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID());

/** Momento de criação em ISO 8601 (UTC), gerado na aplicação. */
const criadoEm = () =>
  text("criado_em")
    .notNull()
    .$defaultFn(() => new Date().toISOString());

export const users = sqliteTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  nome: text("nome").notNull(),
  senhaHash: text("senha_hash").notNull(),
  criadoEm: criadoEm(),
});

export const dailyGoals = sqliteTable(
  "daily_goals",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kcal: integer("kcal").notNull(),
    proteinaG: real("proteina_g").notNull(),
    carboG: real("carbo_g").notNull(),
    gorduraG: real("gordura_g").notNull(),
    /** Data ISO `yyyy-mm-dd` a partir da qual a meta vale. */
    vigenteDesde: text("vigente_desde").notNull(),
  },
  (t) => [index("daily_goals_user_vigente_idx").on(t.userId, t.vigenteDesde)],
);

export const foods = sqliteTable(
  "foods",
  {
    id: id(),
    /** Nulo = alimento padrão (visível para todos). */
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    nome: text("nome").notNull(),
    /** Lista de apelidos, guardada como JSON. */
    apelidos: text("apelidos", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .$defaultFn(() => []),
    kcal100g: real("kcal_100g").notNull(),
    proteina100g: real("proteina_100g").notNull(),
    carbo100g: real("carbo_100g").notNull(),
    gordura100g: real("gordura_100g").notNull(),
    porcaoPadraoG: real("porcao_padrao_g"),
    nomePorcao: text("nome_porcao"),
    /** De onde vêm os valores (ex.: "TACO 4ª ed.", "rótulo médio", "informado pela pessoa"). */
    fonte: text("fonte").notNull(),
    criadoEm: criadoEm(),
  },
  (t) => [index("foods_user_idx").on(t.userId)],
);

export const voiceLogStatus = ["pendente", "confirmado", "descartado"] as const;

export const voiceLogs = sqliteTable(
  "voice_logs",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    transcricao: text("transcricao").notNull(),
    extracaoJson: text("extracao_json", { mode: "json" }).$type<unknown>(),
    status: text("status", { enum: voiceLogStatus }).notNull().default("pendente"),
    criadoEm: criadoEm(),
  },
  (t) => [
    index("voice_logs_user_idx").on(t.userId),
    check("voice_logs_status_check", sql`${t.status} in ('pendente', 'confirmado', 'descartado')`),
  ],
);

export const mealEntryOrigem = ["voz", "texto", "manual"] as const;

export const mealEntries = sqliteTable(
  "meal_entries",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Data ISO `yyyy-mm-dd` do dia do lançamento. */
    data: text("data").notNull(),
    refeicao: text("refeicao").notNull(),
    foodId: text("food_id")
      .notNull()
      .references(() => foods.id, { onDelete: "restrict" }),
    gramas: real("gramas").notNull(),
    // Snapshot dos macros no momento do lançamento: editar o alimento não reescreve o passado.
    kcal: real("kcal").notNull(),
    proteinaG: real("proteina_g").notNull(),
    carboG: real("carbo_g").notNull(),
    gorduraG: real("gordura_g").notNull(),
    origem: text("origem", { enum: mealEntryOrigem }).notNull(),
    voiceLogId: text("voice_log_id").references(() => voiceLogs.id, { onDelete: "set null" }),
    criadoEm: criadoEm(),
  },
  (t) => [
    index("meal_entries_user_data_idx").on(t.userId, t.data),
    check("meal_entries_origem_check", sql`${t.origem} in ('voz', 'texto', 'manual')`),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type DailyGoal = typeof dailyGoals.$inferSelect;
export type NewDailyGoal = typeof dailyGoals.$inferInsert;
export type Food = typeof foods.$inferSelect;
export type NewFood = typeof foods.$inferInsert;
export type VoiceLog = typeof voiceLogs.$inferSelect;
export type NewVoiceLog = typeof voiceLogs.$inferInsert;
export type VoiceLogStatus = (typeof voiceLogStatus)[number];
export type MealEntry = typeof mealEntries.$inferSelect;
export type NewMealEntry = typeof mealEntries.$inferInsert;
export type MealEntryOrigem = (typeof mealEntryOrigem)[number];

CREATE TABLE `daily_goals` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kcal` integer NOT NULL,
	`proteina_g` real NOT NULL,
	`carbo_g` real NOT NULL,
	`gordura_g` real NOT NULL,
	`vigente_desde` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `daily_goals_user_vigente_idx` ON `daily_goals` (`user_id`,`vigente_desde`);--> statement-breakpoint
CREATE TABLE `foods` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`nome` text NOT NULL,
	`apelidos` text NOT NULL,
	`kcal_100g` real NOT NULL,
	`proteina_100g` real NOT NULL,
	`carbo_100g` real NOT NULL,
	`gordura_100g` real NOT NULL,
	`porcao_padrao_g` real,
	`nome_porcao` text,
	`fonte` text NOT NULL,
	`criado_em` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `foods_user_idx` ON `foods` (`user_id`);--> statement-breakpoint
CREATE TABLE `meal_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`data` text NOT NULL,
	`refeicao` text NOT NULL,
	`food_id` text NOT NULL,
	`gramas` real NOT NULL,
	`kcal` real NOT NULL,
	`proteina_g` real NOT NULL,
	`carbo_g` real NOT NULL,
	`gordura_g` real NOT NULL,
	`origem` text NOT NULL,
	`voice_log_id` text,
	`criado_em` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`food_id`) REFERENCES `foods`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`voice_log_id`) REFERENCES `voice_logs`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "meal_entries_origem_check" CHECK("meal_entries"."origem" in ('voz', 'texto', 'manual'))
);
--> statement-breakpoint
CREATE INDEX `meal_entries_user_data_idx` ON `meal_entries` (`user_id`,`data`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`nome` text NOT NULL,
	`senha_hash` text NOT NULL,
	`criado_em` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `voice_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`transcricao` text NOT NULL,
	`extracao_json` text,
	`status` text DEFAULT 'pendente' NOT NULL,
	`criado_em` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "voice_logs_status_check" CHECK("voice_logs"."status" in ('pendente', 'confirmado', 'descartado'))
);
--> statement-breakpoint
CREATE INDEX `voice_logs_user_idx` ON `voice_logs` (`user_id`);
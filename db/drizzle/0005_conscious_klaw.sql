PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_partida` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`JugadorW` integer,
	`JugadorB` integer,
	`Modo` text,
	`Ganador` integer,
	`PGN` text,
	`Variacion_JW` integer,
	`Variacion_JB` integer,
	FOREIGN KEY (`JugadorW`) REFERENCES `usuario`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`JugadorB`) REFERENCES `usuario`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`Ganador`) REFERENCES `usuario`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_partida`("id", "created_at", "JugadorW", "JugadorB", "Modo", "Ganador", "PGN", "Variacion_JW", "Variacion_JB") SELECT "id", "created_at", "JugadorW", "JugadorB", "Modo", "Ganador", "PGN", "Variacion_JW", "Variacion_JB" FROM `partida`;--> statement-breakpoint
DROP TABLE `partida`;--> statement-breakpoint
ALTER TABLE `__new_partida` RENAME TO `partida`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
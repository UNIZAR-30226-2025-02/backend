PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_amistad` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`Jugador1` text NOT NULL,
	`Jugador2` text NOT NULL,
	`HistorialAmistad` text,
	`Retos` integer,
	FOREIGN KEY (`Jugador1`) REFERENCES `usuario`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`Jugador2`) REFERENCES `usuario`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_amistad`("id", "created_at", "Jugador1", "Jugador2", "HistorialAmistad", "Retos") SELECT "id", "created_at", "Jugador1", "Jugador2", "HistorialAmistad", "Retos" FROM `amistad`;--> statement-breakpoint
DROP TABLE `amistad`;--> statement-breakpoint
ALTER TABLE `__new_amistad` RENAME TO `amistad`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
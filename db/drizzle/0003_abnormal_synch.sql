PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_amistad` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`Jugador1` integer NOT NULL,
	`Jugador2` integer NOT NULL,
	`HistorialAmistad` text,
	`Retos` integer,
	FOREIGN KEY (`Jugador1`) REFERENCES `usuario`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`Jugador2`) REFERENCES `usuario`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_amistad`("id", "created_at", "Jugador1", "Jugador2", "HistorialAmistad", "Retos") SELECT "id", "created_at", "Jugador1", "Jugador2", "HistorialAmistad", "Retos" FROM `amistad`;--> statement-breakpoint
DROP TABLE `amistad`;--> statement-breakpoint
ALTER TABLE `__new_amistad` RENAME TO `amistad`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_apertura` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`Nombre_Aper` text NOT NULL,
	`PGN` text
);
--> statement-breakpoint
INSERT INTO `__new_apertura`("id", "created_at", "Nombre_Aper", "PGN") SELECT "id", "created_at", "Nombre_Aper", "PGN" FROM `apertura`;--> statement-breakpoint
DROP TABLE `apertura`;--> statement-breakpoint
ALTER TABLE `__new_apertura` RENAME TO `apertura`;--> statement-breakpoint
CREATE UNIQUE INDEX `apertura_Nombre_Aper_unique` ON `apertura` (`Nombre_Aper`);--> statement-breakpoint
CREATE TABLE `__new_mensaje` (
	`id_mensaje` text PRIMARY KEY NOT NULL,
	`fecha_envio` text DEFAULT 'CURRENT_TIMESTAMP',
	`id_partida` integer NOT NULL,
	`id_usuario` integer NOT NULL,
	`mensaje` text NOT NULL,
	FOREIGN KEY (`id_partida`) REFERENCES `usuario`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`id_usuario`) REFERENCES `usuario`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_mensaje`("id_mensaje", "fecha_envio", "id_partida", "id_usuario", "mensaje") SELECT "id_mensaje", "fecha_envio", "id_partida", "id_usuario", "mensaje" FROM `mensaje`;--> statement-breakpoint
DROP TABLE `mensaje`;--> statement-breakpoint
ALTER TABLE `__new_mensaje` RENAME TO `mensaje`;--> statement-breakpoint
CREATE TABLE `__new_partida` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`JugadorW` integer NOT NULL,
	`JugadorB` integer NOT NULL,
	`Modo` text,
	`Ganador` integer NOT NULL,
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
CREATE TABLE `__new_ranking` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`Modo` text NOT NULL,
	`Puntuacion` integer NOT NULL,
	`Posicion` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_ranking`("id", "created_at", "Modo", "Puntuacion", "Posicion") SELECT "id", "created_at", "Modo", "Puntuacion", "Posicion" FROM `ranking`;--> statement-breakpoint
DROP TABLE `ranking`;--> statement-breakpoint
ALTER TABLE `__new_ranking` RENAME TO `ranking`;--> statement-breakpoint
CREATE TABLE `__new_reto` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`Retador` integer NOT NULL,
	`Retado` integer NOT NULL,
	`Activo` integer DEFAULT 1,
	`Pendiente` integer DEFAULT 1,
	`Modo` text,
	`Amistad` integer NOT NULL,
	FOREIGN KEY (`Retador`) REFERENCES `usuario`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`Retado`) REFERENCES `usuario`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`Amistad`) REFERENCES `amistad`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_reto`("id", "created_at", "Retador", "Retado", "Activo", "Pendiente", "Modo", "Amistad") SELECT "id", "created_at", "Retador", "Retado", "Activo", "Pendiente", "Modo", "Amistad" FROM `reto`;--> statement-breakpoint
DROP TABLE `reto`;--> statement-breakpoint
ALTER TABLE `__new_reto` RENAME TO `reto`;--> statement-breakpoint
CREATE TABLE `__new_usuario` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`FotoPerfil` text,
	`NombreUser` text,
	`NombreCompleto` text,
	`Apellidos` text,
	`Correo` text,
	`Edad` integer,
	`Contrasena` text NOT NULL,
	`EstadoPartida` text,
	`Amistades` integer,
	`Punt_3` integer,
	`Punt_5` integer,
	`Punt_10` integer,
	`Punt_30` integer,
	`Punt_3_2` integer,
	`Punt_5_10` integer,
	`correoVerificado` text,
	`estadoUser` text
);
--> statement-breakpoint
INSERT INTO `__new_usuario`("id", "created_at", "FotoPerfil", "NombreUser", "NombreCompleto", "Apellidos", "Correo", "Edad", "Contrasena", "EstadoPartida", "Amistades", "Punt_3", "Punt_5", "Punt_10", "Punt_30", "Punt_3_2", "Punt_5_10", "correoVerificado", "estadoUser") SELECT "id", "created_at", "FotoPerfil", "NombreUser", "NombreCompleto", "Apellidos", "Correo", "Edad", "Contrasena", "EstadoPartida", "Amistades", "Punt_3", "Punt_5", "Punt_10", "Punt_30", "Punt_3_2", "Punt_5_10", "correoVerificado", "estadoUser" FROM `usuario`;--> statement-breakpoint
DROP TABLE `usuario`;--> statement-breakpoint
ALTER TABLE `__new_usuario` RENAME TO `usuario`;--> statement-breakpoint
CREATE UNIQUE INDEX `usuario_NombreUser_unique` ON `usuario` (`NombreUser`);--> statement-breakpoint
CREATE UNIQUE INDEX `usuario_Correo_unique` ON `usuario` (`Correo`);
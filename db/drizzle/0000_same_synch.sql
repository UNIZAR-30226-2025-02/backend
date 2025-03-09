CREATE TABLE `amistad` (
	`id` integer PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`Jugador1` integer NOT NULL,
	`Jugador2` integer NOT NULL,
	`HistorialAmistad` text,
	`Retos` integer,
	FOREIGN KEY (`Jugador1`) REFERENCES `usuario`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`Jugador2`) REFERENCES `usuario`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `apertura` (
	`id` integer PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`Nombre_Aper` text NOT NULL,
	`PGN` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `apertura_Nombre_Aper_unique` ON `apertura` (`Nombre_Aper`);--> statement-breakpoint
CREATE TABLE `mensaje` (
	`id_mensaje` integer PRIMARY KEY NOT NULL,
	`fecha_envio` text DEFAULT 'CURRENT_TIMESTAMP',
	`id_partida` integer NOT NULL,
	`id_usuario` integer NOT NULL,
	`mensaje` text NOT NULL,
	FOREIGN KEY (`id_partida`) REFERENCES `usuario`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`id_usuario`) REFERENCES `usuario`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `partida` (
	`id` integer PRIMARY KEY NOT NULL,
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
CREATE TABLE `ranking` (
	`id` integer PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`Modo` text NOT NULL,
	`Puntuacion` integer NOT NULL,
	`Posicion` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reto` (
	`id` integer PRIMARY KEY NOT NULL,
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
CREATE TABLE `usuario` (
	`id` integer PRIMARY KEY NOT NULL,
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
	`Punt_5_10` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `usuario_NombreUser_unique` ON `usuario` (`NombreUser`);--> statement-breakpoint
CREATE UNIQUE INDEX `usuario_Correo_unique` ON `usuario` (`Correo`);
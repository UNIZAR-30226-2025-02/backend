CREATE TABLE `Amistad` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer DEFAULT 'now()',
	`Jugador1` integer,
	`Jugador2` integer,
	`HistorialAmistad` text,
	`Retos` integer
);
--> statement-breakpoint
CREATE TABLE `Apertura` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer DEFAULT 'now()',
	`Nombre_Aper` text NOT NULL,
	`PGN` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Apertura_Nombre_Aper_unique` ON `Apertura` (`Nombre_Aper`);--> statement-breakpoint
CREATE TABLE `Mensaje` (
	`id_mensaje` text PRIMARY KEY NOT NULL,
	`fecha_envio` datetime DEFAULT 'now()',
	`id_partida` integer,
	`id_usuario` integer,
	`mensaje` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `Partida` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer DEFAULT 'now()',
	`JugadorW` integer,
	`JugadorB` integer,
	`Modo` text,
	`Ganador` integer,
	`PGN` text,
	`Variacion_JW` integer,
	`Variacion_JB` integer
);
--> statement-breakpoint
CREATE TABLE `Ranking` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer DEFAULT 'now()',
	`modo` text NOT NULL,
	`puntuacion` integer DEFAULT 0 NOT NULL,
	`posicion` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `Reto` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer DEFAULT 'now()',
	`Retador` integer,
	`Retado` integer,
	`Activo` integer DEFAULT 1,
	`Pendiente` integer DEFAULT 1
);
--> statement-breakpoint
CREATE TABLE `Usuario` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	`FotoPerfil` text,
	`NombreUser` text NOT NULL,
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
CREATE UNIQUE INDEX `Usuario_NombreUser_unique` ON `Usuario` (`NombreUser`);--> statement-breakpoint
CREATE UNIQUE INDEX `Usuario_Correo_unique` ON `Usuario` (`Correo`);
DROP INDEX "apertura_Nombre_Aper_unique";--> statement-breakpoint
DROP INDEX "usuario_NombreUser_unique";--> statement-breakpoint
DROP INDEX "usuario_Correo_unique";--> statement-breakpoint
ALTER TABLE `amistad` ALTER COLUMN "created_at" TO "created_at" text DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
CREATE UNIQUE INDEX `apertura_Nombre_Aper_unique` ON `apertura` (`Nombre_Aper`);--> statement-breakpoint
CREATE UNIQUE INDEX `usuario_NombreUser_unique` ON `usuario` (`NombreUser`);--> statement-breakpoint
CREATE UNIQUE INDEX `usuario_Correo_unique` ON `usuario` (`Correo`);--> statement-breakpoint
ALTER TABLE `apertura` ALTER COLUMN "created_at" TO "created_at" text DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `mensaje` ALTER COLUMN "fecha_envio" TO "fecha_envio" text DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `partida` ALTER COLUMN "created_at" TO "created_at" text DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `ranking` ALTER COLUMN "created_at" TO "created_at" text DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `reto` ALTER COLUMN "created_at" TO "created_at" text DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `usuario` ALTER COLUMN "created_at" TO "created_at" text DEFAULT CURRENT_TIMESTAMP;
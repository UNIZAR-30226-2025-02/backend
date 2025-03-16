DROP INDEX "apertura_Nombre_Aper_unique";--> statement-breakpoint
DROP INDEX "usuario_NombreUser_unique";--> statement-breakpoint
DROP INDEX "usuario_Correo_unique";--> statement-breakpoint
ALTER TABLE `usuario` ALTER COLUMN "Punt_3" TO "Punt_3" integer;--> statement-breakpoint
CREATE UNIQUE INDEX `apertura_Nombre_Aper_unique` ON `apertura` (`Nombre_Aper`);--> statement-breakpoint
CREATE UNIQUE INDEX `usuario_NombreUser_unique` ON `usuario` (`NombreUser`);--> statement-breakpoint
CREATE UNIQUE INDEX `usuario_Correo_unique` ON `usuario` (`Correo`);--> statement-breakpoint
ALTER TABLE `usuario` ALTER COLUMN "Punt_5" TO "Punt_5" integer;--> statement-breakpoint
ALTER TABLE `usuario` ALTER COLUMN "Punt_10" TO "Punt_10" integer;--> statement-breakpoint
ALTER TABLE `usuario` ALTER COLUMN "Punt_30" TO "Punt_30" integer;--> statement-breakpoint
ALTER TABLE `usuario` ALTER COLUMN "Punt_3_2" TO "Punt_3_2" integer;--> statement-breakpoint
ALTER TABLE `usuario` ALTER COLUMN "Punt_5_10" TO "Punt_5_10" integer;--> statement-breakpoint
ALTER TABLE `usuario` ALTER COLUMN "totalGames" TO "totalGames" integer;--> statement-breakpoint
ALTER TABLE `usuario` ALTER COLUMN "totalWins" TO "totalWins" integer;--> statement-breakpoint
ALTER TABLE `usuario` ALTER COLUMN "totalLosses" TO "totalLosses" integer;--> statement-breakpoint
ALTER TABLE `usuario` ALTER COLUMN "totalDraws" TO "totalDraws" integer;
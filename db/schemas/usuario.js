import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { sql } from "drizzle-orm";

import { createInsertSchema, createSelectSchema } from 'drizzle-zod'


export const usuario = sqliteTable('usuario', {
  id: integer('id').primaryKey(),
  created_at: integer('created_at', { mode: 'timestamp_ms' }).default(sql`cast(strftime('%s', 'now') as int) * 1000`),
  FotoPerfil: text('FotoPerfil'),
  NombreUser: text('NombreUser').unique(),
  NombreCompleto: text('NombreCompleto'),
  Apellidos: text('Apellidos'),
  Correo: text('Correo').unique(),
  Edad: integer('Edad'),
  Contrasena: text('Contrasena').notNull(),
  EstadoPartida: text('EstadoPartida'),
  Amistades: integer('Amistades'),
  Punt_3: integer('Punt_3'),
  Punt_5: integer('Punt_5'),
  Punt_10: integer('Punt_10'),
  Punt_30: integer('Punt_30'),
  Punt_3_2: integer('Punt_3_2'),
  Punt_5_10: integer('Punt_5_10'),

  // salt: text('salt').notNull(),
  // emailVerified: integer('emailVerified', { mode: 'timestamp_ms' }),

})

// Uso de zod internamente para validar los datos
// export const usersSelectSchema = createSelectSchema(usuario).partial()
// export const usersInsertSchema = createInsertSchema(usuario).partial()


export class UserRepository {
  static create({ NombreUser, NombreCompleto, Apellidos, Correo, Contrasena, Edad }) { }

}
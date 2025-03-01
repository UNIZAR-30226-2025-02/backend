import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'

const z = require('zod')
const crypto = require('crypto')

export const usuario = sqliteTable('Usuario', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  created_at: integer('created_at', { mode: 'timestamp_ms' }).default('now()'),
  FotoPerfil: text('FotoPerfil'),
  NombreUser: text('NombreUser').notNull().unique(),
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
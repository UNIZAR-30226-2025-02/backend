import { timestamptz } from 'drizzle-orm/gel-core'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { uuid } from 'drizzle-orm/gel-meta'
import { crypto } from 'drizzle-orm/gel-meta'

export const mensaje = sqliteTable('Mensaje', {
    Id_mensaje: uuid('id_mensaje')
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    fecha_envio: timestamptz('fecha_envio').default('now()'),
    Id_partida: integer('id_partida').references(() => partida.id).notNull(),
    Id_usuario: integer('id_usuario').references(() => usuario.id).notNull(),
    Mensaje: text('mensaje').notNull()
})

export const usersSelectSchema = createSelectSchema(mensaje).partial()
export const usersInsertSchema = createInsertSchema(mensaje).partial()

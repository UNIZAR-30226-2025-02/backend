import { sql } from 'drizzle-orm'
import { timestamp } from 'drizzle-orm/gel-core'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { uuid } from 'drizzle-orm/gel-meta'
import { crypto } from 'drizzle-orm/gel-meta'

export const mensaje = sqliteTable('Mensaje', {
    Id_mensaje: uuid('id_mensaje')
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    fecha_envio: timestamp('fecha_envio').default(sql`CURRENT_TIMESTAMP`),
    Id_partida: integer('id_partida'),
    Id_usuario: integer('id_usuario'),

    Mensaje: text('mensaje').notNull()
})

export const usersSelectSchema = createSelectSchema(mensaje).partial()
export const usersInsertSchema = createInsertSchema(mensaje).partial()

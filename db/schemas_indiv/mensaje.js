import { sql } from 'drizzle-orm'
import { timestamp } from 'drizzle-orm/gel-core'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { usuario } from './usuario.js'


export const mensaje = sqliteTable('mensaje', {
    Id_mensaje: integer('id_mensaje').primaryKey(),
    fecha_envio: timestamp('fecha_envio', { mode: 'timestamp_ms' }).default(sql`cast(strftime('%s', 'now') as int) * 1000`),
    Id_partida: integer('id_partida').references(() => usuario.id).notNull(),
    Id_usuario: integer('id_usuario').references(() => usuario.id).notNull(),

    Mensaje: text('mensaje').notNull()
})

export const usersSelectSchema = createSelectSchema(mensaje).partial()
export const usersInsertSchema = createInsertSchema(mensaje).partial()

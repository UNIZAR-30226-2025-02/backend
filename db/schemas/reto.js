import { timestamptz } from 'drizzle-orm/gel-core'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { uuid } from 'drizzle-orm/gel-meta'
import { crypto } from 'drizzle-orm/gel-meta'
import { usuario } from './usuario'

export const reto = sqliteTable('Reto', {
    id: uuid('id')
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    created_at: integer('created_at', { mode: 'timestamp_ms' }).default('now()'),
    Retador: uuid('Retador').references(() => usuario.id).notNull(),
    Retado: uuid('Retado').references(() => usuario.id).notNull(),
    Activo: integer('Activo').default(1),
    Pendiente: integer('Pendiente').default(1),
    Modo: text('Modo')

})

export const usersSelectSchema = createSelectSchema(reto).partial()
export const usersInsertSchema = createInsertSchema(reto).partial()
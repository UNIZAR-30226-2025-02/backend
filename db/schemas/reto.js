import { timestamptz } from 'drizzle-orm/gel-core'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'

export const reto = sqliteTable('Reto', {
    id: text('id')
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    created_at: integer('created_at', { mode: 'timestamp_ms' }).default('now()'),
    Retador: integer('Retador'),
    Retado: integer('Retado'),
    Activo: boolean('Activo').default(true),
    Pendiente: boolean('Pendiente').default(true)
})

export const usersSelectSchema = createSelectSchema(reto).partial()
export const usersInsertSchema = createInsertSchema(reto).partial()
import { timestamptz } from 'drizzle-orm/gel-core'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'

export const amistad = sqliteTable('Amistad', {
    id: text('id')
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    created_at: integer('created_at', { mode: 'timestamp_ms' }).default('now()'),
    Jugador1: integer('Jugador1'),
    Jugador2: integer('Jugador2'),
    HistorialAmistad: text('HistorialAmistad'),
    Retos: integer('Retos')
})

export const usersSelectSchema = createSelectSchema(amistad).partial()
export const usersInsertSchema = createInsertSchema(amistad).partial()
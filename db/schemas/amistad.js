import { timestamptz } from 'drizzle-orm/gel-core'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { uuid } from 'drizzle-orm/gel-meta'
import { crypto } from 'drizzle-orm/gel-meta'
import { usuario } from './usuario'

export const amistad = sqliteTable('Amistad', {
    id: uuid('id')
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    created_at: integer('created_at', { mode: 'timestamp_ms' }).default('now()'),
    Jugador1: uuid('Jugador1').references(() => usuario.id).notNull(),
    Jugador2: uuid('Jugador2').references(() => usuario.id).notNull(),
    HistorialAmistad: text('HistorialAmistad'),
    Retos: integer('Retos')
})

export const usersSelectSchema = createSelectSchema(amistad).partial()
export const usersInsertSchema = createInsertSchema(amistad).partial()
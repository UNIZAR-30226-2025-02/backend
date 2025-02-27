import { timestamptz } from 'drizzle-orm/gel-core'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'

export const partida = sqliteTable('Partida', {
    id: text('id')
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    created_at: integer('created_at', { mode: 'timestamp_ms' }).default('now()'),
    JugadorW: integer('JugadorW'),
    JugadorB: integer('JugadorB'),
    Modo: text('Modo'),
    Ganador: integer('Ganador'),
    PGN: text('PGN'),
    Variacion_JW: integer('Variacion_JW'),
    Variacion_JB: integer('Variacion_JB')
})

export const usersSelectSchema = createSelectSchema(partida).partial()
export const usersInsertSchema = createInsertSchema(partida).partial()
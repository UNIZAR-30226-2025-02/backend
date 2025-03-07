
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { timestamp } from 'drizzle-orm/gel-core'
import { sql } from 'drizzle-orm'

export const partida = sqliteTable('Partida', {
    id: text('id')
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    created_at: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
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
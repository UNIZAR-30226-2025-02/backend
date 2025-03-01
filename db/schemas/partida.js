import { timestamptz } from 'drizzle-orm/gel-core'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { uuid } from 'drizzle-orm/gel-core'
import { crypto } from 'drizzle-orm/crypto-core'
import { usuario } from './usuario'


export const partida = sqliteTable('Partida', {
    id: uuid('id')
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    created_at: integer('created_at', { mode: 'timestamp_ms' }).default('now()'),
    JugadorW: uuid('JugadorW').references(() => usuario.id).notNull(),
    JugadorB: uuid('JugadorB').references(() => usuario.id).notNull(),
    Modo: text('Modo'),
    Ganador: uuid('Ganador').references(() => usuario.id).notNull(),
    PGN: text('PGN'),
    Variacion_JW: integer('Variacion_JW'),
    Variacion_JB: integer('Variacion_JB')
})

export const usersSelectSchema = createSelectSchema(partida).partial()
export const usersInsertSchema = createInsertSchema(partida).partial()
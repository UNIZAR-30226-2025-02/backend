import { timestamptz } from 'drizzle-orm/gel-core'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { sql } from "drizzle-orm";
import { usuario } from './usuario.js'


export const partida = sqliteTable('partida', {
    id: integer('id').primaryKey(),
    created_at: integer('created_at', { mode: 'timestamp_ms' }).default(sql`cast(strftime('%s', 'now') as int) * 1000`),
    JugadorW: integer('JugadorW').references(() => usuario.id).notNull(),
    JugadorB: integer('JugadorB').references(() => usuario.id).notNull(),
    Modo: text('Modo'),
    Ganador: integer('Ganador').references(() => usuario.id).notNull(),
    PGN: text('PGN'),
    Variacion_JW: integer('Variacion_JW'),
    Variacion_JB: integer('Variacion_JB')
})

export const usersSelectSchema = createSelectSchema(partida).partial()
export const usersInsertSchema = createInsertSchema(partida).partial()
import { timestamptz } from 'drizzle-orm/gel-core'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { sql } from "drizzle-orm";


import { usuario } from './usuario.js'

export const amistad = sqliteTable('amistad', {
    id: integer('id').primaryKey(),
    created_at: integer('created_at', { mode: 'timestamp_ms' }).default(sql`cast(strftime('%s', 'now') as int) * 1000`),
    Jugador1: integer('Jugador1').references(() => usuario.id).notNull(),
    Jugador2: integer('Jugador2').references(() => usuario.id).notNull(),
    HistorialAmistad: text('HistorialAmistad'),
    Retos: integer('Retos')
})

export const usersSelectSchema = createSelectSchema(amistad).partial()
export const usersInsertSchema = createInsertSchema(amistad).partial()
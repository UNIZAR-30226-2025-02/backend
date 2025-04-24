import { timestamptz } from 'drizzle-orm/gel-core'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { sql } from "drizzle-orm";



export const ranking = sqliteTable('ranking', {
    id: integer('id').primaryKey(),
    created_at: integer('created_at', { mode: 'timestamp_ms' }).default(sql`cast(strftime('%s', 'now') as int) * 1000`),
    Modo: text('modo').notNull(),
    Puntuacion: integer('puntuacion').notNull(),
    Posicion: integer('posicion').notNull()
})

export const usersSelectSchema = createSelectSchema(ranking).partial()
export const usersInsertSchema = createInsertSchema(ranking).partial()

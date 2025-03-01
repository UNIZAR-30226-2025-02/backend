import { timestamptz } from 'drizzle-orm/gel-core'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { uuid } from 'drizzle-orm/gel-meta'
import { crypto } from 'drizzle-orm/gel-meta'

export const ranking = sqliteTable('Ranking', {
    id: uuid('id')
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    created_at: integer('created_at', { mode: 'timestamp_ms' }).default('now()'),
    Modo: text('modo').notNull(),
    Puntuacion: integer('puntuacion').notNull().default(0),
    Posicion: integer('posicion').notNull().default(0)
})

export const usersSelectSchema = createSelectSchema(ranking).partial()
export const usersInsertSchema = createInsertSchema(ranking).partial()

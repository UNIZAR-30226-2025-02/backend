import { timestamptz } from 'drizzle-orm/gel-core'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { uuid } from 'drizzle-orm/gel-meta'
import { crypto } from 'drizzle-orm/gel-meta'

export const apertura = sqliteTable('Apertura', {
    id: uuid('id')
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    created_at: integer('created_at', { mode: 'timestamp_ms' }).default('now()'),
    Nombre_Aper: text('Nombre_Aper').notNull().unique(),
    PGN: text('PGN'),
})

export const usersSelectSchema = createSelectSchema(apertura).partial()
export const usersInsertSchema = createInsertSchema(apertura).partial()
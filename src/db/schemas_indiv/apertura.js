import { timestamptz } from 'drizzle-orm/gel-core'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { sql } from "drizzle-orm";


export const apertura = sqliteTable('apertura', {
    id: integer('id').primaryKey(),
    created_at: integer('created_at', { mode: 'timestamp_ms' }).default(sql`cast(strftime('%s', 'now') as int) * 1000`),
    Nombre_Aper: text('Nombre_Aper').notNull().unique(),
    PGN: text('PGN'),
})

export const usersSelectSchema = createSelectSchema(apertura).partial()
export const usersInsertSchema = createInsertSchema(apertura).partial()
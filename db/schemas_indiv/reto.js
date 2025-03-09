import { timestamptz } from 'drizzle-orm/gel-core'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { sql } from "drizzle-orm";

import { createInsertSchema, createSelectSchema } from 'drizzle-zod'

import { usuario } from './usuario.js'
import { amistad } from './amistad.js'

export const reto = sqliteTable('reto', {
    id: integer('id').primaryKey(),
    created_at: integer('created_at', { mode: 'timestamp_ms' }).default(sql`cast(strftime('%s', 'now') as int) * 1000`),
    Retador: integer('Retador').references(() => usuario.id).notNull(),
    Retado: integer('Retado').references(() => usuario.id).notNull(),
    Activo: integer('Activo').default(1),
    Pendiente: integer('Pendiente').default(1),
    Modo: text('Modo'),
    Amistad: integer('Amistad').references(() => amistad.id).notNull()
})

export const usersSelectSchema = createSelectSchema(reto).partial()
export const usersInsertSchema = createInsertSchema(reto).partial()
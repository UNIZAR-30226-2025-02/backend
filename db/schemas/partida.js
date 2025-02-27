import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'

export const users = sqliteTable('user', {
    id: text('id')
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    name: text('name'),
    salt: text('salt').notNull(),
    password: text('password').notNull(),
    email: text('email').unique(),
    emailVerified: integer('emailVerified', { mode: 'timestamp_ms' }),
    image: text('image')
})

export const usersSelectSchema = createSelectSchema(users).partial()
export const usersInsertSchema = createInsertSchema(users).partial()
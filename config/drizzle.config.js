import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: '../src/db/drizzle',
  schema: '../src/db/schemas/*',
  dialect: 'turso',
  dbCredentials: {
    url: process.env.DATABASE_URL,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  },
});
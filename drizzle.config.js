import dotenv from 'dotenv';
import { defineConfig } from 'drizzle-kit';
dotenv.config();

export default defineConfig({
  out: './db/drizzle',
  schema: './db/schemas/*',
  dialect: 'turso',
  dbCredentials: {
    url: process.env.DATABASE_URL,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  },
});
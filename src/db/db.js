import '../../config/dotenv-config.js'
import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import * as amistad from './schemas/schemas.js'
import * as apertura from './schemas/schemas.js'
import * as mensaje from './schemas/schemas.js'
import * as partida from './schemas/schemas.js'
import * as ranking from './schemas/schemas.js'
import * as reto from './schemas/schemas.js'
import * as usuario from './schemas/schemas.js'


const client = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.DATABASE_AUTH_TOKEN
})

export const db = drizzle({
  client,
  schema: {
    ...amistad,
    ...apertura,
    ...mensaje,
    ...partida,
    ...ranking,
    ...reto,
    ...usuario
  }
})
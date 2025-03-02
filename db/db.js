import dotenv from 'dotenv'
import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import { amistad } from './schemas/amistad.js'
import { apertura } from './schemas/apertura.js'
import { mensaje } from './schemas/mensaje.js'
import { partida } from './schemas/partida.js'
import { ranking } from './schemas/ranking.js'
import { reto } from './schemas/reto.js'
import { usuario } from './schemas/usuario.js'   

// Carga las variables de entorno 
dotenv.config()

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
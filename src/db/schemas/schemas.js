import { timestamptz } from 'drizzle-orm/gel-core'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { sql } from "drizzle-orm";

// USUARIO
export const usuario = sqliteTable('usuario', {
    id: text('id').primaryKey(),
    created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    FotoPerfil: text('FotoPerfil'),
    NombreUser: text('NombreUser').unique(),
    Correo: text('Correo').unique(),
    Contrasena: text('Contrasena').notNull(),
    EstadoPartida: text('EstadoPartida'),
    Amistades: integer('Amistades'),
    Punt_3: integer('Punt_3').default(1000),
    Punt_5: integer('Punt_5').default(1000),
    Punt_10: integer('Punt_10').default(1000),
    Punt_30: integer('Punt_30').default(1000),
    Punt_3_2: integer('Punt_3_2').default(1000),
    Punt_5_10: integer('Punt_5_10').default(1000),
    correoVerificado: text('correoVerificado'),
    estadoUser: text('estadoUser'),
    tokenVerificacion: text('tokenVerificacion'),
    tokenPasswd: text('tokenPasswd'),
    totalGames: integer('totalGames').default(0),
    totalWins: integer('totalWins').default(0),
    totalLosses: integer('totalLosses').default(0),
    totalDraws: integer('totalDraws').default(0),
    actualStreak: integer('actualStreak').default(0),
    maxStreak: integer('maxStreak').default(0),
    lastOnline: integer('lastOnline').default(0)
})

// Uso de zod internamente para validar los datos
export const userSelectSchema = createSelectSchema(usuario).partial()
export const userInsertSchema = createInsertSchema(usuario).partial()

// AMISTAD
export const amistad = sqliteTable('amistad', {
    id: text('id').primaryKey(),
    created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    Jugador1: text('Jugador1').references(() => usuario.id).notNull(),
    Jugador2: text('Jugador2').references(() => usuario.id).notNull(),
    HistorialAmistad: text('HistorialAmistad'),
    Retos: integer('Retos')
})

export const amistadSelectSchema = createSelectSchema(amistad).partial()
export const amistadInsertSchema = createInsertSchema(amistad).partial()

// RETO
export const reto = sqliteTable('reto', {
    id: text('id').primaryKey(),
    created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    Retador: integer('Retador').references(() => usuario.id).notNull(),
    Retado: integer('Retado').references(() => usuario.id).notNull(),
    Activo: integer('Activo').default(1),
    Pendiente: integer('Pendiente').default(1),
    Modo: text('Modo'),
    Amistad: integer('Amistad').references(() => amistad.id).notNull()
})

export const retoSelectSchema = createSelectSchema(reto).partial()
export const retoInsertSchema = createInsertSchema(reto).partial()

// PARTIDA
export const partida = sqliteTable('partida', {
    id: text('id').primaryKey(),
    created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    JugadorW: text('JugadorW').references(() => usuario.id),
    JugadorB: text('JugadorB').references(() => usuario.id),
    Modo: text('Modo'),
    Ganador: text('Ganador').references(() => usuario.id),
    PGN: text('PGN'),
    Variacion_JW: integer('Variacion_JW'),
    Variacion_JB: integer('Variacion_JB'),
    Tipo: text('Tipo')
})

export const partidaSelectSchema = createSelectSchema(partida).partial()
export const partidaInsertSchema = createInsertSchema(partida).partial()

// MENSAJE
export const mensaje = sqliteTable('mensaje', {
    Id_mensaje: text('id_mensaje').primaryKey(),
    fecha_envio: text('fecha_envio').default(sql`CURRENT_TIMESTAMP`),
    Id_partida: integer('id_partida').references(() => partida.id).notNull(),
    Id_usuario: integer('id_usuario').references(() => usuario.id).notNull(),

    Mensaje: text('mensaje').notNull()
})

export const mensajeSelectSchema = createSelectSchema(mensaje).partial()
export const mensajeInsertSchema = createInsertSchema(mensaje).partial()
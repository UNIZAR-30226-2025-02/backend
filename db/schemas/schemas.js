import { timestamptz } from 'drizzle-orm/gel-core'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { sql } from "drizzle-orm";

// USUARIO
export const usuario = sqliteTable('usuario', {
    id: text('id').primaryKey(),
    created_at: text('created_at').default(sql`'CURRENT_TIMESTAMP'`),
    FotoPerfil: text('FotoPerfil'),
    NombreUser: text('NombreUser').unique(),
    Correo: text('Correo').unique(),
    Contrasena: text('Contrasena').notNull(),
    EstadoPartida: text('EstadoPartida'),
    Amistades: integer('Amistades'),
    Punt_3: integer('Punt_3'),
    Punt_5: integer('Punt_5'),
    Punt_10: integer('Punt_10'),
    Punt_30: integer('Punt_30'),
    Punt_3_2: integer('Punt_3_2'),
    Punt_5_10: integer('Punt_5_10'),

    correoVerificado: text('correoVerificado'),
    tokenVerificacion: text('tokenVerificacion'),
    estadoUser: text('estadoUser'),
    tokenPasswd: text('tokenPasswd')
})

// Uso de zod internamente para validar los datos
export const userSelectSchema = createSelectSchema(usuario).partial()
export const userInsertSchema = createInsertSchema(usuario).partial()

// AMISTAD
export const amistad = sqliteTable('amistad', {
    id: text('id').primaryKey(),
    created_at: text('created_at').default(sql`'CURRENT_TIMESTAMP'`),
    Jugador1: integer('Jugador1').references(() => usuario.id).notNull(),
    Jugador2: integer('Jugador2').references(() => usuario.id).notNull(),
    HistorialAmistad: text('HistorialAmistad'),
    Retos: integer('Retos')
})

export const amistadSelectSchema = createSelectSchema(amistad).partial()
export const amistadInsertSchema = createInsertSchema(amistad).partial()

// RETO
export const reto = sqliteTable('reto', {
    id: text('id').primaryKey(),
    created_at: text('created_at').default(sql`'CURRENT_TIMESTAMP'`),
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
    created_at: text('created_at').default(sql`'CURRENT_TIMESTAMP'`),
    JugadorW: integer('JugadorW').references(() => usuario.id),
    JugadorB: integer('JugadorB').references(() => usuario.id),
    Modo: text('Modo'),
    Ganador: integer('Ganador').references(() => usuario.id),
    PGN: text('PGN'),
    Variacion_JW: integer('Variacion_JW'),
    Variacion_JB: integer('Variacion_JB')
})

export const partidaSelectSchema = createSelectSchema(partida).partial()
export const partidaInsertSchema = createInsertSchema(partida).partial()

// RANKING
export const ranking = sqliteTable('ranking', {
    id: text('id').primaryKey(),
    created_at: text('created_at').default(sql`'CURRENT_TIMESTAMP'`),
    Modo: text('Modo').notNull(),
    Puntuacion: integer('Puntuacion').notNull(),
    Posicion: integer('Posicion').notNull()
})

export const rankingSelectSchema = createSelectSchema(ranking).partial()
export const rankingInsertSchema = createInsertSchema(ranking).partial()

// MENSAJE
export const mensaje = sqliteTable('mensaje', {
    Id_mensaje: text('id_mensaje').primaryKey(),
    fecha_envio: text('fecha_envio').default(sql`'CURRENT_TIMESTAMP'`),
    Id_partida: integer('id_partida').references(() => usuario.id).notNull(),
    Id_usuario: integer('id_usuario').references(() => usuario.id).notNull(),

    Mensaje: text('mensaje').notNull()
})

export const mensajeSelectSchema = createSelectSchema(mensaje).partial()
export const mensajeInsertSchema = createInsertSchema(mensaje).partial()

// APERTURA
export const apertura = sqliteTable('apertura', {
    id: text('id').primaryKey(),
    created_at: text('created_at').default(sql`'CURRENT_TIMESTAMP'`),
    Nombre_Aper: text('Nombre_Aper').notNull().unique(),
    PGN: text('PGN'),
})

export const aperturaSelectSchema = createSelectSchema(apertura).partial()
export const aperturaInsertSchema = createInsertSchema(apertura).partial()
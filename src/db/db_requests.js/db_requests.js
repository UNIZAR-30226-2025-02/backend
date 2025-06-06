import { db } from '../db.js';
import { eq, like, or, desc, and, ne, sql } from 'drizzle-orm';
import { usuario, partida, amistad } from '../schemas/schemas.js';

// Consulta para buscar un usuario por si nombre de usuario
// Entrada : Nombre de usuario
// Salida : Datos de los usuario encontrados que coincidan con el fragmento de nombre introducido
export async function buscarUsuarioPorUser(req, res) {
    const user = req.query.NombreUser;
    try {
        const resultado = await db.select().from(usuario).where(like(usuario.NombreUser, `%${user}%`)); // % busca en cualquier parte del texto
        res.json(resultado); // Devolver los usuarios encontrados
    } catch (error) {
        res.status(500).json({ error: 'Error al buscar usuario' });
    }
}

// Consulta para buscar un usuario por su id
// Entrada : id de usuario
// Salida : Datos del usuario encontrado
export async function getUserInfo(req, res) {
    try {
        const userId = req.query.id;
        if (!userId) {
            res.status(400).json({ error: 'Faltan campos' });
            return;
        }
        const usuarios = await db.select().from(usuario).where(eq(usuario.id, userId));
        if (usuarios.length === 0) {
            res.status(400).json({ error: 'Usuario no encontrado' });
            return;
        }
        const user = usuarios[0];
        // Comprobar si el usuario está logueadoha y ha verificado su correo 
        if (user.correoVerificado === 'no' && user.estadoUser !== 'guest') {
            res.status(400).json({ error: 'Usuario con correo no verificado. No es posible acceder a su información hasta que complete el registro' });
            return;
        }

        const { Contrasena, tokenPasswd, tokenVerificacion, ...publicUser } = user;
        res.send(publicUser);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener la información del usuario' });
    }
}

// Consulta para buscar todas las partidas jugadas por un usuario
// Entrada : id de usuario
// Salida : Datos de las partidas jugadas por el usuario (todas)
export async function buscarPartidasDeUsuario(req, res) {
    const id = req.query.id;
    try {
        // Usamos 'or' directamente en la cláusula where
        const partidas = await db.select().from(partida)
            .where(or(eq(partida.JugadorW, id), eq(partida.JugadorB, id))); // Usamos 'or' correctamente
        res.json(partidas); // Devolver las partidas encontradas
    } catch (error) {
        res.status(500).json({ error: 'Error al buscar las partidas del usuario' });
    }
}

// Consulta para buscar las últimas 10 partidas jugadas por un usuario
// Entrada : id de usuario
// Salida : Datos de las últimas 10 partidas jugadas por el usuario
export async function buscarUlt10PartidasDeUsuario(req, res) {
    const id = req.query.id;
    try {
        const partidas = await db.select().from(partida)
            .where(or(eq(partida.JugadorW, id), eq(partida.JugadorB, id)))
            .orderBy(desc(partida.created_at))
            .limit(10);
        res.json(partidas); // Devolver las últimas 5 partidas
    } catch (error) {
        res.status(500).json({ error: 'Error al buscar las últimas 5 partidas del usuario' });
    }
}


// Consulta para buscar las últimas 10 partidas jugadas por un usuario en un modo específico
// Entrada : id de usuario y modo de juego
// Salida : Datos de las últimas 10 partidas jugadas por el usuario en el modo especificado
export async function buscarUlt10PartidasDeUsuarioPorModo(req, res) {
    const id = req.query.id;
    const modo = req.query.modo;
    try {
        const partidas = await db.select().from(partida)
            .where(and(
                and(
                    or(eq(partida.JugadorW, id), eq(partida.JugadorB, id)),
                    eq(partida.Modo, modo)
                ),
                eq(partida.Tipo, "ranked")
            )
            )
            .orderBy(desc(partida.created_at))
            .limit(10);
        res.json(partidas); // Devolver las últimas 5 partidas
    } catch (error) {
        res.status(500).json({ error: 'Error al buscar las últimas 5 partidas del usuario' });
    }
}


// Consulta para buscar las últimas 5 partidas jugadas por un usuario
// Entrada : id de usuario
// Salida : Datos de las últimas 5 partidas jugadas por el usuario
export async function buscarUlt5PartidasDeUsuario(req, res) {
    const id = req.query.id;
    try {
        const partidas = await db.select().from(partida)
            .where(and(
                or(eq(partida.JugadorW, id), eq(partida.JugadorB, id)),
                or(eq(partida.Tipo, "ranked"), eq(partida.Tipo, "guest"))
            )
            )
            .orderBy(desc(partida.created_at))
            .limit(5);
        res.json(partidas); // Devolver las últimas 5 partidas
    } catch (error) {
        res.status(500).json({ error: 'Error al buscar las últimas 5 partidas del usuario' });
    }
}


// Consulta para buscar las últimas 5 partidas jugadas por un usuario en un modo específico
// Entrada : id de usuario y modo de juego
// Salida : Datos de las últimas 5 partidas jugadas por el usuario en el modo especificado
export async function buscarUlt5PartidasDeUsuarioPorModo(req, res) {
    const id = req.query.id;
    const modo = req.query.modo;
    try {
        const partidas = await db.select().from(partida)
            .where(and(
                and(
                    or(eq(partida.JugadorW, id), eq(partida.JugadorB, id)),
                    eq(partida.Modo, modo)
                ),
                eq(partida.Tipo, "ranked")
            )
            )
            .orderBy(desc(partida.created_at))
            .limit(5);
        res.json(partidas); // Devolver las últimas 5 partidas
    } catch (error) {
        res.status(500).json({ error: 'Error al buscar las últimas 5 partidas del usuario' });
    }
}


// Consulta para buscar una partida por su id
// Entrada : id de partida
// Salida : Datos de la partida encontrada
export async function buscarPartida(req, res) {
    const id = req.query.id;
    try {
        const partidaEncontrada = await db.select().from(partida).where(eq(partida.id, id));
        res.json(partidaEncontrada); // Devolver la partida encontrada
    } catch (error) {
        res.status(500).json({ error: 'Error al buscar la partida' });
    }
}


// Esta consulta se utiliza para obtener los amigos de un usuario específico
// Entrada : id del usuario que quiere ver sus amigos
// Salida : Datos de las amistades encontradas
export async function buscarAmigos(req, res) {
    const id = req.query.id;
    try {
        // Buscar amistades donde el usuario sea Jugador1 o Jugador2
        const amistades = await db
            .select({
                amistadId: amistad.id,
                amigoId: usuario.id,
                nombreAmigo: usuario.NombreUser,
                fotoAmigo: usuario.FotoPerfil,
                estadoUser: usuario.estadoUser,
                historialAmistad: amistad.HistorialAmistad,
                retos: amistad.Retos,
                created_at: amistad.created_at
            })
            .from(amistad)
            .leftJoin(usuario, or(
                and(eq(amistad.Jugador1, id), eq(usuario.id, amistad.Jugador2)),
                and(eq(amistad.Jugador2, id), eq(usuario.id, amistad.Jugador1))
            ))
            .where(or(
                eq(amistad.Jugador1, id),
                eq(amistad.Jugador2, id)
            ));

        if (amistades.length === 0) {
            res.json({ Message: 'No tienes amigos' });
            return;
        }

        res.json(amistades);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al buscar los amigos' });
    }
}


// Esta consulta se utiliza para obtener los 10 mejores jugadores de un modo específico
// Entrada : modo de juego (Punt_3, Punt_5, etc.)
// Salida : Datos de los 10 mejores jugadores en el modo especificado y sus estadísticas
export async function rankingPorModo(req, res) {
    const modo = req.query.modo;    // Modo de juego (Punt_3, Punt_5, etc.)
    const numTop = 10; // Número de usuarios a devolver, por defecto 10

    const columnMap = {
        'Punt_3': usuario.Punt_3,
        'Punt_5': usuario.Punt_5,
        'Punt_10': usuario.Punt_10,
        'Punt_30': usuario.Punt_30,
        'Punt_3_2': usuario.Punt_3_2,
        'Punt_5_10': usuario.Punt_5_10
    };

    try {
        const ranking = await db
            .select({
                rank: sql`ROW_NUMBER() OVER (ORDER BY ${columnMap[modo]} DESC)`.as('rank'), // Calcular el ranking
                id: usuario.id,
                nombre: usuario.NombreUser,
                foto: usuario.FotoPerfil,
                victorias: usuario.totalWins,
                derrotas: usuario.totalLosses,
                empates: usuario.totalDraws,
                rachaActual: usuario.actualStreak,
                rachaMaxima: usuario.maxStreak,
                puntuacion: columnMap[modo] // Usar el modo de puntuación correcto

            })
            .from(usuario)
            .where(ne(usuario.estadoUser, 'guest'))
            .orderBy(desc(columnMap[modo])) // Ordenar por puntuación en el modo especificado
            .limit(numTop); // Limitar a los primeros numTop resultados

        console.log("Consulta ranking: ", ranking)
        if (ranking.length === 0) {
            res.status(400).json({ error: 'No hay usuarios en el ranking' });
            return;
        }
        res.json(ranking); // Devolver el ranking
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener el ranking' });
    }
}


// Esta consulta se utiliza para obtener el ranking de un usuario específico en un modo específico
// Entrada : id del usuario y modo de juego (Punt_3, Punt_5, etc.)
// Salida : Datos del usuario y su posición en el ranking
export async function rankingUserPorModo(req, res) {
    const modo = req.query.modo;    // Modo de juego (Punt_3, Punt_5, etc.)
    const user = req.query.user;    // Nombre de usuario

    const columnMap = {
        'Punt_3': usuario.Punt_3,
        'Punt_5': usuario.Punt_5,
        'Punt_10': usuario.Punt_10,
        'Punt_30': usuario.Punt_30,
        'Punt_3_2': usuario.Punt_3_2,
        'Punt_5_10': usuario.Punt_5_10
    };

    try {
        const ranking = await db
            .select({
                rank: sql`ROW_NUMBER() OVER (ORDER BY ${columnMap[modo]} DESC)`.as('rank'), // Calcular el ranking
                id: usuario.id,
                nombre: usuario.NombreUser,
                puntuacion: columnMap[modo] // Usar el modo de puntuación correcto

            })
            .from(usuario)
            .where(ne(usuario.estadoUser, 'guest'))
            .orderBy(desc(columnMap[modo])) // Ordenar por puntuación en el modo especificado

        console.log("Consulta ranking: ", ranking)
        if (ranking.length === 0) {
            res.status(400).json({ error: 'No ha encotrado al usuario' });
            return;
        }
        // Buscar el ranking del usuario específico
        const userRanking = ranking.find(userRank => userRank.nombre === user);
        if (!userRanking) {
            res.status(400).json({ error: 'Usuario no encontrado en el ranking' });
            return;
        }

        res.json(userRanking); // Devolver el ranking
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener el ranking' });
    }
}

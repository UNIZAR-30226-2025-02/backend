import { db } from '../db/db.js';
import { partida, usuario, amistad, reto } from '../db/schemas/schemas.js';
import { Chess } from 'chess.js';
import { eq, or, and, sql } from "drizzle-orm";
import { io } from '../../server.js';
import { activeSockets } from '../../server.js';
import { ActiveXObjects } from '../rooms/rooms.js';

// -----------------------------------------------------------------------------------------------
// Función utilizada para enviar una solicitud de amistad a otro jugador, que puede aceptarla
// o rechazarla
// -----------------------------------------------------------------------------------------------
export async function addFriend(data, socket) {
    const idJugador = data.idJugador;
    const idAmigo = data.idAmigo;
    const socketAmigo = activeSockets.get(idAmigo);

    if (!socketAmigo) {
        console.log("Error al enviar solicitud de amistad, el jugador no está conectado.");
        return socket.emit('errorMessage', "El otro jugador no está conectado.");
    }

    // Enviar la solicitud de amistad al jugador deseado
    io.to(socketAmigo.id).emit('friendRequest' , { idJugador, idAmigo });
    console.log("Solicitud de amistad enviada de ", data.idJugador,  "a " , data.idAmigo);
   
}

// -----------------------------------------------------------------------------------------------
// Función utilizada para aceptar una solicitud de amistad entrante
// -----------------------------------------------------------------------------------------------
export async function acceptFriendRequest(data, socket) {
    let idJugador = data.idJugador;
    let idAmigo = data.idAmigo;

    console.log("Solicitud de amistad aceptada, IDs procesados:", idJugador, idAmigo);
    console.log("Verificando si la amistad ya existe...")
    const existingFriendship = await db.select()
    .from(amistad)
    .where(
        or(
            and(eq(amistad.Jugador1, idJugador), eq(amistad.Jugador2, idAmigo)),
            and(eq(amistad.Jugador1, idAmigo), eq(amistad.Jugador2, idJugador))
        )
    )
    .get();

    // Si la amistad ya existe en BBDD, emitir mensaje de error
    if (existingFriendship) {
        console.log("Los jugadores ya son amigos.");
        return socket.emit('errorMessage', "Ya son amigos." );
    }

    //Generar un nuevo ID para la amistad
    const newFriendshipId = crypto.randomUUID();

    // Insertar nueva amistad en la BBDD
    await db.insert(amistad).values({
        id: newFriendshipId,
        Jugador1: idJugador,
        Jugador2: idAmigo,
        Retos: 0
    });

    // Actualizar el contador de amistades de ambos jugadores en la tabla usuario
    await db.update(usuario)
            .set({ Amistades: sql`Amistades + 1` })
            .where(or(eq(usuario.id, idJugador), eq(usuario.id, idAmigo)))
            .run();

    // Comunicar al jugador que envió la solicitud de amistad que esta ha sido aceptada
    const socketJugador = activeSockets.get(idJugador);
    if (!socketJugador) {
        console.log("El jugador no está conectado. No se le notificará.");
        return;
    }
    
    io.to(socketJugador.id).emit('friendRequestAccepted', { idJugador, idAmigo });
    console.log(`Solicitud de amistad aceptada de ${idAmigo} a ${idJugador}`);
}

// -----------------------------------------------------------------------------------------------
// Función utilizada para rechazar una solicitud de amistad entrante
// -----------------------------------------------------------------------------------------------
export async function rejectFriendRequest(data, socket) {
    const idJugador = data.idJugador;
    const idAmigo = data.idAmigo;

    // Informar al jugador que envió la solicitud de amistad de que esta ha sido rechazada
    const socketJugador = activeSockets.get(idJugador);
    if (!socketJugador) {
        console.log("El jugador no está conectado. No se le notificará.");
        return;
    }
    
    io.to(socketJugador.id).emit('friendRequestRejected', { idJugador, idAmigo });
    console.log(`Solicitud de amistad rechazada de ${idAmigo} a ${idJugador}`);
}

// -----------------------------------------------------------------------------------------------
// Función utilizada para eliminar a un jugador de la lista de amigos
// -----------------------------------------------------------------------------------------------
export async function removeFriend(data, socket) {
    const idJugador = data.idJugador;
    const idAmigo = data.idAmigo;

    // Comprobar si hay retos activos entre los jugadores, y si es así, informar a ambos de que
    // deben finalizarlos antes de borrar su amistad
    const activeChallenges = await db.select()
        .from(reto)
        .where(
            or(
                and(eq(reto.Retador, idJugador), eq(reto.Retado, idAmigo), eq(reto.Activo, 1)),
                and(eq(reto.Retador, idAmigo), eq(reto.Retado, idJugador), eq(reto.Activo, 1))
            )
        )
        .all();

    if (activeChallenges.length > 0) {
        console.log(`Existen retos activos entre ${idJugador} y ${idAmigo}. No se puede eliminar la amistad.`);
        return socket.emit('errorMessage', "Existen retos activos entre ambos jugadores. " +
            "Finalícelos antes de eliminar la amistad.");
    }

    // Comprobar si hay retos pendientes entre los jugadores, y si es así, eliminarlos
    await db.delete(reto)
        .where(
            or(
                and(eq(reto.Retador, idJugador), eq(reto.Retado, idAmigo)),
                and(eq(reto.Retador, idAmigo), eq(reto.Retado, idJugador)),
                and(eq(reto.Pendiente, 1))
            )
        )
        .run();
    
    // Eliminar la amistad de la BBDD y notificar al amigo de que su amistad con el jugador ha
    // finalizado
    const deleted = await db.delete(amistad)
    .where(
        or(
            and(eq(amistad.Jugador1, idJugador), eq(amistad.Jugador2, idAmigo)),
            and(eq(amistad.Jugador1, idAmigo), eq(amistad.Jugador2, idJugador))
        )
    )
    .run();

    if (deleted.changes === 0) {
        console.log(`No se encontró la amistad entre ${idJugador} y ${idAmigo}.`);
        return socket.emit('errorMessage', "No se encontró la amistad que se desea eliminar.");
    }

    // Actualizar el contador de amistades de ambos jugadores en la tabla usuario
    await db.update(usuario)
            .set({ Amistades: sql`Amistades - 1` })
            .where(or(eq(usuario.id, idJugador), eq(usuario.id, idAmigo)))
            .run();

    const socketAmigo = activeSockets.get(idAmigo); // Obtener el socket del amigo
    if (!socketAmigo) {
        console.log("El amigo no está conectado. No se le notificará.");
        return;
    }

    // Notificar al otro jugador del fin de amistad
    io.to(socketAmigo.id).emit('friendRemoved' , { idJugador, idAmigo });
    console.log("Eliminación de la amistad de ", data.idJugador,  "a " , data.idAmigo);
}

// -----------------------------------------------------------------------------------------------
// Función utilizada para enviar un reto a un jugador de la lista de amigos
// -----------------------------------------------------------------------------------------------
export async function challengeFriend(data, socket) {
    const idRetador = data.idRetador;
    const idRetado = data.idRetado;
    const modo = data.modo;
    try {

        // Verificar si los jugadores son amigos
        const friendship = await db.select()
            .from(amistad)
            .where(
                or(
                    and(eq(amistad.Jugador1, idRetador), eq(amistad.Jugador2, idRetado)),
                    and(eq(amistad.Jugador1, idRetado), eq(amistad.Jugador2, idRetador))
                )
            )
            .get();

        if (!friendship) {
           console.log("No son amigos.");
           return socket.emit('errorMessage', "Debeis ser amigos para poder enviaros un reto.");
        }

        // Verificar si ya hay un reto pendiente o activo entre estos jugadores
        // (Sólo se permite enviar un reto, hasta que este sea rechazado o aceptado y finalizada
        //  la partida)
        const existingChallenge = await db.select()
            .from(reto)
            .where(
                and(
                    eq(reto.Retador, idRetador),
                    eq(reto.Retado, idRetado)
                )
            )
            .get();

        if (existingChallenge) {
            console.log("Ya tienes un reto activo/pendiente con este amigo.");
            return socket.emit('errorMessage',"Ya tienes un reto activo/pendiente con este amigo.");
        }

        // Obtener el socket del amigo, si no está conectado no se creará el reto
        const socketRetado = activeSockets.get(idRetado);
        if (!socketRetado) {
            console.log("La persona retada no está en línea. No se puede crear el reto.");
            return socket.emit('errorMessage', "La persona retada no está conectada. No se puede"
                + "crear el reto");
        }

        // Crear el reto en BBDD y marcarlo como Pendiente de aceptación
        const retoId = crypto.randomUUID();
        await db.insert(reto).values({
            id: retoId,
            Retador: idRetador,
            Retado: idRetado,
            Activo: 0,
            Pendiente: 1,
            Modo: modo,
            Amistad: friendship.id
        });

        // Notificar del nuevo reto al amigo retado
        io.to(socketRetado.id).emit('challengeSent' , { idRetador, idRetado, modo });
        console.log(`Reto enviado de ${idRetador} a ${idRetado} para jugar partida de ${modo}`);
   
    } catch (error) {
        console.error("Error al retar amigo:", error);
    }
}

// -----------------------------------------------------------------------------------------------
// Función utilizada para aceptar un reto pendiente con un jugador de la lista de amigos
// -----------------------------------------------------------------------------------------------
export async function createDuelGame(data, socket) {
    try {
        const idRetador = data.idRetador;
        const idRetado = data.idRetado;
        const modo = data.modo;

        // Buscar el reto pendiente entre los jugadores en la BBDD
        const challenge = await db.select()
            .from(reto)
            .where(
                and(
                    eq(reto.Retador, idRetador),
                    eq(reto.Retado, idRetado),
                    eq(reto.Pendiente, 1)
                )
            )
            .get();
        
        if (!challenge) {
            console.log("No hay un reto pendiente con este amigo.");
            return socket.emit('errorMessage', "No tienes retos pendientes con este amigo.");
        }

        // Crear el objeto que manejará la partida de ajedrez de este reto
        const chess = new Chess();
        const gameId = crypto.randomUUID();

        // Decidir colores aleatoriamente
        const randomColor = Math.random() < 0.5 ? 'white' : 'black';

        // Asignar colores según randomColor
        let idBlancas, idNegras;
        let nombreBlancas, nombreNegras, eloBlancas, eloNegras;
        if (randomColor === 'white') {
            idBlancas = idRetador;
            idNegras = idRetado;
            
            chess.setHeader('White', idRetador);
            chess.setHeader('Black', idRetado);
        } else {
            idBlancas = idRetado;
            idNegras = idRetador;
            chess.setHeader('White', idRetado);
            chess.setHeader('Black', idRetador);
        }
        
        // Obtener datos de los jugadores para completar la cabecera del PGN de la partida
        const jugadorBlancas = await db.select()
                                        .from(usuario)
                                        .where(eq(usuario.id, idBlancas))
                                        .get();
                                        
        const jugadorNegras = await db.select()
                                        .from(usuario)
                                        .where(eq(usuario.id, idNegras))
                                        .get();

        nombreBlancas = jugadorBlancas.NombreUser;
        nombreNegras = jugadorNegras.NombreUser;
        eloBlancas = jugadorBlancas[modo];
        eloNegras = jugadorNegras[modo];
        fotoBlancas = jugadorBlancas.FotoPerfil;
        fotoNegras = jugadorNegras.FotoPerfil;
        
        //poner en el header los elo y los alias
        chess.setHeader('White Elo', eloBlancas);
        chess.setHeader('Black Elo', eloNegras);
        chess.setHeader('White Alias', nombreBlancas);
        chess.setHeader('Black Alias', nombreNegras);

        console.log("Nombres de los jugadores: ", { nombreBlancas, nombreNegras });
        console.log("Elo de los jugadores: ", { eloBlancas, eloNegras });
        
        // Recuperar las conexiones activas de los jugadores para incluirlos en la nueva partida
        const socketRetador = activeSockets.get(idRetador); // Obtener el socket del Retador
        const socketRetado = activeSockets.get(idRetado);   // Obtener el socket del Retado

        if (!socketRetador || !socketRetado) {
            console.log("Uno de los jugadores no está conectado.");
            return socket.emit('errorMessage', "Uno de los jugadores no está conectado.");
        }

        // Unir a los jugadores a la sala de la partida
        socketRetador.join(gameId);
        socketRetado.join(gameId);

        // Almacenar la partida en BBDD con los datos obtenidos
        await db.insert(partida).values({
            id: gameId,
            JugadorW: randomColor === 'white' ? idRetador : idRetado,
            JugadorB: randomColor === 'black' ? idRetador : idRetado,
            Modo: modo,
            PGN: chess.pgn(),
            Ganador: null,
            Variacion_JW: 0,
            Variacion_JB: 0,
            Tipo: "reto",
        });
        console.log("Partida creada en la base de datos con ID:", gameId);

        // Añadir la partida a memoria (objeto dinámico que almacena todas las partidas activas)
        ActiveXObjects[gameId] = {
            players: [idRetador, idRetado],
            chess: chess,
        };

        // Marcar el reto como aceptado
        await db.update(reto)
            .set({ Pendiente: 0, Activo: 1 })
            .where(eq(reto.id, challenge.id))
            .run();
        
        console.log('Reto actualizado');
        console.log(`Partida creada entre ${idRetador} y ${idRetado}. ID de partida: ${gameId}`);
        
        // Borrar el reto de BBDD antes de entrar a partida
        await db.delete(reto)
                .where(
                    eq(reto.id, challenge.id))
                .run();

        console.log(`Reto entre ${idRetador} y ${idRetado} eliminado.`);

        // Notificar con game-ready a los jugadores que la partida está lista
        io.to(gameId).emit('game-ready', { idPartida: gameId, tipo: 'reto' });

        // Notificar a cada jugador su color en la partida
        console.log("ID jugador blanco:", idBlancas);
        console.log("ID jugador negro:", idNegras);

        io.to(gameId).emit('color', {
            jugadores: [
                { id: idBlancas, nombreW: nombreBlancas, eloW: eloBlancas, color: 'white', fotoBlancas: fotoBlancas },
                { id: idNegras, nombreB: nombreNegras, eloB: eloNegras, color: 'black', fotoNegras: fotoNegras }
            ]
        });

        return gameId;

    } catch (error) {
        console.log ("Error al crear la partida de reto.");
    }
}

// -----------------------------------------------------------------------------------------------
// Función utilizada para rechazar un reto pendiente con un jugador de la lista de amigos
// -----------------------------------------------------------------------------------------------
export async function deleteChallenge(data, socket) {
    const idRetador = data.idRetador;
    const idRetado = data.idRetado;

    try {
        // Buscar y eliminar el reto pendiente entre los jugadores de la BBDD 
        const result = await db.delete(reto)
            .where(
                eq(reto.Retador, idRetador) && eq(reto.Retado, idRetado)
            )
            .run();

        if (result.changes > 0) {
            console.log(`Reto entre ${idRetador} y ${idRetado} eliminado.`);
        } else {
            console.log(`No se encontró un reto entre ${data.idRetador} y ${data.idRetado}.`);
        }
        console.log("Se ha boorado correctamente el reto correspondiente");

    } catch (error) {
        console.error("Error al eliminar el reto:", error);
    }
}

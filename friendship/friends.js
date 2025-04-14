import { db } from '../db/db.js';
import { partida, usuario, amistad, reto } from '../db/schemas/schemas.js';
import { Chess } from 'chess.js';
import { eq, or, and, sql } from "drizzle-orm";
import { io } from '../server.js';
import { activeSockets } from '../server.js';


//Funcion para añadir un amigo
//QUE SEA MUTUO ACUERDO
export async function addFriend(data, socket) {
    const idJugador = data.idJugador;
    const idAmigo = data.idAmigo;
    const socketAmigo = activeSockets.get(idAmigo); // Obtener el socket del amigo

    if (!socketAmigo) {
        console.log("El amigo no está conectado.");
        return socket.emit('errorMessage', "El amigo no está conectado.");
    }

    //Mandar evento de friendRequest al socket del amigo
    io.to(socketAmigo.id).emit('friendRequest', { idJugador, idAmigo });
    console.log("Solicitud de amistad enviada de ", data.idJugador, "a ", data.idAmigo);

}

//funcion para aceptar una solicitud de amistad
export async function acceptFriendRequest(data, socket) {
    console.log("Aceptando solicitud de amistad...")
    //const idJugador = data.idJugador;
    //const idAmigo = data.idAmigo;
    // Verificar si la amistad ya existe
    console.log("Datos recibidos:", data);
    let idJugador = data.idJugador;
    let idAmigo = data.idAmigo;

    // Intentar convertir a número si es posible
    if (!isNaN(idJugador)) idJugador = Number(idJugador);
    if (!isNaN(idAmigo)) idAmigo = Number(idAmigo);

    console.log("IDs procesados:", idJugador, idAmigo);
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

    if (existingFriendship) {
        console.log("Ya son amigos");
        return socket.emit('error', "Ya son amigos");
    }

    //Generar un nuevo ID para la amistad
    const newFriendshipId = crypto.randomUUID();

    console.log("Voy a añadir la amistad a la base de datos");

    // Insertar nueva amistad en la BD
    await db.insert(amistad).values({
        id: newFriendshipId,
        Jugador1: idJugador,
        Jugador2: idAmigo,

        Retos: 0
    });

    // HistorialAmistad: JSON.stringify([]), // Historial vacío al inicio

    // Aumentar en uno el contador de amigos de ambos jugadores
    await db.update(usuario)
        .set({ Amistades: sql`Amistades + 1` })
        .where(or(eq(usuario.id, idJugador), eq(usuario.id, idAmigo)))
        .run();

    //comunicar con un socket al jugador que la solicitud ha sido aceptada
    //socket.to(idJugador).emit('friendRequestAccepted', { idJugador, idAmigo });
    const socketJugador = activeSockets.get(idJugador); // Obtener el socket del jugador
    if (!socketJugador) {
        console.log("El jugador no está conectado.");
        return socket.emit('errorMessage', "El jugador no está conectado.");
    }

    io.to(socketJugador.id).emit('friendRequestAccepted', { idJugador, idAmigo });
    console.log(`Solicitud de amistad aceptada de ${idAmigo} a ${idJugador}`);
}

//Funcion para rechazar una solicitud de amistad
export async function rejectFriendRequest(data, socket) {
    const idJugador = data.idJugador;
    const idAmigo = data.idAmigo;
    // emitir con un socket al jugador que la solicitud ha sido rechazada
    //el que lo tiene que emitir es el amigo
    const socketJugador = activeSockets.get(idJugador); // Obtener el socket del jugador
    if (!socketJugador) {
        console.log("El jugador no está conectado.");
        return socket.emit('errorMessage', "El jugador no está conectado.");
    }

    io.to(socketJugador.id).emit('friendRequestRejected', { idJugador, idAmigo });
    console.log(`Solicitud de amistad rechazada de ${idAmigo} a ${idJugador}`);
}


//Funcion para eliminar un amigo
export async function removeFriend(data, socket) {
    const idJugador = data.idJugador;
    const idAmigo = data.idAmigo;

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

    }

    const socketAmigo = activeSockets.get(idAmigo); // Obtener el socket del amigo

    if (!socketAmigo) {
        console.log("El amigo no está conectado.");
        return socket.emit('errorMessage', "El amigo no está conectado.");
    }

    //Mandar evento de que se ha elimnado la amistad al socket del amigo
    io.to(socketAmigo.id).emit('friendRemoved', { idJugador, idAmigo });
    console.log("Eliminación de la amistad de ", data.idJugador, "a ", data.idAmigo);
}

//PENDIENTE COMPLETAR
//Funcion para retar a un amigo
export async function challengeFriend(data, socket) {
    const idRetador = data.idRetador;
    const idRetado = data.idRetado;
    const modo = data.modo;
    try {
        // Verificar si ya hay un reto activo entre estos jugadores
        const existingChallenge = await db.select()
            .from(reto)
            .where(
                and(
                    eq(reto.Retador, idRetador),
                    eq(reto.Retado, idRetado),
                    eq(reto.Activo, 1)
                )
            )
            .get();

        if (existingChallenge) {
            console.log("Ya tienes un reto activo con este amigo.");
        }

        // Verificar si son amigos
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
        }

        // Crear un reto
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

        console.log(`Reto enviado de ${idRetador} a ${idRetado} a jugar partida ${modo}`);
        // Emitir evento al jugador

        const socketRetado = activeSockets.get(idRetado); // Obtener el socket del amigo

        if (!socketRetado) {
            console.log("La persona retada no está conectado.");
            return socket.emit('errorMessage', "La persona retada no está conectado.");
        }

        //Mandar evento de friendRequest al socket del amigo
        io.to(socketRetado.id).emit('challengeSent', { idRetador, idRetado, modo });
        console.log("Reto ha sido enviado de ", data.idRetador, "a ", data.idRetado);

    } catch (error) {
        console.error("Error al retar amigo:", error);

    }
}


//CUANDO EL OTRO ACEPTE EL RETO LANZAR ESTA FUNCION
export async function createDuelGame(data, socket) {
    try {
        const idRetador = data.idRetador;
        const idRetado = data.idRetado;
        const modo = data.modo;
        console.log("Aceptando reto...")
        console.log("Valores recibidos:", { idRetador, idRetado, modo });

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
        }

        console.log("Reto encontrado: ", challenge);


        // Crear la partida de ajedrez
        const chess = new Chess();
        const gameId = crypto.randomUUID();

        // Decidir colores aleatoriamente
        const randomColor = Math.random() < 0.5 ? 'white' : 'black';

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

        console.log("La partida ha sido creada", partida);

        // Marcar el reto como aceptado
        await db.update(reto)
            .set({ Pendiente: 0, Activo: 1 })
            .where(eq(reto.id, challenge.id))
            .run();

        console.log('Reto actualizado')

        // Crear sala en socket
        socket.join(gameId);

        console.log(`Partida creada entre ${idRetador} y ${idRetado}. ID de partida: ${gameId}`);

        // Emitir evento de partida creada a ambos jugadores
        const socketRetador = activeSockets.get(idRetador); // Obtener el socket del retador
        const socketRetado = activeSockets.get(idRetado); // Obtener el socket del retador

        if (!socketRetador || !socketRetado) {
            console.log("Uno de los jugadores no está conectado.");
            return socket.emit('errorMessage', "Uno de los jugadores no está conectado.");
        }

        //Mandar evento de partida creada al socket del retador
        //Hay que meter en la partida con socket.join
        //Ahora borramos el reto de la base de datos antes de entrar a partida

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

        console.log("La partida se ha creado bien y el reto se ha eliminado")

        socketRetador.join(gameId);
        socketRetado.join(gameId);


        return gameId;

    } catch (error) {
        console.log("Error al crear partida");
    }
}

export async function deleteChallenge(data, socket) {
    const idRetador = data.idRetador;
    const idRetado = data.idRetado;
    const modo = data.modo;
    try {

        // Buscar y eliminar el reto de la base de datos
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
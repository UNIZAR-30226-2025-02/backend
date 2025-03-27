import { db } from '../db/db.js';
import { partida, usuario, amistad } from '../db/schemas/schemas.js';
import { Chess } from 'chess.js';
import { eq, or, and, isNull } from "drizzle-orm";
import { io } from '../server.js';


//Funcion para añadir un amigo
//QUE SEA MUTUO ACUERDO
export async function addFriend(data, socket) {
    const idJugador = data.idJugador;
    const idAmigo = data.idAmigo;
    // Verificar si la amistad ya existe

    socket.to(idAmigo).emit('friendRequest', { idJugador, idAmigo });
    console.log("Solicitud de amistad enviada de ", data.idJugador,  "a " , data.idAmigo);
   
}

//funcion para aceptar una solicitud de amistad
export async function acceptFriendRequest(data, socket) {
    console.log("Aceptando solicitud de amistad...")
    const idJugador = data.idJugador;
    const idAmigo = data.idAmigo;
    // Verificar si la amistad ya existe
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
        return socket.emit('error', "Ya son amigos" );
    }

    //Generar un nuevo ID para la amistad
    const newFriendshipId = crypto.randomUUID();

    // Insertar nueva amistad en la BD
    await db.insert(amistad).values({
        id: newFriendshipId,
        Jugador1: idJugador,
        Jugador2: idAmigo,
        HistorialAmistad: JSON.stringify([]), // Historial vacío al inicio
        Retos: 0
    });

    //comunicar con un socket al jugador que la solicitud ha sido aceptada
    socket.to(idJugador).emit('friendRequestAccepted', { idJugador, idAmigo });

}

//Funcion para rechazar una solicitud de amistad
export async function rejectFriendRequest(data, socket) {
    const idJugador = data.idJugador;
    const idAmigo = data.idAmigo;
    // emitir con un socket al jugador que la solicitud ha sido rechazada
    //el que lo tiene que emitir es el amigo
    socket.to(idJugador).emit('friendRequestRejected', { idJugador, idAmigo });
    console.log(`Solicitud de amistad rechazada de ${idAmigo} a ${idJugador}`);
}


//Funcion para eliminar un amigo
export async function removeFriend(data, socket) {
    const idJugador = data.idJugador;
    const idAmigo = data.idAmigo;

    await db.delete(amistad)
    .where(
        or(
            and(eq(amistad.Jugador1, idJugador), eq(amistad.Jugador2, idAmigo)),
            and(eq(amistad.Jugador1, idAmigo), eq(amistad.Jugador2, idJugador))
        )
    )
    .run();

    if (deleted.changes === 0) {
        console.log(`No se encontró la amistad entre ${idJugador} y ${idAmigo}.`);
        return socket.emit('error', "No se encontró la amistad entre " + idJugador + " y " + idAmigo);
    }
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
                sql`Retador = ${idRetador} AND Retado = ${idRetado} AND Pendiente = 1`
            )
            .get();

        if (existingChallenge) {
            return { success: false, message: "Ya tienes un reto pendiente con este amigo." };
        }

        // Verificar si son amigos
        const friendship = await db.select()
            .from(amistad)
            .where(
                sql`(Jugador1 = ${idRetador} AND Jugador2 = ${idRetado}) 
                OR (Jugador1 = ${idRetado} AND Jugador2 = ${idRetador})`
            )
            .get();

        if (!friendship) {
            return { success: false, message: "No puedes retar a alguien que no es tu amigo." };
        }

        // Crear un reto
        const retoId = crypto.randomUUID();
        await db.insert(reto).values({
            id: retoId,
            Retador: idRetador,
            Retado: idRetado,
            Activo: 1,
            Pendiente: 1,
            Modo: modo,
            Amistad: friendship.id
        });

        return { success: true, message: "Reto enviado con éxito." };
    } catch (error) {
        console.error("Error al retar amigo:", error);
        return { success: false, message: "Error al enviar el reto." };
    }
}


//CUANDO EL OTRO ACEPTE EL RETO LANZAR ESTA FUNCION
export async function createDuelGame(idRetador, idRetado, mode, socket) {
    try {
        // Verificar si el reto sigue pendiente
        const challenge = await db.select()
            .from(reto)
            .where(
                sql`Retador = ${idRetador} AND Retado = ${idRetado} AND Pendiente = 1`
            )
            .get();

        if (!challenge) {
            return { success: false, message: "No hay un reto pendiente con este amigo." };
        }

        // Crear la partida de ajedrez
        const chess = new Chess();
        const gameId = crypto.randomUUID();

        // Decidir colores aleatoriamente
        const randomColor = Math.random() < 0.5 ? 'white' : 'black';

        await db.insert(partida).values({
            id: gameId,
            JugadorW: randomColor === 'white' ? idRetador : idRetado,
            JugadorB: randomColor === 'black' ? idRetador : idRetado,
            Modo: mode,
            PGN: chess.pgn(),
            Ganador: null,
            Variacion_JW: 0,
            Variacion_JB: 0
        });

        // Marcar el reto como aceptado
        await db.update(reto)
            .set({ Pendiente: 0, Activo: 1 })
            .where(eq(reto.id, challenge.id))
            .run();

        // Crear sala en socket
        socket.join(gameId);

        return { success: true, gameId, message: "Partida creada con éxito." };
    } catch (error) {
        console.error("Error al crear partida de duelo:", error);
        return { success: false, message: "Error al crear partida." };
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
    } catch (error) {
        console.error("Error al eliminar el reto:", error);
    }
}
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/db.js';
import { mensaje } from '../db/schemas/schemas.js';
import { eq } from 'drizzle-orm';

/*
 * Almacena un nuevo mensaje en la base de datos, y lo notifica al otro jugador
 */
export async function saveMessage(data, socket) {
    try {
        await db.insert(mensaje).values({
            // Genera un uuid para el id de mensaje
            Id_mensaje: uuidv4(),
            Id_partida: data.game_id,
            Id_usuario: data.user_id,
            Mensaje: data.message,
        });
        console.log("Mensaje almacenado en la base de datos");

        // Notificar al resto de integrantes de la sala correspondiente a la partida (el otro
        // jugador o espectadores) sobre el mensaje eliminado

        socket.to(data.game_id).emit('new-message', data);
    } catch (error) {
        console.error("Error al almacenar el mensaje:", error);
    }
}

/*
 * Obtiene todos los mensajes enviados/recibidos de una partida específica
 */
export async function fetchMessages(data, socket) {
    try {
        console.log("Buscando mensajes para la partida con ID:", data.game_id);
        const messages = await db.select().from(mensaje).where(eq(mensaje.Id_partida, data.game_id)).all();
        socket.emit('chat-history', messages);
        console.log(messages);
        ;
    } catch (error) {
        console.error("Error al obtener los mensajes:", error);
        return [];
    }
}

/*
 * Elimina un mensaje previamente enviado por el usuario
 */
export async function deleteMessage(data, socket) {
    try {
        console.log("Eliminando mensaje seleccionado de la base de datos...")
        const message = await db.delete(mensaje).where(eq(mensaje.Id_mensaje, data.message_id));
        // Notificar al resto de integrantes de la sala correspondiente a la partida (el otro
        // jugador o espectadores) sobre el mensaje eliminado
        console.log(message);
        // io.to(data.game_id).emit('message-deleted', data);
    } catch (error) {
        console.error("Error al eliminar el mensaje:", error);
    }
}

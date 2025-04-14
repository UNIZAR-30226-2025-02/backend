import { or, lt, eq, and, inArray } from 'drizzle-orm';
import { db } from '../db/db.js';
import { usuario, mensaje, partida } from '../db/schemas/schemas.js';

export async function deleteInactiveGuests() {
    // Obtener el timestamp actual en segundos
    const timeStampActual = Math.floor(Date.now() / 1000);
    console.log('Buscando invitados inactivos...');

    // Obtener los usuarios inactivos que no han jugado en las últimas 24 horas y son invitados
    const usersToDelete = await db.select
    ({
        mensajeId: mensaje.Id_mensaje,
        partidaId: partida.id,
        usuarioId: usuario.id,
    })
        .from(usuario)
            .leftJoin(mensaje, eq(usuario.id, mensaje.Id_usuario))
            .leftJoin(partida, or(eq(usuario.id, partida.JugadorW), eq(usuario.id, partida.JugadorB)))
        .where(
            and
            (   
                lt(usuario.lastOnline, (timeStampActual - 86400)),
                eq(usuario.estadoUser, "guest")
            )
        );
    
    // Agregar los ids de los mensajes, partidas y usuarios a borrar
    const messageIds = [...new Set(usersToDelete.map(user => user.mensajeId).filter(id => id !== null))];
    const gameIds = [...new Set(usersToDelete.map(user => user.partidaId).filter(id => id !== null))];
    const userIds = [...new Set(usersToDelete.map(user => user.usuarioId).filter(id => id !== null))];
    
    // Borrar mensajes de los usuarios
    if (messageIds.length > 0) {
        await db.delete(mensaje).where(inArray(mensaje.Id_mensaje, messageIds));
    }

    // Borrar partidas de los usuarios
    if (gameIds.length > 0) {
        await db.delete(partida).where(inArray(partida.id, gameIds));
    }

    // Borrar usuarios inactivos
    if (userIds.length > 0) {
        await db.delete(usuario).where(inArray(usuario.id, userIds));
    }

    console.log('Usuarios inactivos borrados: ' + userIds.length);
    console.log('Mensajes borrados: ' + messageIds.length);
    console.log('Partidas borradas: ' + gameIds.length);
}    
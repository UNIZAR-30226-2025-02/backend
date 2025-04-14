import './dotenv-config.js';
import { Server } from 'socket.io';
import http from 'http';
import { app } from './app.js';
import { authenticate } from './login/login.js';
import { saveMessage, fetchMessages } from './chat/chat.js';
import { db } from './db/db.js';
import { or, lt, eq, and } from 'drizzle-orm';
import schedule from 'node-schedule';
import { usuario, mensaje, partida } from './db/schemas/schemas.js';

import {
    findGame, manejarMovimiento, cancelarBusquedaPartida,
    manejarRendicion, ofertaDeTablas, aceptarTablas, rechazarTablas
} from './rooms/rooms.js';

import {
    addFriend, removeFriend, challengeFriend, createDuelGame, acceptFriendRequest,
    rejectFriendRequest,
    deleteChallenge
} from './friendship/friends.js';


// Objeto que almacenará los sockets con los usuarios conectados al servidor
export let activeSockets = new Map();

// Crear el servidor manualmente para poder utilizar WebSockets
export const server = http.createServer(app);
export const io = new Server(server, {
    cors: {
        origin: '*'
    },
    connectionStateRecovery: {
        // the backup duration of the sessions and the packets
        maxDisconnectionDuration: 2 * 60 * 1000,
        // whether to skip middlewares upon successful recovery
        skipMiddlewares: false
    }
})

const PORT = app.get('port');

// Iniciar el servidor en el puerto especificado
server.listen(PORT, () => {
    console.log(`Servidor corriendo en la direccion http://localhost:${PORT}`);
});

// Schedule a job to run every day at 2:30 PM
//const job = schedule.scheduleJob('30 14 * * *', async function () {
const job = schedule.scheduleJob('* * * * *', async function () {

    // Buscar en la base de datos todos los usuarios con estadoUser = "readyToDelete"
    // Borrar todos los mensajes procedentes de estos usuarios
    // Borrar todas las partidas jugadas por estos usuarios
    // Borrar todos estos usuarios

    const timeStampActual = Math.floor(Date.now() / 1000);
    console.log('This job runs every day at 2:30 PM.');
    console.log('Buscando usuarios inactivos...');
    const usersToDelete = await db.select({
        mensajeId: mensaje.Id_mensaje,
        partidaId: partida.id,
        usuarioId: usuario.id,
    }).from(usuario)
        .leftJoin(mensaje, eq(usuario.id, mensaje.Id_usuario))
        .leftJoin(partida, or(eq(usuario.id, partida.JugadorW), eq(usuario.id, partida.JugadorB)))
        .where(and(lt(usuario.lastOnline, (timeStampActual - 60)), eq(usuario.estadoUser, "guest"))).run();

    console.log('Usuarios inactivos encontrados: ' + usersToDelete.length);
    console.log(usersToDelete);

    const messageIds = usersToDelete.map(user => user.mensajeId).filter(id => id !== null);
    const gameIds = usersToDelete.map(user => user.partidaId).filter(id => id !== null);
    const userIds = usersToDelete.map(user => user.usuarioId);

    // Borrar mensajes de los usuarios
    if (messageIds.length > 0) {
        await db.delete(mensaje).where(mensaje.Id_mensaje.in(messageIds)).run();
    }

    // Borrar partidas de los usuarios
    if (gameIds.length > 0) {
        await db.delete(partida).where(partida.id.in(gameIds)).run();
    }

    // Borrar usuarios
    if (userIds.length > 0) {
        await db.delete(usuario).where(usuario.id.in(userIds)).run();
    }

    console.log('Usuarios inactivos borrados: ' + userIds.length);
    console.log('Mensajes borrados: ' + messageIds.length);
    console.log('Partidas borradas: ' + gameIds.length);
    console.log('FIN DEL BORRADO');
});


// -----------------------------------------------------------------------------------------------
// Función que se ejecuta cada vez que un nuevo cliente se conecta al servidor
// (manejo de conexiones y eventos)
// -----------------------------------------------------------------------------------------------
async function newConnection(socket) {
    // Nueva conexión vía webSocket
    console.log("Usuario conectado, id: " + socket.id)
    await authenticate(socket);

    // Aquí habrá que gestionar los posibles eventos/mensajes que nos pueden llegar del cliente
    console.log("Escuchando eventos...");

    // Envío de heartbeats de forma periódica (cada 5 segundos) por parte del servidor
    // para asegurar que los sockets de los clientes no se desconecten por inactividad
    // ------------------------------------------------------------------------------------------
    setInterval(() => {
        io.emit('ping', { message: 'Ping!' });
    }, 1000);

    socket.on('pong', (data) => {
        console.log('Pong recibido!' + data.message);
    });

    // ------------------------------------------------------------------------------------------

    socket.on('disconnect', () => {
        console.log("Usuario desconectado")
    });

    // Petición para recuperar toda la conversación entre los jugadores de una partida
    socket.on('fetch-msgs', async (data) => {
        await fetchMessages(data, socket);
    });

    socket.on('send-message', async (data) => {
        console.log("Nuevo mensaje recibido!" + JSON.stringify(data))
        await saveMessage(data, socket);
    });

    //peticion para salir de una partida
    socket.on('find-game', async (data) => {
        console.log("Recibido evento find-game...");
        await findGame(data, socket);
    });

    //peticion para salir de una partida
    socket.on('cancel-pairing', async (data) => {
        await cancelarBusquedaPartida(data, socket);
    });

    // peticion para hacer un movimiento en una partida
    socket.on('make-move', async (data) => {
        await manejarMovimiento(data, socket);
    });

    // peticion para rendirse en una partida
    socket.on('resign', async (data) => {
        await manejarRendicion(data, socket);
    });

    // peticion para ofrecer tablas al oponente durante una partida
    socket.on('draw-offer', async (data) => {
        await ofertaDeTablas(data, socket);
    });

    socket.on('draw-accept', async (data) => {
        console.log("Se ha aceptado la oferta de tablas")
        await aceptarTablas(data, socket);
    });

    socket.on('draw-declined', async (data) => {
        console.log("Se ha rechazado la oferta de tablas")
        await rechazarTablas(data, socket);
    });

    //AMIGOS

    socket.on('add-friend', async (data) => {
        console.log("Recibido evento add-friend...");
        //imprimimos el data para ver que todo esta bien
        console.log("data de evento add-friend: ", data);
        await addFriend(data, socket);
    });

    socket.on('accept-request', async (data) => {
        console.log("Recibido evento friendRequestAccepted...");
        await acceptFriendRequest(data, socket);
    });

    socket.on('reject-request', async (data) => {
        console.log("Recibido evento friendRequestRejected...");
        await rejectFriendRequest(data, socket);
    });

    socket.on('remove-friend', async (data) => {
        console.log("Recibido evento remove-friend...");
        await removeFriend(data, socket);
    });

    socket.on('challenge-friend', async (data) => {
        console.log("Recibido evento challenge-friend...");
        await challengeFriend(data, socket);
    });

    socket.on('accept-challenge', async (data) => {
        console.log("Recibido evento accept-challenge...");
        await createDuelGame(data, socket);
    });

    socket.on('reject-challenge', async (data) => {
        console.log("Recibido evento reject-challenge...");
        await deleteChallenge(data, socket);
    });

}
// -----------------------------------------------------------------------------------------------
// Escuchar eventos de conexión al servidor
io.on('connection', newConnection);

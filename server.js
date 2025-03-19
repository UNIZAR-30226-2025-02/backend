import './dotenv-config.js';
import { Server } from 'socket.io';
import http from 'http';
import { app } from './app.js'
import { saveMessage, fetchMessages, deleteMessage } from './chat/controller/chat.js';
import { findGame, manejarMovimiento } from './rooms/rooms.js';

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

const PORT = app.get('port')
export let activeSockets = {};
export let midGameExits = {};
server.listen(PORT, () => {
    console.log(`Servidor corriendo en la direccion http://localhost:${PORT}`);
});

function newConnection(socket) {
    // Nueva conexión vía webSocket
    console.log("Usuario conectado")

    socket.on('new-connection', async (data) => {
        console.log("Nueva conexión: " + JSON.stringify(data))
        userId = data.userId;
        socket = data.socket;
        inGame = data.inGame;

        activeSockets[userId] = socket;
        if (inGame) {
            gameId = midGameExits[userId];
            delete midGameExits[userId];
            restoreGame(gameId, userId);
        }
    });

    socket.on('mid-game-exit', async (data) => {
        console.log("Salida de partida en curso: " + JSON.stringify(data))
        userId = data.userId;
        gameId = data.gameId;

        midGameExits[userId] = gameId;
    });

    // Aquí habrá que gestionar los posibles eventos/mensajes que nos pueden llegar del cliente
    // (move, searchGame, etc.)
    socket.on('disconnect', () => {
        // Eliminar socket de la lista de sockets activos
        delete activeSockets[userId];
        console.log("Usuario desconectado")
    })

    // Envío de mensaje por parte de uno de los jugadores (y notificación al resto)
    socket.on('send-message', async (data) => {
        await saveMessage(data);
    });

    // Eliminación de mensaje por parte de uno de los jugadores (y notificación al resto)
    socket.on('delete-message', async (data) => {
        await deleteMessage(data);
    });

    // Petición para recuperar toda la conversación entre los jugadores de una partida
    socket.on('fetch-msgs', async (data) => {
        const messages = await fetchMessages(data);
        //socket.emit('chat-history', messages);
        console.log(messages)
    });

    socket.on('new-message', async (data) => {
        console.log("Nuevo mensaje recibido!" + JSON.stringify(data))
    });

    socket.on('message-deleted', async (data) => {
        console.log("Mensaje eliminado!" + JSON.stringify(data))
    });

    /*
    //peticion para crear una nueva partida
    socket.on('create-game', async (data) => {

        await createNewGame(data);
        console.log("Nueva partida creada!" + JSON.stringify(data))
        
    });

    //peticion para unirse a una partida
    socket.on('join-game', async (data) => {

        await joinGame(data, socket);
        console.log("Unido a partida!" + JSON.stringify(data))
    });
    */

    //peticion para salir de una partida
    socket.on('find-game', async (data) => {
        await findGame(data, socket);
        console.log("Salida de partida!" + JSON.stringify(data))
    });

    //peticion para salir de una partida
    socket.on('leave-game', async (data) => {
        console.log("Salida de partida!" + JSON.stringify(data))
    });

    socket.on('make-move', async (data) => {
        await manejarMovimiento(data, socket);
        // console.log("Movimiento Realizado: " + JSON.stringify(data.movimiento))
    });

    //socket.on('see-pending-pairings', async (data) => {
    //    await emparejamiento(data, socket);
    //});
}

io.on('connection', newConnection);
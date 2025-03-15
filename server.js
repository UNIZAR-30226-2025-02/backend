import './dotenv-config.js';
import { Server } from 'socket.io';
import http from 'http';
import { app } from './app.js'
import { saveMessage, fetchMessages, deleteMessage } from './chat/controller/chat.js';
import { findGame, manejarMovimiento, leaveRoom, surrenderGame, requestTie } from './rooms/rooms.js';
import { addFriend, removeFriend, challengeFriend, createDuelGame } from './friendship/friends.js';

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

server.listen(PORT, () => {
    console.log(`Servidor corriendo en la direccion http://localhost:${PORT}`);
});

function newConnection(socket) {
    // Nueva conexión vía webSocket
    console.log("Usuario conectado")

    // Aquí habrá que gestionar los posibles eventos/mensajes que nos pueden llegar del cliente
    // (move, searchGame, etc.)
    socket.on('disconnect', () => {
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
        console.log("Movimiento Realizado: " + JSON.stringify(data.movimiento))
    });

    socket.on('leave-room', async (data) => {
        
        await leaveRoom(data, socket);
        console.log(`Jugador ${data.idJugador} intenta abandonar la sala ${data.idPartida}`);
        
    });

    // Evento para rendirse
    socket.on('surrender', async (data) => {
        
        await surrenderGame(data, socket);
        console.log(`Jugador ${data.idJugador} se rinde en la partida ${data.idPartida}`);
    });

// Evento para solicitar tablas
    socket.on('request-tie', async (data) => {

        await requestTie(data, socket);
        console.log(`Jugador ${data.idJugador} solicita tablas en la partida ${data.idPartida}`);
    });

    //socket.on('see-pending-pairings', async (data) => {
    //    await emparejamiento(data, socket);
    //});

    //---------------AMISTAD-------------------
    socket.on('add-friend', async (data) => {
        await addFriend(data, socket);
        console.log("Amigo añadido!" + JSON.stringify(data))
    });

    socket.on('remove-friend', async (data) => {
        await removeFriend(data, socket);
        console.log("Amigo eliminado!" + JSON.stringify(data))
    });

    socket.on('challenge-friend', async (data) => {
        //Data para el reto: 
        //idRetador: id del jugador que reta
        //idRetado: id del jugador que recibe el reto
        //modo
        const result = await challengeFriend(data, socket);
        
        // Enviar la notificación al retado
        io.to(data.idRetado).emit('new-challenge', {
            retador: data.idRetador,
            modo: data.modo
        });

    });

    socket.on('accept-challenge', async (data) => {
        const result = await createDuelGame(data, socket);
        
        // Notificar a ambos jugadores
        io.to(data.idRetador).emit('challenge-accepted', { gameId: result.gameId });
        io.to(data.idRetado).emit('challenge-accepted', { gameId: result.gameId });

    });

    socket.on('reject-challenge', async (data) => {
        io.to(data.idRetador).emit('challenge-rejected', { retado: data.idRetado });
        //Funcion para borrar un reto
        //await deleteChallenge(data, socket);

    });
}

io.on('connection', newConnection);
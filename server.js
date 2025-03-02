import { Server } from 'socket.io';
import http from 'http';
import { app } from './app.js'
import { saveMessage, fetchMessages, deleteMessage } from './chat/controller/chat.js';

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

function newConnection (socket) {
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
}

io.on('connection', newConnection);
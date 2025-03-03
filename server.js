import { Server } from 'socket.io';
import http from 'http';
import { app } from './app.js'
import { handleChatEvents } from './chat/handler/chatHandlers.js';

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
    handleChatEvents(io, socket);
   
}

io.on('connection', newConnection);
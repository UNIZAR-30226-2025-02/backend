import dotenv from './dotenvconfig.js'
import { Server } from 'socket.io';
import http from 'http';
import { app } from './app.js'
import { db } from './db/db.js';
import { mensaje } from './db/schemas/mensaje.js';

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

    // Nuevo mensaje recibido por el chat
    socket.on('chat-msg', (msg) => {
        console.log("Mensaje recibido de " + msg.user_id + ": " + msg.message + " en partida: " + 
                    + msg.game_id)
        async function saveMessage(msg) {
            try {
                await db.insert(mensaje).values({
                    Id_partida: msg.game_id,
                    Id_usuario: msg.user_id,
                    Mensaje:    msg.message
                });
                console.log("Mensaje almacenado en la base de datos");
            } catch (error) {
                console.error("Error al almacenar el mensaje en la base de datos:", error);
            }
        }
        saveMessage(msg); 
    })
}

io.on('connection', newConnection);
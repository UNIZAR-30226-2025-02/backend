import './dotenv-config.js';
import { Server } from 'socket.io';
import http from 'http';
import { app } from './app.js';
import { authenticate } from './login/login.js';
import { saveMessage, fetchMessages } from './chat/chat.js';
import { findGame, manejarMovimiento, cancelarBusquedaPartida,
        manejarRendicion, ofertaDeTablas, aceptarTablas, rechazarTablas
} from './rooms/rooms.js';

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
}
// -----------------------------------------------------------------------------------------------
// Escuchar eventos de conexión al servidor
io.on('connection', newConnection);

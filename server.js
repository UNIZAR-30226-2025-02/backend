import './dotenv-config.js';
import { Server } from 'socket.io';
import http from 'http';
import { app } from './app.js'
import { saveMessage, fetchMessages, deleteMessage } from './chat/controller/chat.js';
import { findGame, manejarMovimiento } from './rooms/rooms.js';

// Objeto que almacenará los sockets con los usuarios conectados al servidor
let activeSockets = {};

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

// Función para autenticar un socket, comprobando que el token JWT es válido para ese usuario
// (este token se envía al cliente cuando el login ha sido exitoso)
// -----------------------------------------------------------------------------------------------
async function authenticate(socket) {
    console.log("Autenticando usuario... con socket: " + socket.id);
    try {
        // Extraer el token de las query params (ej: io('http://localhost:3000?token=abc123'))
        const token = socket.handshake.query.token;
        if (!token) {
            console.error('No se ha proporcionado un token de autenticación, enviando desconexión...');
            socket.disconnect();
            return;
        }

        // Verificar y decodificar el token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;

        // Si ya existe un socket activo para este usuario (sesión activa), lo desconectamos
        // (solo permitimos una sesión por usuario)
        if (activeSockets.has(userId)) {
            console.log(`Usuario ${userId} ya tiene una sesión activa, desconectando socket anterior...`);
            const oldSocket = activeSockets.get(userId);
            oldSocket.emit('force-logout', { message: 'Se ha iniciado sesión en otro dispositivo.' });

            // Se supone que lo desconectarán ellos, aquí nos aseguramos de que se desconecte
            // tras 5 segundos si no lo hacen
            setTimeout(() => {
                if (oldSocket.connected) {
                    console.log(`Desconectando socket antiguo de usuario ${userId} después del timeout.`);
                    oldSocket.disconnect();
                }
            }, 5000);
            }
                    // Almacenar el nuevo socket
        activeSockets.set(userId, socket);
        console.log(`Usuario ${userId} autenticado con socket ${socket.id}`);

    } catch (error) {
        console.error('Error al autenticar el socket:', error.message);
        socket.disconnect();
    }
}
// -----------------------------------------------------------------------------------------------

// Función que se ejecuta cada vez que un nuevo cliente se conecta al servidor
// (manejo de conexiones y eventos)
// -----------------------------------------------------------------------------------------------
function newConnection(socket) {
    // Nueva conexión vía webSocket
    console.log("Usuario conectado, id: " + socket.id)
    authenticate(socket);

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

    //peticion para salir de una partida
    socket.on('find-game', async (data) => {
        await findGame(data, socket);
        // console.log("Salida de partida!" + JSON.stringify(data))
    });

    //peticion para salir de una partida
    socket.on('leave-game', async (data) => {
        // console.log("Salida de partida!" + JSON.stringify(data))
    });

    socket.on('make-move', async (data) => {
        await manejarMovimiento(data, socket);
        // console.log("Movimiento Realizado: " + JSON.stringify(data.movimiento))
    });
}
// -----------------------------------------------------------------------------------------------
// Escuchar eventos de conexión al servidor
io.on('connection', newConnection);
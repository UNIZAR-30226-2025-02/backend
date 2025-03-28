import './dotenv-config.js';
import { Server } from 'socket.io';
import http from 'http';
import { app } from './app.js'
import { saveMessage, fetchMessages } from './chat/controller/chat.js';
import { findGame, manejarMovimiento, buscarPartidaActiva, cancelarBusquedaPartida,
         manejarRendicion, ofertaDeTablas, 
         aceptarTablas, rechazarTablas} from './rooms/rooms.js';
import { addFriend, removeFriend, challengeFriend, createDuelGame, acceptFriendRequest,
            rejectFriendRequest} from './friendship/friends.js';
import jwt from 'jsonwebtoken';

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

// Función para autenticar un socket, comprobando que el token JWT es válido para ese usuario
// (este token se envía al cliente cuando el login ha sido exitoso)
// -----------------------------------------------------------------------------------------------
async function authenticate(socket) {
    console.log("Autenticando usuario... con socket: " + socket.id);
    try {
        // Extraer el token de las query params (ej: io('http://localhost:3000?token=abc123'))
        const token = socket.handshake.query.token;

        // Si no se ha proporcionado un token, desconectar el socket
        if (!token) {
            console.error('No se ha proporcionado un token de autenticación, enviando desconexión...');
            socket.disconnect();
            return;
        }

        // Verificar y decodificar el token
        const decoded = jwt.decode(token);
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        console.log("Token verificado, el id del usuario es: " + JSON.stringify(verified.userId));

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

        console.log("Buscando si el usuario tiene una partida activa...")

        await buscarPartidaActiva(userId, socket);

    } catch (error) {
        console.error('Error al autenticar el socket:', error.message);
        socket.disconnect();
    }
}
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
    setTimeout(() => {
        io.emit('ping', { message: 'Ping!' });
    }, 5000);
    
    socket.on('pong', () => {
        console.log('Pong recibido!');
    });

    // ------------------------------------------------------------------------------------------
    
    socket.on('disconnect', () => {
        console.log("Usuario desconectado")
    })

    // Envío de mensaje por parte de uno de los jugadores (y notificación al resto)
    socket.on('send-message', async (data) => {
        await saveMessage(data);
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

    socket.on('create-duel-game', async (data) => {
        console.log("Recibido evento create-duel-game...");
        await createDuelGame(data, socket);
    });

}
// -----------------------------------------------------------------------------------------------
// Escuchar eventos de conexión al servidor
io.on('connection', newConnection);
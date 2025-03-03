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

//const io = new socketServer(server);
app.use(logger('dev'));

// Ruta de prueba
app.get("/", (req, res) => {
    res.send("Servidor de Ajedrez en Línea Activo!");
});

const PORT = app.get('port') ?? 3000;




/* ------------------ Gestión de Login ------------------ */
app.post('/login', (req, res) => {
    console.log(req.body);
    res.send('Login');
});
app.post('/register', (req, res) => { });
app.post('/logout', (req, res) => { });
app.post('/protected', (req, res) => { });


/*
await db.insert(usuario).values({
    FotoPerfil: 'none',
    NombreUser: 'abababa',
    NombreCompleto: 'Jorge',
    Apellidos: 'Ruiz Gonzalez',
    Correo: 'abaabba@prueba.mail',
    Contrasena: '1234'
});
*/



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
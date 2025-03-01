import dotenv from './dotenvconfig.js'
import { Server as socketServer } from 'socket.io';
import http from 'http';
import { app } from './app.js'
// import { db } from './db/db.js'
// import { usuario } from './db/schemas/usuario.js'

// Crear el servidor manualmente para poder utilizar WebSockets
const server = http.createServer(app);
const io = new socketServer(server);

// Ruta de prueba
app.get("/", (req, res) => {
    res.send("Servidor de Ajedrez en Línea Activo!");
});

const PORT = app.get('port')

app.listen(PORT, () => {
    console.log(`Servidor corriendo en la direccion http://localhost:${PORT}`);
});
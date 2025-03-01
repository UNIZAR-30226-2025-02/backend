import dotenv from './dotenvconfig.js'
import { Server as socketServer } from 'socket.io';
import http from 'http';
import { app } from './app.js'
// import { db } from './db/db.js'
// import { usuario } from './db/schemas/usuario.js'

// Crear el servidor manualmente para poder utilizar WebSockets
const server = http.createServer(app);
const io = new socketServer(server);
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



app.listen(PORT, () => {
    console.log(`Servidor corriendo en la direccion http://localhost:${PORT}`);
});

// PRIMERAS PRUEEBAS DEL SERVIDOR CON NODEJS Y EXPRESS

//******PRIMERAS LINEAS DEL SERVIDOR  *********/
const express = require('express');
const cors = require('cors');

const socket = require('socket.io');
const http = require('http');
const {Chess} = require('chess.js');

require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Crea el servidor manualmente para poder utilizar WebSockets
const server = http.createServer(app);
const io = socket(server);

// Ruta de prueba
app.get("/", (req, res) => {
    res.send("Servidor de Ajedrez en Línea Activo!");
});

//PONER VARIABLES DE ENTORNO EN .ENV DEL DIRECTORIO RAIZ DEL PROYECTO

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

// WebSockets para comprobar conexiones de usuarios
io.on('connection', (socket) => {
    console.log('Nuevo cliente conectado');

    socket.on('disconnect', () => {
        console.log('Cliente desconectado');
    });
});

//*******IMPLEMENTACION LOGICA DE JUEGO DEL AJEDREZ *************/

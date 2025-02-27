import dotenv from './config.js';
import express from 'express';
import cors from 'cors';
import { Server as socketServer } from 'socket.io';
import http from 'http';
import { createClient } from '@libsql/client';
import fs from 'fs/promises';
import { Chess } from 'chess.js';
import { db } from './db/db.js'; // Conexión con la base de datos
import { usuario } from './db/schemas/usuario.js';

const app = express();
app.use(cors());
app.use(express.json());

// Crear el servidor manualmente para poder utilizar WebSockets
const server = http.createServer(app);
const io = new socketServer(server);

/*await db.insert(usuario).values({
    FotoPerfil: 'none',
    NombreUser: 'jorge21',
    NombreCompleto: 'Jorge',
    Apellidos: 'Ruiz Gonzalez',
    Correo: 'jorge21@prueba.mail',
    Contrasena: '1234'
});*/

// Ruta de prueba
app.get("/", (req, res) => {
    res.send("Servidor de Ajedrez en Línea Activo!");
});

//PONER VARIABLES DE ENTORNO EN .ENV DEL DIRECTORIO RAIZ DEL PROYECTO
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor corriendo en la direccion http://localhost:${PORT}`);
});

//*******IMPLEMENTACION LOGICA DE JUEGO DEL AJEDREZ *************/

// Inicializa el juego de ajedrez
const chess = new Chess();

// Creación de un endpoint para que los jugadores puedan recibir el estado del juego
app.get('/game', (req, res) => {
    res.json({ board: chess.board() }); // Devuelve el tablero de juego
});

// Endpoint para realizar un movimiento
app.post('/move', (req, res) => {
    const { from, to } = req.body;
    const move = chess.move({ from, to });

    if (move) {
        res.json({ board: chess.board() });
    } else {
        res.status(400).json({ error: 'Movimiento inválido' });
    }
});

//********* LOGICA PARA GESTIONAR LAS PARTIDAS ************/
// Objeto para almacenar las partidas activas
const games = {};

io.on('connection', (socket) => {
    console.log('Nuevo cliente conectado');

    // Crear una nueva partida
    socket.on('createGame', () => {
        const gameId = generateRandomId();
        games[gameId] = new Chess();
        socket.join(gameId);
        socket.emit('gameCreated', gameId);
    });

    // Unirse a una partida existente
    socket.on('joinGame', (gameId) => {
        if (games[gameId]) {
            socket.join(gameId);
            socket.emit('gameJoined', games[gameId].board());
        } else {
            socket.emit('error', 'Juego no encontrado');
        }
    });

    // Realizar un movimiento
    socket.on('move', (data) => {
        const { gameId, from, to } = data;
        const game = games[gameId];
        const move = game.move({ from, to });

        if (move) {
            // Comprobar si el juego ha terminado por jaque mate
            if (game.in_checkmate()) {
                game.game_over();
                io.to(gameId).emit("checkmate", "Jaque mate");
            }
            // Comprobar si el juego ha terminado por empate o por otras reglas
            else if (game.game_over()) {
                io.to(gameId).emit("gameOver", "Juego terminado");
            } else {
                io.to(gameId).emit('moveMade', game.board());
            }

        } else {
            socket.emit('error', 'Movimiento inválido');
        }
    });

    // Cuando un jugador se desconecta
    socket.on('disconnect', () => {
        console.log('Cliente desconectado');
    });
});

// Función para generar un ID aleatorio para las partidas
const generateRandomId = () => {
    return Math.random().toString(36).substring(2, 9);
};
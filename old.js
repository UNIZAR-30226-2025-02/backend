import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import socket from 'socket.io';
import http from 'http';
import { createClient } from '@libsql/client';
import fs from 'fs/promises';
import { Chess } from 'chess.js';

import { db } from './db/db.js'; // Conexión con la base de datos

// Cargar variables de entorno
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
    console.log(`Servidor corriendo en la direccion http://localhost:${PORT}`);
});



//*******IMPLEMENTACION LOGICA DE JUEGO DEL AJEDREZ *************/

// Inicializa el juego de ajedrez
const chess = new Chess();

//Creacion de un endpoint para qie los jugadores puedan recibir el estado del juego
app.get('/game', (req, res) => {
    res.json({ board: chess.board() }); //devuelve el tablero de juego
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

//WEBSOCKETS PARA JUGAR EN TIEMPO REAL
// WebSockets para comprobar conexiones de usuarios


/*
//BOCETO
io.on('connection', (socket) => {
    console.log('Nuevo cliente conectado');
   
    // Unirse a una sala
    socket.on("join", (room) => {
        socket.join(room);
        console.log(`Cliente se unió a la sala: ${room}`);
    });

    //Cuando un jugador hace un movimiento lo envia a la sala
    socket.on('move', (data) => {
        socket.to(data.room).emit('move', data.move);
        if (result === null) {
            socket.emit("invalidMove", "Movimiento inválido");
        } else {
            io.to(gameId).emit("moveMade", result, game.board());
        }
    });

    socket.on('disconnect', () => {
        console.log('Cliente desconectado');
    });
});
*/


//logica para gestionar las partidas
const games = {};
io.on('connection', (socket) => {
    console.log('Nuevo cliente conectado');

    socket.on('createGame', () => {
        const gameId = Math.random().toString(36).substring(2, 9);
        games[gameId] = new Chess();
        socket.join(gameId);
        socket.emit('gameCreated', gameId);
    });

    //Unirse a una sala
    socket.on('joinGame', (gameId) => {
        if (games[gameId]) {
            socket.join(gameId);
            socket.emit('gameJoined', games[gameId].board());
        } else {
            socket.emit('error', 'Juego no encontrado');
        }
    });

    //Cuando un jugador hace un movimiento lo envia a la sala
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
            // Comprobar si el juego ha terminado por alguna posible cosa
            else if (game.game_over()) {
                io.to(gameId).emit("gameOver", "Juego terminado");
            //Si no ha terminado se envia el nuevo estado del juego
            }else {
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


//generar un id aleatorio para las partidas
const generateRandomId = () => {
    return Math.random().toString(36).substring(2, 9);
}
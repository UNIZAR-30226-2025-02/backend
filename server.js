
// PRIMERAS PRUEEBAS DEL SERVIDOR CON NODEJS Y EXPRESS

//******PRIMERAS LINEAS DEL SERVIDOR  *********/

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const socket = require('socket.io');
const http = require('http');
const client = require('@libsql/client');
const fs = require('fs').promises;
const {Chess} = require('chess.js');

require('dotenv').config();

const app = express();
const db = client.createClient({
    url: process.env.DATABASE_URL,
    authToken: process.env.DATABASE_AUTH_TOKEN
});

app.use(cors());
app.use(express.json());

// Crea el servidor manualmente para poder utilizar WebSockets
const server = http.createServer(app);
const io = socket(server);

async function createDatabaseTables() {
    try {
      const sql = await fs.readFile('create_tables.sql', 'utf8');
      console.log(sql);
      const result = await db.execute(sql);	
      console.log(result);
    } catch (err) {
      console.error(err);
    }
}
  
createDatabaseTables();

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
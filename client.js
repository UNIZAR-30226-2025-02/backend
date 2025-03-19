import { io } from 'socket.io-client';
import { Chess } from 'chess.js';

// Configuración del servidor
// const BASE_URL = 'https://checkmatex-gkfda9h5bfb0gsed.spaincentral-01.azurewebsites.net';
const BASE_URL = 'http://localhost:3000';
const chess = new Chess();
// ID del usuario (pasa este valor como argumento o variable global)
const userId = process.argv[2];  // Leer el ID del usuario del segundo argumento al ejecutar el script
const mode = 'Punt_3';                                  // Modo de juego 
let gameId = '';                                      // Se actualizará una vez emparejado
let color = '';                                       // Se actualizará una vez emparejado
// Función para hacer movimientos aleatorios en la partida
async function realizarMovimientos(socket, color, gameId) {
    console.log('Realizando movimientos...');
    socket.on('new-move', (data) => {
        chess.move(data.movimiento);
        const moves = chess.moves();
        if (moves.length > 0) {
            const randomMove = moves[Math.floor(Math.random() * moves.length)];
            chess.move(randomMove);
            socket.emit('make-move', { movimiento: randomMove, idPartida: gameId, idJugador: userId });
            console.log('Movimiento realizado:', randomMove);
        }
    });

    // Si voy con blancas, hacer el primer movimiento
    console.log('Color:', color);
    if (color === 'white') {
        console.log('Soy blancas, haciendo el primer movimiento...');
        const moves = chess.moves();
        const randomMove = moves[Math.floor(Math.random() * moves.length)];
        chess.move(randomMove);
        socket.emit('make-move', { movimiento: randomMove, idPartida: gameId, idJugador: userId });
        console.log('Movimiento realizado:', randomMove);
    }
}

// Función para conectar con el servidor y buscar una partida utilizando socket.io
function buscarPartida() {
    const socket = io(BASE_URL, {
        auth: {
            userId: userId
        }
    });

    socket.on('connect', () => {
        console.log('Conectado al servidor de sockets');
        socket.emit('find-game', { idJugador: userId , mode: mode});
    });

    socket.on('game-ready', (data) => {
        console.log('Partida encontrada:', data.idPartida);
        gameId = data.idPartida;
        console.log('Id de la partida:', gameId);
        console.log('Listo para jugar!');

        // Esperar 5 segundos para que el valor de las variables sea correcto
        setTimeout(() => {
            realizarMovimientos(socket, color, gameId);
        }, 5000);
    });

    socket.on('color', (data) => {
        const jugador = data.jugadores.find(jugador => jugador.id === userId);
        if (!jugador) {
            console.error('No se ha encontrado el jugador');
            return;
        }
        color = jugador ? jugador.color : null;
        console.log('Color asignado:', color);
    });

    socket.on('gameOver', (gameData) => {
        console.log('Partida finalizada:', gameData);
        socket.disconnect();
    });

    socket.on('errorMessage', (error) => {
        console.error('Se ha producido un error: ', error);
        // socket.disconnect();
    });
}

// Ejecutar la función de búsqueda de partida
buscarPartida();

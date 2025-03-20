import { io } from 'socket.io-client';
import { Chess } from 'chess.js';
import axios from 'axios';

// Configuración del servidor
// const BASE_URL = 'https://checkmatex-gkfda9h5bfb0gsed.spaincentral-01.azurewebsites.net';
const BASE_URL = 'http://localhost:3000';
const loginUrl = 'http://localhost:3000/login';
let chess = new Chess();
// ID del usuario (pasa este valor como argumento o variable global)

const user = process.argv[2]; 
const password = process.argv[3];
let userId = '';                                        // Se actualizará una vez logueado
const mode = 'Punt_3';                                  // Modo de juego 
let gameId = '';                                        // Se actualizará una vez emparejado
let color = '';                                         // Se actualizará una vez emparejado

async function clientLogin(user, password) {
    try {
        // Realiza la petición POST para hacer login
        console.log('Loggeando...');
        const response = await axios.post(loginUrl, {
            NombreUser: user,
            Contrasena: password,
        });

        console.log('Loggeado...');

        // Obtiene el ID del usuario de la respuesta
        userId = response.data.publicUser.id;

        console.log('Login exitoso. ID de usuario:', userId);
        // Obtiene el token de la respuesta
        const token = response.data.accessToken;

        console.log('Login exitoso. Token recibido:', token);

        // Conectar al servidor WebSocket usando el token
        const socket = io(BASE_URL, {
            query: { token: token }  // Enviar el token a través del query en la conexión
        });

        buscarPartida(socket);

    } catch (error) {
        console.error('Error al hacer login o conectar al WebSocket:', error.message);
    }
}

// Función para hacer movimientos aleatorios en la partida
async function realizarMovimientos(socket, color, gameId) {
    console.log('Realizando movimientos...');
    socket.on('new-move', (data) => {
        chess.move(data.movimiento);
        const moves = chess.moves();
        if (moves.length > 0) {
            const randomMove = moves[Math.floor(Math.random() * moves.length)];
            chess.move(randomMove);
            setTimeout(() => {
                socket.emit('make-move', { movimiento: randomMove, idPartida: gameId, idJugador: userId });
            }, 50);
            console.log('Movimiento realizado:', randomMove);
        }
    });

    // Si voy con blancas, hacer el primer movimiento
    console.log('Color:', color);
    const turno = chess.turn();

    if ((color === 'white' && turno === 'w') || (color === 'black' && turno === 'b')) {
        const moves = chess.moves();
        if (moves.length > 0) {
            const randomMove = moves[Math.floor(Math.random() * moves.length)];
            chess.move(randomMove);
            socket.emit('make-move', { movimiento: randomMove, idPartida: gameId, idJugador: userId });
            console.log('Movimiento realizado:', randomMove);
        } else {
            console.log('No hay movimientos posibles.');
        }
    }
}

// Función para conectar con el servidor y buscar una partida utilizando socket.io
function buscarPartida(socket) {
    // Cuando el socket se conecte correctamente
    let estabaEnPartida = false;

    socket.on('connect', () => {
        console.log('Conexión WebSocket establecida.');
        console.log('Buscando partida con ID de usuario:', userId, 'y modo:', mode);
        setTimeout(() => {
            if (!estabaEnPartida) {
                socket.emit('find-game', { idJugador: userId, mode: mode });
            } else {
                console.log('Estaba en partida, no se busca nueva partida');
                realizarMovimientos(socket, color, gameId);
            }
        }, 1000);
    });

    socket.on('pong', () => {
        console.log('Pong recibido!');
    });

    socket.on('disconnect', () => {
        console.log('Desconectado del servidor WebSocket');
    });


    socket.on('game-ready', (data) => {
        console.log('Partida encontrada:', data.idPartida);
        gameId = data.idPartida;
        console.log('Id de la partida:', gameId);
        console.log('Listo para jugar!');
    });

    socket.on('color', (data) => {
        const jugador = data.jugadores.find(jugador => jugador.id === userId);
        if (!jugador) {
            console.error('No se ha encontrado el jugador');
            return;
        }
        color = jugador ? jugador.color : null;
        console.log('Color asignado:', color);

        // Esperar 5 segundos para que el valor de las variables sea correcto
        setTimeout(() => {
            realizarMovimientos(socket, color, gameId);
        }, 1000);
    });

    socket.on('force-logout', (data) => {
        console.log('Forzar logout:', data.message);
        socket.disconnect();
    });

    socket.on('existing-game', (data) => {
        const pgn = data.pgn;

        // Actualizar color e id de la partida al recuperar una partida en curso, y recuperar
        // el estado del tablero
        color = data.color;
        gameId = data.gameID;

        chess = new Chess();
        const isValid = chess.loadPgn(pgn);
        if (isValid === false) {
            console.error('Error al cargar el PGN:', pgn);
        }

        console.log('Partida en curso recuperadaaaaaaa!!!!!!! :', pgn);
        estabaEnPartida = true;
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

// Ejecutar la función de login y luego buscar partida
async function main() {
    await clientLogin(user, password);  // Esperar a que el login se complete
}

main();  // Ejecutar el programa principal
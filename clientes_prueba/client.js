import { io } from 'socket.io-client';
import { Chess } from 'chess.js';
import axios from 'axios';
import { index } from 'drizzle-orm/gel-core';

// Configuración del servidor
// const BASE_URL = 'https://checkmatex-gkfda9h5bfb0gsed.spaincentral-01.azurewebsites.net';
const BASE_URL = 'http://localhost:3000';
const loginUrl = `${BASE_URL}/login`;
let chess = new Chess();
// ID del usuario (pasa este valor como argumento o variable global)

const user = process.argv[2];
const password = process.argv[3];
// Tercer argumento opcional para saber si hacer movimientos aleatorios o no
const randomMoves = process.argv[4] === 'rand' ? true : false; // Si es true, se hacen movimientos aleatorios
console.log('Random moves:', randomMoves);
let userId = '';                                        // Se actualizará una vez logueado
const mode = 'Punt_3';                                  // Modo de juego 
let gameId = '';                                        // Se actualizará una vez emparejado
let color = '';                                         // Se actualizará una vez emparejado

let stopMoving = false;                               // Variable para detener los movimientos aleatorios

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
async function realizarMovimientosRandom(socket, color, gameId) {
    console.log('Realizando movimientos aleatorios...');
    socket.on('new-move', (data) => {
        chess.move(data.movimiento);
        const moves = chess.moves();
        console.log('Movimientos posibles:', moves);
        if (moves.length > 0 && !stopMoving) {
            const randomMove = moves[Math.floor(Math.random() * moves.length)];
            console.log(chess.history());
            chess.move(randomMove);
            setTimeout(() => {
                socket.emit('make-move', { movimiento: randomMove, idPartida: gameId, idJugador: userId });
            }, 3000);
            console.log('Movimiento realizado:', randomMove);
        }
    });

    // Si voy con blancas, hacer el primer movimiento
    console.log('Color:', color);
    const turno = chess.turn();

    if ((color === 'white' && turno === 'w') || (color === 'black' && turno === 'b')) {
        const moves = chess.moves();
        console.log('Movimientos posibles:', moves);
        if (moves.length > 0) {
            const randomMove = moves[Math.floor(Math.random() * moves.length)];
            chess.move(randomMove);
            setTimeout(() => {
                socket.emit('make-move', { movimiento: randomMove, idPartida: gameId, idJugador: userId });
            }, 3000);
            console.log('Movimiento realizado:', randomMove);
        } else {
            console.log('No hay movimientos posibles.');
        }
    }

    setInterval(() => {
        socket.emit('send-message', { message: 'Soy el jugador: ' + userId + '.', game_id: gameId, user_id: userId });
    }, 5000);
}


const movimientosBlancas = [
    "e4", "Nf3", "Bc4", "O-O", "d4", "e5", "exf6", "fxg7", "Re1+", "Ng5",
    "Nxe6", "Qh5+", "Qxc5", "Qxc4", "Re2", "Kxg2", "Kf1"
];
const movimientosNegras = [
    "e5", "Nc6", "Bc5", "Nf6", "exd4", "d5", "dxc4", "Rg8", "Be6", "Qf6",
    "fxe6", "Kd7", "Rxg7", "Rf8", "Rxg2+", "Qf3+", "Qh1#"
];

let ind = 0; // Índice para el movimiento actual

// Función para hacer movimientos aleatorios en la partida
async function realizarMovimientos(socket, color, gameId) {
    console.log('Realizando movimientos...');
    socket.on('new-move', (data) => {
        chess.move(data.movimiento);
        const moves = chess.moves();
        console.log('Movimientos posibles:', moves);
        if (moves.length > 0 && !stopMoving) {
            const movimiento = color === 'white' ? movimientosBlancas[ind] : movimientosNegras[ind];
            ind = (ind + 1);
            console.log(chess.history());
            chess.move(movimiento);
            setTimeout(() => {
                socket.emit('make-move', { movimiento: movimiento, idPartida: gameId, idJugador: userId });
            }, 700);
            console.log('Movimiento realizado:', movimiento);
        }
    });

    // Si voy con blancas, hacer el primer movimiento
    console.log('Color:', color);
    const turno = chess.turn();

    if ((color === 'white' && turno === 'w') || (color === 'black' && turno === 'b')) {
        const moves = chess.moves();
        if (moves.length > 0) {
            const movimiento = color === 'white' ? movimientosBlancas[ind] : movimientosNegras[ind];
            ind = (ind + 1);
            console.log(chess.history());
            chess.move(movimiento);
            setTimeout(() => {
                socket.emit('make-move', { movimiento: movimiento, idPartida: gameId, idJugador: userId });
            }, 700);
            console.log('Movimiento realizado:', movimiento);
        } else {
            console.log('No hay movimientos posibles.');
        }
    }

    setInterval(() => {
        socket.emit('send-message', { message: 'Soy el jugador: ' + userId + '.', game_id: gameId, user_id: userId });
    }, 5000);
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
            if (randomMoves) {
                socket.once('requestTie', (data) => {
                    console.log('Se ha ofrecido un empate:', data);
                    socket.emit('draw-accept', { idPartida: gameId, idJugador: userId });
                });
                realizarMovimientosRandom(socket, color, gameId);
            }
            else {
                realizarMovimientos(socket, color, gameId);
            }
        }, 50);
    });

    socket.on('force-logout', (data) => {
        console.log('Forzar logout:', data.message);
        stopMoving = true;
        setTimeout(() => {
            socket.disconnect();
        }, 500);
        return;
    });

    socket.on('get-game-status', () => {
        console.log('Obteniendo estado de la partida...');
        // Genera un tiempo aleatorio entre 1 y 3 minutos (con segundos)
        const timeW = Math.floor(Math.random() * 120) + 60;
        const timeB = Math.floor(Math.random() * 120) + 60;

        console.log('Tiempo restante del blaco: ', timeW);
        console.log('Tiempo restante del negro: ', timeB);
        console.log('Estado de la partida:', 'ingame');
        console.log('Modo de la partida: ', mode);

        socket.emit('game-status', { timeLeftW: timeW, timeLeftB: timeB, estadoPartida: 'ingame', gameMode: mode });
    });

    socket.on('new-message', (data) => {
        console.log('Nuevo mensaje:', data.message);
        setTimeout(() => {
            socket.emit('send-message', { message: 'Respuesta al mensaje recibido. Soy: ' + userId + '.', game_id: gameId, user_id: userId });
        }, 5000);
    });

    socket.on('existing-game', (data) => {
        const timeLeftW = data.timeLeftW;
        const timeLeftB = data.timeLeftB;
        const pgn = data.pgn;
        const gameMode = data.gameMode;
        const miElo = data.miElo;
        const eloRival = data.eloRival;
        const nombreRival = data.nombreRival;

        color = data.color;
        gameId = data.gameID;

        // Cargar el PGN en el objeto Chess
        chess = new Chess();
        const isValid = chess.loadPgn(pgn);
        if (isValid === false) {
            console.error('Error al cargar el PGN:', pgn);
        }

        console.log('Partida en curso recuperada: ', pgn);
        console.log('Color:', color);
        console.log('ID de la partida:', gameId);
        console.log('Tiempo restante del blanco:', timeLeftW);
        console.log('Tiempo restante del negro:', timeLeftB);
        console.log('Modo: ', gameMode);
        console.log('Mi elo: ', miElo);
        console.log('Elo Rival: ', eloRival);
        console.log('Nombre rival: ', nombreRival);
        estabaEnPartida = true;

        socket.emit('fetch-msgs', { game_id: gameId });

        console.log('Estaba en partida, no se busca nueva partida');
        if (randomMoves) {
            realizarMovimientosRandom(socket, color, gameId);
        }
        else {
            realizarMovimientos(socket, color, gameId);
        }
    });

    socket.on('chat-history', (messages) => {
        console.log('Historial de chat:', messages);
    });

    socket.on('gameOver', (gameData) => {
        console.log('Partida finalizada:', gameData);
        // Realizar logout
        axios.post(`${BASE_URL}/logout`, { NombreUser: user })
            .then(() => {
                console.log('Logout exitoso.');
                socket.disconnect();
            })
            .catch((error) => {
                console.error('Error al hacer logout:', error.message);
                socket.disconnect();
            });
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
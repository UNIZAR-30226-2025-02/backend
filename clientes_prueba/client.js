import { io } from 'socket.io-client';
import { Chess } from 'chess.js';
import axios from 'axios';

// Configuración del servidor
// const BASE_URL = 'https://checkmatex-gkfda9h5bfb0gsed.spaincentral-01.azurewebsites.net';
const BASE_URL = 'http://localhost:3000';
const loginUrl = `${BASE_URL}/login`;
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
            }, 2000);
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
            setTimeout(() => {
                socket.emit('make-move', { movimiento: randomMove, idPartida: gameId, idJugador: userId });
            }, 2000);
            console.log('Movimiento realizado:', randomMove);
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
        }, 50);
    });

    socket.on('force-logout', (data) => {
        console.log('Forzar logout:', data.message);
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

        socket.emit('game-status', { timeLeftW: timeW, timeLeftB: timeB, estadoPartida: 'ingame' });
    });

    socket.on('new-message', (data) => {
        console.log('Nuevo mensaje:', data.message);
        setTimeout(() => {
            socket.emit('send-message', { message: 'Respuesta al mensaje recibido. Soy: '+ userId +'.', game_id: gameId, user_id: userId });
        }, 5000);
    });

    socket.on('existing-game', (data) => {
        const timeLeftW = data.timeLeftW;
        const timeLeftB = data.timeLeftB;
        const pgn = data.pgn;
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
        estabaEnPartida = true;

        socket.emit('fetch-msgs', { game_id: gameId });
    });

    socket.on('chat-history', (messages) => {
        console.log('Historial de chat:', messages);
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
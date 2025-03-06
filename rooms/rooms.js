import { db } from '../../db/db.js';
import { partida } from '../../db/schemas/partida.js';
import { usuario } from '../../db/schemas/usuario.js';
import { Chess } from 'chess.js';
import { v4 as uuidv4 } from 'uuid'; // Para generar IDs únicos

//tenemos que crear un objeto que mantenga las partidas activas en memoria
ActiveXObjects = {};

/********FUNCIONES AUXILIARES**********/

/*
 * Crea una nueva partida activa y la almacena en la base de datos
 */
export async function createNewGame(idJugador,mode) {
    try {
        // Crear un nuevo objeto de partida
        const chess = new Chess();

        // Generar un ID único para la nueva partida
        const gameId = uuidv4();

        //Generamos un numero aleatorio entre 0 y 1 para determinar el color del jugador
        const randomColor = Math.random() < 0.5 ? 'white' : 'black';
        
        // Crear una nueva partida en la base de datos
        await db.insert(partida).values({
            id: gameId,
            //Se mete el jugador que ha creado la partida en el color que le ha tocado
            JugadorW: randomColor === 'white' ? idJugador : null,
            JugadorB: randomColor === 'black' ? idJugador : null,
            //Modo seleccionado por el jugador
            Modo: mode,
            PGN: chess.pgn(),
            Ganador: null
        });
        console.log("Nueva partida creada con ID:", gameId);
        // Almacenar la partida activa en memoria
        ActiveXObjects[gameId] = chess;
    } catch (error) {
        console.error("Error al crear una nueva partida:", error);
    }
}


/*
 * Unirse a una partida existente a traves de su id
 */
export async function loadGame(idPartida, idJugador) {
    try {

        // Buscar la partida en la base de datos
        const partidaEncontrada = await db.select().from(partida).where(eq(partida.id, idPartida)).get();
        if (!partidaEncontrada) {
            return socket.emit('error', 'Partida no encontrada');
        }

        //Verificar si la partida esta terminada
        if(partidaEncontrada.Ganador != null){
            return socket.emit('error', 'Partida terminada');
        }

        //Verificar si ya hay dos jugadores en la partida
        if(partidaEncontrada.JugadorW != null && partidaEncontrada.JugadorB != null){
            return socket.emit('error', 'Partida llena');
        }

        // Actualizar la base de datos con el nuevo jugador
        await db.update(partida)
            //el hueco libre puede ser JugadorW o JugadorB, pero el otro que no es null hay que dejarlo igual
            .set({ 
                JugadorW: partidaEncontrada.JugadorW === null ? idJugador : partidaEncontrada.JugadorW,
                JugadorB: partidaEncontrada.JugadorB === null ? idJugador : partidaEncontrada.JugadorB
            })
            .where(eq(partida.id, idPartida))
            .run();
        
        //Unir al jugador a la partida
        socket.join(idPartida);

        //Guardar la partida en memoria
        activeGames[gameId].players.push(idJugador);

        // Notificar a los jugadores que la partida está lista
        socket.emit('gameJoined', { idPartida, board: activeGames[gameId].chess.board() });
        socket.to(gameId).emit('opponentJoined', { idJugador });

        console.log("El jugador, "+ idJugador +", se ha unido a la partida con ID:", idPartida);
        
    

    }catch (error) {
        console.error("Error al cargar la partida:", error);
    }
}

/*
* Gestionar el movimiento de las piezas
*/
export async function manejarMovimiento(idPartida, movimiento) {
    try {
       //Verificar primero si la partida esta activa
       if (!ActiveXObjects[idPartida]) {
            return socket.emit('error', 'Partida no activa');
        }

        const game = ActiveXObjects[idPartida].chess;
        const resultadoMovimiento = game.move(movimiento);
        if (resultadoMovimiento === null) {
            return socket.emit('error', 'Movimiento inválido');
        }

        //Si el movimiento se efectua bien emitimos el movimiento
        socket.to(idPartida).emit('moveMade', {move, board: game.board()});

        //Actualizar el PGN en la base de datos
        db.update(partida)
            .set({ PGN: game.pgn() })
            .where(eq(partida.id, idPartida))
            .run();
        
        //Comprobar si la partida ha terminado
        if (game.game_over()) {
            const winner = game.turn() === 'w' ? activeGames[gameId].players[1] : activeGames[gameId].players[0];

            db.update(partida)
                .set({ Ganador: winner })
                .where(eq(partida.id, idPartida))
                .run();
            
            //Notificacion
            socket.emit('gameOver', { winner });
            console.log("La partida ha terminado, el ganador es: ", winner);

            //Eliminar la partida de memoria
            delete ActiveXObjects[idPartida];

        }

    } catch (error) {
        console.error("Error al manejar el movimiento:", error);
    }
}



    



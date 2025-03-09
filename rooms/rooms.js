import { db } from '../db/db.js';
import { partida } from '../db/schemas/partida.js';
import { usuario } from '../db/schemas/usuario.js';
import { Chess } from 'chess.js';
import { eq } from "drizzle-orm";
//import { v4 as uuidv4 } from 'uuid'; // Para generar IDs únicos

//tenemos que crear un objeto que mantenga las partidas activas en memoria
let ActiveXObjects = {};

/********FUNCIONES AUXILIARES**********/

/*
 * Crea una nueva partida activa y la almacena en la base de datos
 */
export async function createNewGame(data) {
    const idJugador = data.idJugador;
    const mode = String(data.mode); 
    const jugador = await db.select().from(usuario).where(eq(usuario.id, idJugador)).get();
    console.log(jugador);
    try {
        //MIRAR QUE EL ESTADO DE LA PARTIDA DEL JUGADOR NO ESTE OCUPADO
        //...

        const puntuacionModo = jugador[mode]; // Puntuación del modo seleccionado por el jugador
        console.log("Puntuación del modo:", puntuacionModo);
        // Crear un nuevo objeto de partida
        const chess = new Chess();

        // Generar un ID único para la nueva partida
        const gameId = crypto.randomUUID();
        console.log("ID de la partida:", gameId);

        //Generamos un numero aleatorio entre 0 y 1 para determinar el color del jugador
        const randomColor = Math.random() < 0.5 ? 'white' : 'black';
        if (randomColor === 'white') {
            chess.setHeader('White', idJugador);
            chess.setHeader('Black', null);
            chess.setHeader('White Elo', puntuacionModo);
            chess.setHeader('Black Elo', null);
        } else {
            chess.setHeader('White', null);
            chess.setHeader('Black', idJugador);
            chess.setHeader('White Elo', null);
            chess.setHeader('Black Elo', puntuacionModo); 
        }
        // Crear una nueva partida en la base de datos
        await db.insert(partida).values({
            id: gameId,
            //created_at: Date.now(), // Fecha en timestamp
            JugadorW: randomColor === 'white' ? Number(idJugador) : null,
            JugadorB: randomColor === 'black' ? Number(idJugador) : null,
            //Modo seleccionado por el jugador
            Modo: mode,
            PGN: chess.pgn(),
            Ganador: null,
            Variacion_JW: 0, // Valor por defecto
            Variacion_JB: 0  // Valor por defecto
        });
        console.log("Nueva partida creada con ID:", gameId);
        // Almacenar la partida activa en memoria
                
        ActiveXObjects[gameId] = {
            players: [idJugador], // Inicializamos el array de jugadores con el primer jugador
            chess: chess
        };
        console.log("Partida almacenada en memoria:", ActiveXObjects[gameId]);
    } catch (error) {
        console.error("Error al crear una nueva partida:", error);
    }
}


/*
 * Unirse a una partida existente a traves de su id
 */
export async function loadGame(data, socket) {
    try {

        const idPartida = data.idPartida;
        const idJugador = data.idJugador;
        const chess = new Chess();
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

        //Completar el Header de la partida
        const jugador = await db.select().from(usuario).where(eq(usuario.id, idJugador)).get();
        console.log(jugador);
        //Sacar la puntuacion del jugador en el modo de la partida
        const puntuacionModo = jugador[partidaEncontrada.Modo]; // Puntuación del modo seleccionado por el jugador
        console.log("Puntuación del modo:", puntuacionModo);
        //Completar el header de la partida
        // Cargar el estado del juego desde el PGN almacenado en la base de datos
        chess.loadPgn(partidaEncontrada.PGN);
        
        // Obtener las puntuaciones guardadas en el header
        //REVISAR ESTO, DUPLICA LOS CAMPOS DE ELO DEL HEADER
        const headers = chess.header();
        let puntuacionOponente = null;
        
        if (partidaEncontrada.JugadorW === null) {
            // Si el jugador se une como White, la puntuación del oponente está en 'Black Elo'
            puntuacionOponente = headers['Black Elo'];
        
            chess.setHeader('White', idJugador);
            chess.setHeader('White Elo', puntuacionModo);
        } else {
            // Si el jugador se une como Black, la puntuación del oponente está en 'White Elo'
            puntuacionOponente = headers['White Elo'];
        
            chess.setHeader('Black', idJugador);
            chess.setHeader('Black Elo', puntuacionModo);
        }
        
        // Guardar el nuevo PGN con el header actualizado
        const updatedPGN = chess.pgn();

        
        // Actualizar la base de datos con el nuevo jugador
        await db.update(partida)
            //el hueco libre puede ser JugadorW o JugadorB, pero el otro que no es null hay que dejarlo igual
            .set({ 
                JugadorW: partidaEncontrada.JugadorW === null ? idJugador : partidaEncontrada.JugadorW,
                JugadorB: partidaEncontrada.JugadorB === null ? idJugador : partidaEncontrada.JugadorB,
                PGN: updatedPGN
            })
            .where(eq(partida.id, idPartida))
            .run();
        
        //Unir al jugador a la partida
        socket.join(idPartida);

        //Guardar la partida en memoria
        ActiveXObjects[idPartida].players.push(idJugador);

        // Notificar a los jugadores que la partida está lista
        socket.emit('gameJoined', { idPartida, board: ActiveXObjects[idPartida].chess.board() });
        socket.to(idPartida).emit('opponentJoined', { idJugador });

        console.log("El jugador, "+ idJugador +", se ha unido a la partida con ID:", idPartida);
        
    

    }catch (error) {
        console.error("Error al cargar la partida:", error);
    }
}

/*
* Gestionar el movimiento de las piezas
*/
export async function manejarMovimiento(data, chess) {
    const idPartida = data.idPartida;
    const movimiento = data.movimiento;
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
        //esto en principio no hace falta porque el PGN se actualiza automaticamente al hacer un movimiento
        
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

/*
* Funcion para encontrar una partida
*/
export async function findGame(data) {
    const idJugador = data.idJugador;
    const modo = data.modo; // Modo de juego seleccionado por el jugador
    try {
        //Buscar una partida de entre las activas donde solo haya un jugador que coincida con el modo
        //Solo pueden enfrentarse jugadores que en ese modo tengan una diferencia de 100 elo como mucho
        //variable idUsuario que sea el id de un usuario que ya esta en la partida, que puede estar en JugadorW o JugadorB

        //Nombramos una lista de ids de jugadores que ya estan en una partida activa
        const partidasPendientes = await db.select({
            idJugadorBlancas: partida.JugadorW,
            idJugadorNegras: partida.JugadorB,
            idPartida: partida.id
        })
            .from(partida)
            .where(
                eq(partida.Modo, modo),
                eq(partida.JugadorW, null).or(eq(partida.JugadorB, null))            
            )
            .get();
        
        //Quedarse con la lista de ids de usuarios de partidasPendientes
        
        /*let idUsuario = null;
        for (const partida of partidasPendientes) {
            if (partida.idJugadorBlancas !== null) {
            idUsuario = partida.idJugadorBlancas;
            break;
            } else if (partida.idJugadorNegras !== null) {
            idUsuario = partida.idJugadorNegras;
            break;
            }
        }
        */
        

        
    
/*        const partidaEncontrada = await db.select()
            .from(partida)
            .where(
                eq(partida.Modo, modo),
                eq(partida.JugadorW, null).or(eq(partida.JugadorB, null))            
                //Condicion de que el juagador que se une a la partida tenga un elo similar al de los jugadores que ya hay en la partida
                //HAY QUE HACERLA
                
                
            )
            .limit(1)
            .get();
*/
        
        //si ha encontrado la partida carga esa partida
        if (partidaEncontrada) {
            //Unir al jugador a la partida
            await loadGame(partidaEncontrada.id, idJugador);
        } else {
            // Si no se encuentra una partida, crear una nueva
            await createNewGame({ idJugador, modo });
        }


    } catch (error) {
        console.error("Error al encontrar una partida:", error);
    }
}



    



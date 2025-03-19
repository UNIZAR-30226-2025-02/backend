import { db } from '../db/db.js';
import { partida, usuario } from '../db/schemas/schemas.js';
import { Chess } from 'chess.js';
import { eq, or, and, isNull } from "drizzle-orm";
import { io } from '../server.js';
//import { v4 as uuidv4 } from 'uuid'; // Para generar IDs únicos

//tenemos que crear un objeto que mantenga las partidas activas en memoria
let ActiveXObjects = {};

/*
 * Crea una nueva partida activa y la almacena en la base de datos
 */
export async function createNewGame(idJugador, mode, socket) {
    // DISTINGUIR SI EL USUARIO ESTA CREADO Y NO ES INVITADO, VER SI ESTA LOGEADO, VERIFICADO ETC
    // SI ES GUEST, DEJARLE CREAR LA PARTIDA

    // tabla partida: campo tipo: guest, matched, duel(amigos)
    // const idJugador = data.idJugador;
    // const mode = String(data.mode); 
    const jugador = await db.select().from(usuario).where(eq(usuario.id, idJugador)).get();
    //console.log(jugador);
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
            chess.setHeader('White Elo', puntuacionModo);
        } else {
            chess.setHeader('Black', idJugador);
            chess.setHeader('Black Elo', puntuacionModo); 
        }
        // Crear una nueva partida en la base de datos
        await db.insert(partida).values({
            id: gameId,
            //created_at: Date.now(), // Fecha en timestamp
            JugadorW: randomColor === 'white' ? idJugador : null,
            JugadorB: randomColor === 'black' ? idJugador : null,
            //Modo seleccionado por el jugador
            Modo: mode,
            PGN: chess.pgn(),
            //PGN: null, // Valor por defecto al crear la partida
            Ganador: null, // Valor por defecto
            Variacion_JW: 0, // Valor por defecto
            Variacion_JB: 0  // Valor por defecto
        });
        console.log("Nueva partida creada con ID:", gameId);
        // Almacenar la partida activa en memoria
                
        ActiveXObjects[gameId] = {
            players: [idJugador], // Inicializamos el array de jugadores con el primer jugador
            chess: chess,
        };
        // console.log("Partida almacenada en memoria:", ActiveXObjects[gameId]);
        // Crear la sala socket de la partida
        socket.join(gameId);
        return gameId;

    } catch (error) {
        console.error("Error al crear una nueva partida:", error);
    }
}


/*
 * Unirse a una partida existente a traves de su id
 */
export async function loadGame(idPartida, idJugador, socket) {
    try {

        // const idPartida = data.idPartida;
        // const idJugador = data.idJugador;
        const existingGame = ActiveXObjects[idPartida].chess;
        
        //console.log(existingGame.header());
        // Buscar la partida en la base de datos
        const partidaEncontrada = await db.select().from(partida).where(eq(partida.id, idPartida)).get();
        if (!partidaEncontrada) {
            console.log("Partida no encontrada");
            socket.emit('errorMessage', 'Partida no encontrada');
            return null;
        }

        //Verificar si la partida esta terminada
        if(partidaEncontrada.Ganador != null){
            console.log("Partida terminada");
            socket.emit('errorMessage', 'Partida terminada');
            return null;
        }

        //Verificar si ya hay dos jugadores en la partida
        if(partidaEncontrada.JugadorW != null && partidaEncontrada.JugadorB != null){
            console.log("Partida llena");
            socket.emit('errorMessage', 'Partida llena');
            return null;
        }

        //Completar el Header de la partida
        const nuevoJugador = await db.select().from(usuario).where(eq(usuario.id, idJugador)).get();

        //console.log(nuevoJugador);
        //Sacar la puntuacion del jugador en el modo de la partida
        const puntuacionModo = nuevoJugador[partidaEncontrada.Modo]; // Puntuación del modo seleccionado por el jugador
        console.log("Puntuación del modo:", puntuacionModo);

        //Completar el header de la partida
        //Cargar el estado del juego desde el PGN almacenado en la base de datos
        //existingGame.loadPgn(partidaEncontrada.PGN);
        
        // Obtener las puntuaciones guardadas en el header
        //REVISAR ESTO, DUPLICA LOS CAMPOS DE ELO DEL HEADER
        // const headers = existingGame.header();
        //let puntuacionOponente = null;

        if (partidaEncontrada.JugadorW === null) {
            // Si el jugador se une como White, la puntuación del oponente está en 'Black Elo'
            //puntuacionOponente = headers['Black Elo'];
            existingGame.setHeader('White', idJugador);
            existingGame.setHeader('White Elo', puntuacionModo);
        } else {
            // Si el jugador se une como Black, la puntuación del oponente está en 'White Elo'
            //puntuacionOponente = headers['White Elo'];
            existingGame.setHeader('Black', idJugador);
            existingGame.setHeader('Black Elo', puntuacionModo);
        }
        
        // Guardar el nuevo PGN con el header actualizado
        const updatedPGN = existingGame.pgn();
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
        
        //Guardar la partida en memoria
        ActiveXObjects[idPartida].players.push(idJugador);

        //Unir al jugador a la partida
        socket.join(idPartida);
        // Notificar a los jugadores que la partida está lista
        //socket.emit('gameJoined', { idPartida, board: ActiveXObjects[idPartida].chess.board() });
        //socket.emit('game-Ready', {idPartida});
        const idBlancas = existingGame.header()['White'];
        const idNegras = existingGame.header()['Black'];

        // Notificar a los jugadores que la partida está lista a través de la sala
        io.to(idPartida).emit('game-ready', {idPartida});
        // Notificar a cada jugador su color en la partida

        console.log("ID jugador blanco:", idBlancas);
        console.log("ID jugador negro:", idNegras);
        // Pasarles el ID del usuario tambien ? o solo eso
        io.to(idPartida).emit('color', {
            jugadores: [
            { id: idBlancas, color: 'white' },
            { id: idNegras, color: 'black' }
            ]
        });

        console.log("El jugador, "+ idJugador +", se ha unido a la partida con ID:", idPartida);
        console.log("Jugadores en la partida: " + String(ActiveXObjects[idPartida].players));
        
    }catch (error) {
        console.error("Error al cargar la partida:", error);
    }
}

/*
* Gestionar el movimiento de las piezas
*/
export async function manejarMovimiento(data, socket) {
    const rooms = socket.rooms;
    // console.log("Salas del socket:", rooms);

    const idPartida = data.idPartida;
    const movimiento = data.movimiento;
    const idJugador = data.idJugador;
    // const timeleft = data.timeleft; 

    if (!rooms.has(idPartida)) {
        console.log("No estas jugando la partida! No puedes hacer movimientos en ella.");
        socket.emit('errorMessage', 'No estás en la partida');
        return null;
    }

    // console.log("Partidas en  memoria: ", ActiveXObjects);

    try {
       //Verificar primero si la partida esta activa
       if (!ActiveXObjects[idPartida]) {
            console.log("Partida no activa");
            socket.emit('errorMessage', 'Partida no activa');
            return null;
        }

        const game = ActiveXObjects[idPartida].chess;

        const resultadoMovimiento = game.move(movimiento);
        if (resultadoMovimiento === null) {
            console.log("Movimiento inválido");
            socket.emit('errorMessage', 'Movimiento inválido');
            return null;
        }
        // game.set_comment(timeleft);

        //Si el movimiento se efectua bien emitimos el movimiento
        //socket.to(idPartida).emit('new-move', move);
        // Mandar el tiempo??
        console.log("Movimiento realizado:", movimiento);

        console.log("Historial de la partida:", game.history());
        //console.log("Tablero de la partida:", game.board());
        //console.log("PGN de la partida:", game.pgn());

        socket.broadcast.to(idPartida).emit('new-move', {movimiento, board: game.board()});

        //Actualizar el PGN en la base de datos
        //esto en principio no hace falta porque el PGN se actualiza automaticamente al hacer un movimiento
        
        db.update(partida)
            .set({ PGN: game.pgn() })
            .where(eq(partida.id, idPartida))
            .run();
        //Comprobar si la partida ha terminado
        console.log("¿La partida ha terminado? ", game.isGameOver());

        if (game.isGameOver()) {
            resultManager(game, idPartida);
            // NO SOLO SE ACABAN LAS PARTIDAS POR JAQUE MATE, DISTINGUIR AHOGADO, RENDICION, ETC
        }

    } catch (error) {
        console.error("Error al manejar el movimiento:", error);
    }
}

export async function emparejamiento(idJugadorNuevo, modo) {

    // tener otro parametro que sea si se busca partida de guests, o normal

    // Buscar una partida de entre las activas donde solo haya un jugador que coincida con el modo
    // Solo pueden enfrentarse jugadores que en ese modo tengan una diferencia de 100 elo como mucho

    // const modo = data.modo; // Modo de juego seleccionado por el jugador
    // const idJugadorNuevo = data.idJugador;

    // Buscar partidas pendientes
    // MIRAR TAMBIEN EL MODO DE LA PARTIDA PARA COGER SOLO LAS QUE SEAN DE ESE MODO !!!!

    // COGER TAMBIEN QUE SEA IGUAL EL TIPO QUE EL QUE ESTA BUSCANDO (guest o normal)
    const listadoPartidasPendientes = await db.select()
        .from(partida)
        .where(and(eq(partida.Modo, modo), or(isNull(partida.JugadorW), isNull(partida.JugadorB))))
        .all();
    
    //console.log("Listado de partidas pendientes: ", listadoPartidasPendientes);
    
    // Obtener los jugadores de las partidas pendientes
    const emparejamientosPendientes = [];
    for (const partida of listadoPartidasPendientes) {
        if (partida.JugadorW !== null) {
            const emparejamiento = { jugador: partida.JugadorW, id: partida.id, emptyColor: 'black' };
            emparejamientosPendientes.push(emparejamiento);
        }
        if (partida.JugadorB !== null) {
            const emparejamiento = { jugador: partida.JugadorB, id: partida.id, emptyColor: 'white' };
            emparejamientosPendientes.push(emparejamiento);
        }
    }
    
    //console.log("Emparejamientos pendientes: ", emparejamientosPendientes);

    // Para cada jugador pendiente, comprobar si es posible emparejarlo con el jugador actual
    for (const emparejamiento of emparejamientosPendientes) {
        // Obtener la puntuación del jugador pendiente
        const jugadorExistente = await db.select()
            .from(usuario)
            .where(eq(usuario.id, emparejamiento.jugador))
            .get();
        
        //console.log("Puntuación del jugador pendiente: ", jugadorExistente[modo]);
        // Obtener la puntuación del jugador actual
        const jugadorNuevo = await db.select().from(usuario).where(eq(usuario.id, idJugadorNuevo)).get();
        //console.log("Puntuación del jugador actual: ", jugadorNuevo[modo]);
        // Comprobar si la diferencia de elo es menor o igual a 100
        if (Math.abs(jugadorExistente[modo] - jugadorNuevo[modo]) <= 100) {
            // Emparejar a los jugadores
            console.log("Emparejando jugadores...");
            console.log("------------------------------------------------------------")
            console.log("Jugador existente: ", emparejamiento.jugador);
            console.log("Jugador nuevo: ", idJugadorNuevo);
            console.log("ID de la partida: ", emparejamiento.id);
            console.log("------------------------------------------------------------")
            // Devuelve el id de la partida seleccionada de entre las pendientes en la que se ha
            // podido emparejar al jugador
            return emparejamiento.id;
        }
    }

    // Si no ha encontrado ninguna partida pendiente con la que emparejar al jugador, devuelve null
    console.log("No se ha encontrado rival para el jugador, se creará una nueva partida");
    return null;
}   

export async function findGame(data, socket) {
    // Buscar una partida de entre las activas donde el jugador pueda ser emparejado, y si no la 
    // hay, crear una nueva partida para el jugador
    // VER EN LA BASE DE DATOS SI EstadoPartida del jugador es 'ingame' y no dejarle o si es 'free' dejarle
    const idJugador = data.idJugador;       
    const modo = data.mode;
    // BUSCAR IDJUGADOR EN LA BASE DE DATOS PARA VER SI EXISTE Y VER SI ES GUEST O USUARIO REGISTRADO

    // tipoPartida = lo que saquemos de la base de datos
    // let idPartida = await emparejamiento(idJugador, modo, tipoPartida);           
    let idPartida = await emparejamiento(idJugador, modo);

    if (idPartida) {
        await loadGame(idPartida, idJugador, socket);
        // Poner el EstadoPartida del jugador en 'ingame'
        return idPartida;
    } else {
        idPartida = await createNewGame(idJugador, modo, socket);
        // Poner el EstadoPartida del jugador en 'ingame'
        return idPartida;
    }
}

export async function ratingVariation(puntuacionW, puntuacionB, resultado, k_factor) {
    // Calcular la variación de elo de los jugadores tras una partida
    // Calcular la expectativa de puntuación para cada jugador
    const expectativaW = 1 / (1 + Math.pow(10, (puntuacionB - puntuacionW) / 400));
    const expectativaB = 1 / (1 + Math.pow(10, (puntuacionW - puntuacionB) / 400));

    // Determinar el resultado de la partida para cada jugador
    let resultadoW, resultadoB;
    if (resultado === 'white') {
        resultadoW = 1;
        resultadoB = 0;
    } else if (resultado === 'black') {
        resultadoW = 0;
        resultadoB = 1;
    } else if (resultado === 'draw') {
        resultadoW = 0.5;
        resultadoB = 0.5;
    } else {
        throw new Error('Resultado inválido');
    }

    // Calcular la variación de puntuación para cada jugador
    const variacionW = Math.round(((k_factor * (resultadoW - expectativaW)) * 100)) /100;
    const variacionB = Math.round(((k_factor * (resultadoB - expectativaB)) * 100)) /100;

    return { variacionW, variacionB };
}

async function resultManager(game, idPartida) {
    if (game.isCheckmate()) {
        console.log("Jaque mate");
        // El ganador es el jugador que hizo el último movimiento
        const lastMove = game.history({ verbose: true }).pop();
        const winner = lastMove.color === 'w' ? game.header()['White'] : game.header()['Black'];
        const result = lastMove.color === 'w' ? 'white' : 'black';
        // Actualizar el resultado de la partida en la base de datos
        if (result === 'white') {
            game.setHeader('Result', '1-0');
        } else if (result === 'black') {
            game.setHeader('Result', '0-1');
        }
        // Calcular variacion de rating de los jugadores
        const { variacionW, variacionB } = await ratingVariation(
            game.header()['White Elo'],
            game.header()['Black Elo'],
            result,
            40
        );

        db.update(partida)
            .set({ Ganador: winner, Variacion_JW: variacionW, Variacion_JB: variacionB })
            .where(eq(partida.id, idPartida))
            .run();
        // DEBERIAMOS ACTUALIZAR LAS PUNTUACIONES DE LOS JUGADORES EN LA TABLA USUARIO
        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        console.log("Variación de elo del jugador blanco:", variacionW);
        console.log("Variación de elo del jugador negro:", variacionB);

        //Notificacion
        io.to(idPartida).emit('gameOver', { winner });
        console.log("La partida ha terminado, el ganador es: ", winner);

        //Eliminar la partida de memoria
        delete ActiveXObjects[idPartida];
        return;

    } else if (game.isDraw()) {
        console.log("Tablas");
        
        const drawReasons = {
            isStalemate: "Ahogado",
            isThreefoldRepetition: "Tablas por repetición de movimientos",
            isInsufficientMaterial: "Material insuficiente",
            isDrawByFiftyMoves: "Tablas por regla de los 50 movimientos"
        };

        // Recorre el mapa y muestra el primer motivo que sea verdadero
        for (const [method, message] of Object.entries(drawReasons)) {
            if (game[method]()) {
                console.log(message);
            }
        }

        const result = "draw";
        game.setHeader('Result', '1/2-1/2');

        // Calcular variacion de rating de los jugadores
        const { variacionW, variacionB } = await ratingVariation(
            game.header()['White Elo'],
            game.header()['Black Elo'],
            result,
            40
        );

        db.update(partida)
            .set({Variacion_JW: variacionW, Variacion_JB: variacionB })
            .where(eq(partida.id, idPartida))
            .run();
        // DEBERIAMOS ACTUALIZAR LAS PUNTUACIONES DE LOS JUGADORES EN LA TABLA USUARIO
        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        console.log("Variación de elo del jugador blanco:", variacionW);
        console.log("Variación de elo del jugador negro:", variacionB);

        //Notificacion
        io.to(idPartida).emit('gameOver', { result });
        console.log("La partida ha terminado en tablas");

        //Eliminar la partida de memoria
        delete ActiveXObjects[idPartida];
        return;

    } else {
        console.log("Error al determinar el motivo de finalización de la partida");
        return;
    }
}

import { db } from '../db/db.js';
import { partida, usuario } from '../db/schemas/schemas.js';
import { Chess } from 'chess.js';
import { eq, or, and, sql, isNull } from "drizzle-orm";
import { io } from '../../server.js';
import crypto from 'crypto';

// Tenemos que crear un objeto que mantenga las partidas activas en memoria
export let ActiveXObjects = {};
import { activeSockets } from '../../server.js';

// -----------------------------------------------------------------------------------------------
// Crea una partida en la base de datos y la almacena en memoria para el jugador que inicia
// la búsqueda
// -----------------------------------------------------------------------------------------------
export async function createNewGame(idJugador, mode, socket) {
    const jugador = await db.select().from(usuario).where(eq(usuario.id, idJugador)).get();
    let tipoPartida = jugador.estadoUser === 'guest' ? 'guest' : 'ranked';
    console.log("Tipo de partida:", tipoPartida);

    try {
        const puntuacionModo = jugador[mode]; // Puntuación del modo seleccionado por el jugador
        console.log("Puntuación del modo:", puntuacionModo);
        // Crear un nuevo objeto de partida
        const chess = new Chess();

        // Generar un ID único para la nueva partida
        const gameId = crypto.randomUUID();
        console.log("ID de la partida:", gameId);

        //Generamos un numero aleatorio entre 0 y 1 para determinar el color del jugador
        const randomColor = Math.random() < 0.5 ? 'white' : 'black';

        // Incluir los datos del jugador en la cabecera del PGN de la partida
        if (randomColor === 'white') {
            chess.setHeader('White', idJugador);
            chess.setHeader('White Elo', puntuacionModo);
            chess.setHeader('White Alias', jugador.NombreUser);
        } else {
            chess.setHeader('Black', idJugador);
            chess.setHeader('Black Elo', puntuacionModo);
            chess.setHeader('Black Alias', jugador.NombreUser);
        }
        // Crear una nueva partida en la base de datos
        await db.insert(partida).values({
            id: gameId,
            JugadorW: randomColor === 'white' ? idJugador : null,
            JugadorB: randomColor === 'black' ? idJugador : null,
            Modo: mode,
            PGN: chess.pgn(),
            Ganador: null,      // Valor por defecto
            Variacion_JW: 0,    // Valor por defecto
            Variacion_JB: 0,    // Valor por defecto
            Tipo: tipoPartida
        });
        console.log("Nueva partida creada con ID:", gameId);

        // Cambiar el estado de la partida del jugador a 'pairing'
        await db.update(usuario)
            .set({ EstadoPartida: 'pairing' })
            .where(eq(usuario.id, idJugador))
            .run();

        // Almacenar la partida en memoria
        ActiveXObjects[gameId] = {
            players: [idJugador], // Inicializamos el array de jugadores con el primer jugador
            chess: chess,
        };

        // Crear la sala socket de la partida
        socket.join(gameId);
        return gameId;

    } catch (error) {
        console.error("Error al crear una nueva partida:", error);
    }
}

// -----------------------------------------------------------------------------------------------
// Unir a un jugador a una partida existente, a través de su id, en la base de datos y en memoria
// -----------------------------------------------------------------------------------------------
export async function loadGame(idPartida, idJugador, socket) {
    try {
        const existingGame = ActiveXObjects[idPartida].chess;

        // Buscar la partida en la base de datos
        const partidaEncontrada = await db.select().from(partida).where(eq(partida.id, idPartida)).get();
        if (!partidaEncontrada) {
            console.log("Partida no encontrada");
            socket.emit('errorMessage', 'Partida no encontrada');
            return null;
        }

        // Verificar si la partida esta terminada
        if (partidaEncontrada.Ganador != null) {
            console.log("Partida terminada");
            socket.emit('errorMessage', 'Partida terminada');
            return null;
        }

        // Verificar si ya hay dos jugadores en la partida
        if (partidaEncontrada.JugadorW != null && partidaEncontrada.JugadorB != null) {
            console.log("Partida llena");
            socket.emit('errorMessage', 'Partida llena');
            return null;
        }

        const nuevoJugador = await db.select().from(usuario).where(eq(usuario.id, idJugador)).get();

        // Obtener la puntuacion del jugador en el modo de la partida
        const puntuacionModo = nuevoJugador[partidaEncontrada.Modo];
        console.log("Puntuación del modo:", puntuacionModo);

        // Completar la cabecera del PGN con el nuevo jugador
        if (partidaEncontrada.JugadorW === null) {
            existingGame.setHeader('White', idJugador);
            existingGame.setHeader('White Elo', puntuacionModo);
            existingGame.setHeader('White Alias', nuevoJugador.NombreUser);
        } else {
            existingGame.setHeader('Black', idJugador);
            existingGame.setHeader('Black Elo', puntuacionModo);
            existingGame.setHeader('Black Alias', nuevoJugador.NombreUser);
        }

        // Guardar el nuevo PGN con el header actualizado
        const updatedPGN = existingGame.pgn();

        // Actualizar la base de datos con el nuevo jugador
        await db.update(partida)
            .set({
                JugadorW: partidaEncontrada.JugadorW === null ? idJugador : partidaEncontrada.JugadorW,
                JugadorB: partidaEncontrada.JugadorB === null ? idJugador : partidaEncontrada.JugadorB,
                PGN: updatedPGN
            })
            .where(eq(partida.id, idPartida))
            .run();

        // Guardar la partida en memoria
        ActiveXObjects[idPartida].players.push(idJugador);

        // Unir al jugador a la partida
        socket.join(idPartida);

        const idBlancas = existingGame.header()['White'];
        const idNegras = existingGame.header()['Black'];

        // Obtener de la base de datos el nombre de los jugadores
        const jugadorBlancas = await db.select().from(usuario).where(eq(usuario.id, idBlancas)).get();
        const jugadorNegras = await db.select().from(usuario).where(eq(usuario.id, idNegras)).get();
        const nombreBlancas = jugadorBlancas.NombreUser;
        const nombreNegras = jugadorNegras.NombreUser;
        const fotoBlancas = jugadorBlancas.FotoPerfil;
        const fotoNegras = jugadorNegras.FotoPerfil;

        // Obtener el elo de los jugadores
        const eloBlancas = Math.trunc(existingGame.header()['White Elo']);
        const eloNegras = Math.trunc(existingGame.header()['Black Elo']);

        // Notificar a los jugadores que la partida está lista a través de la sala
        io.to(idPartida).emit('game-ready', { idPartida: idPartida, tipo: partidaEncontrada.Tipo });

        // Notificar a cada jugador la información de la partida para que puedan cargarla y 
        // comenzar a jugar
        console.log("ID jugador blanco:", idBlancas);
        console.log("ID jugador negro:", idNegras);

        io.to(idPartida).emit('color', {
            jugadores: [
                { id: idBlancas, nombreW: nombreBlancas, eloW: eloBlancas, color: 'white', fotoBlancas: fotoBlancas },
                { id: idNegras, nombreB: nombreNegras, eloB: eloNegras, color: 'black', fotoNegras: fotoNegras }
            ]
        });

        console.log("El jugador, " + idJugador + ", se ha unido a la partida con ID:", idPartida);
        console.log("Jugadores en la partida: " + String(ActiveXObjects[idPartida].players));

    } catch (error) {
        console.error("Error al cargar la partida:", error);
    }
}

// -----------------------------------------------------------------------------------------------
// Gestionar la realización de un nuevo movimiento en una partida activa en memoria
// -----------------------------------------------------------------------------------------------
export async function manejarMovimiento(data, socket) {
    const rooms = socket.rooms;
    const idPartida = data.idPartida;
    const movimiento = data.movimiento;

    // Comprobar si el jugador está en la partida en la que está intentando realizar el movimiento
    if (!rooms.has(idPartida)) {
        console.log("No estas jugando la partida! No puedes hacer movimientos en ella.");
        socket.emit('errorMessage', 'No estás en la partida');
        return null;
    }

    try {

        // Comprobar si la partida existe en memoria
        if (!ActiveXObjects[idPartida]) {
            console.log("Partida no activa");
            socket.emit('errorMessage', 'Partida no activa');
            return null;
        }

        const game = ActiveXObjects[idPartida].chess;
        const resultadoMovimiento = game.move(movimiento);

        // Comprobar que el movimiento es válido (tras realizar el movimiento, si todo ha ido bien,
        // resultadoMovimiento no será null)
        if (resultadoMovimiento === null) {
            console.log("Movimiento inválido");
            socket.emit('errorMessage', 'Movimiento inválido');
            return null;
        }

        // Propagar el movimiento para que lo reciba el otro jugador y actualice su tablero local
        console.log("Movimiento realizado:", movimiento);
        console.log("Historial de la partida:", game.history());

        socket.broadcast.to(idPartida).emit('new-move', { movimiento, board: game.board() });

        // Actualizar el PGN de la partida en la base de datos
        // db.update(partida)
        //    .set({ PGN: game.pgn() })
        //    .where(eq(partida.id, idPartida))
        //    .run();

        // Comprobar si la partida ha terminado debido a dicho movimiento (jaque mate, ahogado,
        // regla de los 50 movimientos, etc.)
        console.log("¿La partida ha terminado? ", game.isGameOver());

        if (game.isGameOver()) {

            // La partida ha terminado, gestionar el resultado en función del estado de la partida
            resultManager(game, idPartida);

            // Actualizar el estado de partida de los jugadores a 'null' en la base de datos
            await db.update(usuario)
                .set({ EstadoPartida: null })
                .where(or(
                    eq(usuario.id, ActiveXObjects[idPartida].players[0]),
                    eq(usuario.id, ActiveXObjects[idPartida].players[1])))
                .run();
        }

    } catch (error) {
        console.error("Error al manejar el movimiento:", error);
    }
}

// -----------------------------------------------------------------------------------------------
// Buscar una partida activa en la base de datos en la que se pueda emparejar al jugador nuevo con
// el existente en dicha partida
//
// ( Solo pueden enfrentarse jugadores que en ese modo tengan una diferencia de 100 elo como mucho,
// invitados y jugadores normales no pueden jugar entre ellos, el modo de la partida tiene que ser
// el mismo que el que busca el jugador nuevo, ... )
// -----------------------------------------------------------------------------------------------
export async function emparejamiento(idJugadorNuevo, modo, tipoPartida) {
    console.log("Buscando partida de tipo:", tipoPartida);
    console.log("Buscando partida de modo:", modo);
    console.log("ID del jugador nuevo:", idJugadorNuevo);

    // Obtener el listado de partidas pendientes en la base de datos (aquellas en las que hay un
    // único jugador asignado) con el mismo modo (Punt_3, Punt_5, ...) y tipo de partida (guest o
    // ranked) que el solicitado por el jugador que busca partida.
    console.log("Obteniendo listado de partidas pendientes...");
    const listadoPartidasPendientes = await db.select()
        .from(partida)
        .where(and(eq(partida.Modo, modo),
            eq(partida.Tipo, tipoPartida),
            or(isNull(partida.JugadorW), isNull(partida.JugadorB))))
        .all();

    // Obtener un listado con los id de los jugadores pendientes de emparejar que se encuentran en
    // las partidas pendientes  
    console.log("Obteniendo listado de jugadores pendientes de emparejar...");
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

    // Para cada jugador pendiente, comprobar si es posible emparejarlo con el jugador actual (la
    // puntuación en el modo buscado del jugador pendiente y la del jugador que busca partida no
    // debe diferir en +100 puntos)
    for (const emparejamiento of emparejamientosPendientes) {
        const jugadorExistente = await db.select()
            .from(usuario)
            .where(eq(usuario.id, emparejamiento.jugador))
            .get();

        const jugadorNuevo = await db.select().from(usuario).where(eq(usuario.id, idJugadorNuevo)).get();

        if (Math.abs(jugadorExistente[modo] - jugadorNuevo[modo]) <= 100) {
            // Es posible emparejar al jugador nuevo con el pendiente, se devuelve el id de la
            // partida para que se una a ella
            console.log("Emparejando jugadores...");
            console.log("------------------------------------------------------------")
            console.log("Jugador existente: ", emparejamiento.jugador);
            console.log("Jugador nuevo: ", idJugadorNuevo);
            console.log("ID de la partida: ", emparejamiento.id);
            console.log("------------------------------------------------------------")

            return emparejamiento.id;
        }
    }

    // Si no ha encontrado ninguna partida pendiente con la que emparejar al jugador, devuelve null
    console.log("No se ha encontrado rival para el jugador, se creará una nueva partida");
    return null;
}

// -----------------------------------------------------------------------------------------------
// Función utilizada por el cliente para iniciar la búsqueda de una partida. 
// Si es posible emparejarlo con un jugador existente, se le unirá a la partida.
// En caso contrario, se creará una partida nueva y quedará pendiente de emparejar.
// -----------------------------------------------------------------------------------------------
export async function findGame(data, socket) {
    const idJugador = data.idJugador;
    const modo = data.mode;
    let tipoPartida;

    // Obtener la información del jugador que busca partida en la tabla usuario de la bbdd
    const jugador = await db.select()
        .from(usuario)
        .where(eq(usuario.id, idJugador))
        .get();

    // Si el jugador ya está buscando partida o ya está en una partida, no se le permite buscar
    // otra nueva partida
    if (jugador.EstadoPartida === 'pairing') {
        console.log("El jugador ya está buscando partida");
        socket.emit('errorMessage', 'Ya estás buscando partida');
        return null;
    }
    if (jugador.EstadoPartida === 'ingame') {
        console.log("El jugador ya está en una partida");
        socket.emit('errorMessage', 'Ya estás en una partida');
        return null;
    }

    // Si el jugador es un usuario registrado y no está logeado, no se le permite buscar partida.
    // Si el jugador es un invitado, se le permite buscar partida sin estar logeado
    if (jugador.estadoUser === 'unlogged') {
        console.log("El jugador no está logeado");
        socket.emit('errorMessage', 'Debes iniciar sesión para jugar');
        return null;
    } else {
        if (jugador.estadoUser === 'guest') {
            console.log("El jugador es un invitado");
            tipoPartida = 'guest';
        } else if (jugador.estadoUser === 'logged') {
            console.log("El jugador es un usuario registrado con sesion iniciada");
            tipoPartida = 'ranked';
        }
    }

    // Utilizar la función emparejamiento para buscar una partida activa en la base de datos en
    // la que se pueda incluir al jugador nuevo
    let idPartida = await emparejamiento(idJugador, modo, tipoPartida);

    // Si se ha encontrado una partida activa, se le unirá a ella y se actualizará su estado
    // En caso contrario, se creará una nueva partida para el jugador
    if (idPartida) {

        // Unir al jugador a la partida activa
        await loadGame(idPartida, idJugador, socket);

        // Poner el EstadoPartida de los dos jugadores en 'ingame'
        await db.update(usuario)
            .set({ EstadoPartida: 'ingame' })
            .where(or(
                eq(usuario.id, ActiveXObjects[idPartida].players[0]),
                eq(usuario.id, ActiveXObjects[idPartida].players[1])))
            .run();
        
        return idPartida;
    } else {

        // Crear nueva partida (el estado de la partida del jugador pasa a ser 'pairing')
        idPartida = await createNewGame(idJugador, modo, socket);

        return idPartida;
    }
}

// -----------------------------------------------------------------------------------------------
// Función para calcular la variación de elo de los jugadores tras una partida, en función de sus
// puntuaciones iniciales, el resultado de la partida y el k_factor (multiplicador)
// -----------------------------------------------------------------------------------------------
export async function ratingVariation(puntuacionW, puntuacionB, resultado, k_factor) {

    // Calcular el resultado esperado a priori para cada jugador en función de su puntuación
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

    // Calcular la variación de puntuación para cada jugador mediante resultado y resultado
    // esperado
    const variacionW = Math.round(((k_factor * (resultadoW - expectativaW)) * 100)) / 100;
    const variacionB = Math.round(((k_factor * (resultadoB - expectativaB)) * 100)) / 100;

    return { variacionW, variacionB };
}

// -----------------------------------------------------------------------------------------------
// Función para actualizar el resultado de una partida en función de su estado final alcanzado
// (jaque mate, tablas por ahogado, etc.)
// -----------------------------------------------------------------------------------------------
async function resultManager(game, idPartida) {
    const partidaEncontrada = await db.select().from(partida).where(eq(partida.id, idPartida)).get();

    if (game.isCheckmate()) {

        // La partida ha terminado por jaque mate, determinar el ganador y el perdedor
        console.log("Jaque mate");

        // El ganador es el jugador que hizo el último movimiento
        const lastMove = game.history({ verbose: true }).pop();
        const winner = lastMove.color === 'w' ? game.header()['White'] : game.header()['Black'];
        const loser = lastMove.color === 'w' ? game.header()['Black'] : game.header()['White'];
        const result = lastMove.color === 'w' ? 'white' : 'black';

        // Incluir el resultado en la cabecera del PGN de la partida
        if (result === 'white') {
            game.setHeader('Result', '1-0');
        } else if (result === 'black') {
            game.setHeader('Result', '0-1');
        }

        let variacionW = 0;
        let variacionB = 0;
                
        if (partidaEncontrada.Tipo !== 'reto') {
            // Calcular variacion de rating de los jugadores
            ({variacionW, variacionB} = await ratingVariation(
            game.header()['White Elo'],
            game.header()['Black Elo'],
            result,
            40
            ));
        }

        // Actualizar los datos de la partida en la base de datos
        db.update(partida)
            .set({ Ganador: winner, Variacion_JW: variacionW, Variacion_JB: variacionB, PGN: game.pgn() })
            .where(eq(partida.id, idPartida))
            .run();

        // Actualizar los datos de los jugadores en la base de datos (tabla usuario), nuevas
        // puntuaciones y estadísticas (racha, total de partidas, victorias, derrotas, ...)
        console.log("Variación de elo del jugador blanco:", variacionW);
        console.log("Variación de elo del jugador negro:", variacionB);


       
        const eloW = game.header()['White Elo'];
        const eloB = game.header()['Black Elo'];

        // Actualizar puntuación del blanco
        await db.update(usuario)
            .set({
                [partidaEncontrada.Modo]: sql`${eloW} + ${variacionW}`
            })
            .where(eq(usuario.id, game.header()['White']))
            .run();

        // Actualizar puntuación del negro
        await db.update(usuario)
            .set({
                [partidaEncontrada.Modo]: sql`${eloB} + ${variacionB}`
            })
            .where(eq(usuario.id, game.header()['Black']))
            .run();
        
        // Actualizar estadísticas del ganador
        await db.update(usuario)
            .set({
                maxStreak: sql`CASE WHEN actualStreak + 1 > maxStreak THEN actualStreak + 1 ELSE maxStreak END`,
                actualStreak: sql`actualStreak + 1`,
                totalWins: sql`totalWins + 1`,
                totalGames: sql`totalGames + 1`
            })
            .where(eq(usuario.id, winner))
            .run();
        
        // Actualizar estadísticas del perdedor
        await db.update(usuario)
            .set({
                actualStreak: 0,
                totalLosses: sql`totalLosses + 1`,
                totalGames: sql`totalGames + 1`
            })
            .where(eq(usuario.id, loser))
            .run();

        // Notificar a los jugadores que la partida ha terminado y quién es el ganador
        io.to(idPartida).emit('gameOver', { winner: winner, timeout: 'false' });
        console.log("La partida ha terminado, el ganador es: ", winner);

        //Eliminar la partida de memoria
        delete ActiveXObjects[idPartida];
        return;

    } else if (game.isDraw()) {

        // La partida ha terminado en tablas, determinar el motivo de las tablas
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

        // Incluir el resultado en la cabecera del PGN de la partida
        const result = "draw";
        game.setHeader('Result', '1/2-1/2');

        let variacionW = 0;
        let variacionB = 0;
                
        if (partidaEncontrada.Tipo !== 'reto') {
            // Calcular variacion de rating de los jugadores
            ({variacionW, variacionB} = await ratingVariation(
            game.header()['White Elo'],
            game.header()['Black Elo'],
            result,
            40
            ));
        }

        // Actualizar los datos de la partida en la base de datos
        db.update(partida)
            .set({ Variacion_JW: variacionW, Variacion_JB: variacionB, PGN: game.pgn() })
            .where(eq(partida.id, idPartida))
            .run();

        // Actualizar la puntuación de los jugadores en la base de datos (tabla usuario) y las
        // estadísticas (racha, total de partidas, victorias, derrotas, ...)
        console.log("Variación de elo del jugador blanco:", variacionW);
        console.log("Variación de elo del jugador negro:", variacionB);

        const partidaEncontrada = await db.select().from(partida).where(eq(partida.id, idPartida)).get();
        const eloW = game.header()['White Elo'];
        const eloB = game.header()['Black Elo']

        // Actualizar la puntuación y estadísticas del blanco
        await db.update(usuario)
            .set({
                [partidaEncontrada.Modo]: sql`${eloW} + ${variacionW}`,
                totalDraws: sql`totalDraws + 1`,
                totalGames: sql`totalGames + 1`
            })
            .where(eq(usuario.id, game.header()['White']))
            .run();

        // Actualizar la puntuación y estadísticas del negro
        await db.update(usuario)
            .set({
                [partidaEncontrada.Modo]: sql`${eloB} + ${variacionB}`,
                totalDraws: sql`totalDraws + 1`,
                totalGames: sql`totalGames + 1`
            })
            .where(eq(usuario.id, game.header()['Black']))
            .run();

        // Notificar a los jugadores que la partida ha terminado en tablas
        io.to(idPartida).emit('gameOver', { winner: result, timeout: 'false' });
        console.log("La partida ha terminado en tablas");

        //Eliminar la partida de memoria
        delete ActiveXObjects[idPartida];
        return;

    } else {
        console.log("Error al determinar el motivo de finalización de la partida");
        return;
    }
}

// -----------------------------------------------------------------------------------------------
// Función para buscar una partida activa en la que el jugador ya estaba jugando antes de
// desconectarse o iniciar sesión en otro dispositivo.
// Se le enviará al cliente la información de la partida para que pueda retomarla
// -----------------------------------------------------------------------------------------------
export async function buscarPartidaActiva(userID, socket, timeLeftW, timeLeftB, estadoPartida, gameMode) {

    // Comprobar si el jugador estaba en una partida activa antes de desconectarse
    if (estadoPartida === 'ingame') {
        console.log("El jugador estaba en partida, devolviendo gameID al cliente...");

        // Buscar la partida activa en la que estaba el jugador (en memoria, sólo puede haber una
        // partida activa por jugador)
        let idPartidaEnJuego;
        for (const [gameID, gameData] of Object.entries(ActiveXObjects)) {
            console.log("idPartida:", gameID);
            console.log("jugadores:", gameData.players);
            console.log("partida:", gameData.chess.pgn());

            // En cada partida activa, comprobar si el jugador está en ella
            if (gameData.players.includes(userID)) {

                // El jugador está en la partida activa, se le envía la información de la partida
                const game = gameData.chess;

                console.log("Notificando al jugador la información de la partida en la que está...");
                idPartidaEnJuego = gameID;
                console.log("ID de la partida en juego:", idPartidaEnJuego);

                // Unir a la socket room de la partida el nuevo socket de conexión del jugador
                console.log("Uniendo socket a la sala de la partida con id:", gameID);
                socket.join(gameID);
                const pgn = game.pgn();
                const headers = game.header();

                // Recuperar los datos de la partida activa del jugador (colores, elo, rival, ...)
                const color = headers['White'] === userID ? 'white' : 'black';
                const miElo = color === 'white' ? Math.trunc(headers['White Elo']) : Math.trunc(headers['Black Elo']);
                const eloRival = color === 'white' ? Math.trunc(headers['Black Elo']) : Math.trunc(headers['White Elo']);
                const idRival = color === 'white' ? headers['Black'] : headers['White'];

                console.log("Mi elo:", miElo);
                console.log("Elo rival:", eloRival);
                console.log('id rival:', idRival);

                // Obtener los datos del rival de la base de datos
                const rival = await db.select().from(usuario).where(eq(usuario.id, idRival)).get()
                const nombreRival = rival.NombreUser;
                const foto_rival = rival.FotoPerfil;

                console.log("Nombre del rival:", nombreRival);

                // Notificar al cliente que estaba en una partida activa, proporcionando la info
                // necesaria para retomarla
                console.log("Enviando datos de la partida activa al cliente...");
                socket.emit('existing-game', { gameID, pgn, color, timeLeftW, timeLeftB, gameMode,
                    miElo, eloRival, nombreRival, foto_rival });
                break;
            }
        }

        if (!idPartidaEnJuego) {
            console.error("Error al buscar la partida activa del jugador");
            socket.emit('errorMessage', 'Error al buscar la partida activa del jugador');
        }
    }

    // Si el jugador no estaba 'ingame', no hay partida activa que restaurar
    console.log("El jugador no estaba en ninguna partida activa...");
}

// -----------------------------------------------------------------------------------------------
// Función para cancelar la búsqueda de partida de un jugador que todavía no había sido emparejado
// (el jugador no está en una partida activa, sólo está buscando partida)
// -----------------------------------------------------------------------------------------------
export async function cancelarBusquedaPartida(data, socket) {
    console.log("Cancelando la búsqueda de partida...");
    const idJugador = data.idJugador;
    let idPartida;

    // Buscar la partida (pendiente) en memoria en la que está el jugador
    for (const [gameID, gameData] of Object.entries(ActiveXObjects)) {
        if (gameData.players.includes(idJugador)) {

            // Guardar el id de la partida en la que está el jugador y parar el bucle
            idPartida = gameID;
            break;

        }
    }

    // Si no se ha encontrado la partida en memoria, el jugador no estaba buscando partida
    if (!idPartida) {
        console.log("No se ha encontrado la partida en la que está el jugador");
        socket.emit('errorMessage', 'No se ha encontrado tu emparejamiento activo');
        return null;
    }

    // Comprobar que el jugador estaba pendiente de emparejar (no hay rival asociado a la partida), 
    // y si es así cancelar la búsqueda de partida eliminando la partida de memoria y de la base de
    // datos
    if (ActiveXObjects[idPartida].players.length === 1) {

        // Eliminar la partida de memoria
        delete ActiveXObjects[idPartida];

        // Eliminar la partida de la base de datos
        await db.delete(partida)
            .where(eq(partida.id, idPartida))
            .run();

        // Actualizar el estado de la partida del jugador a null en la base de datos
        await db.update(usuario)
            .set({ EstadoPartida: null })
            .where(eq(usuario.id, idJugador))
            .run();

        // Notificar al jugador que ha cancelado correctamente la búsqueda de partida
        console.log("El jugador con id:", idJugador, "ha cancelado el emparejamiento.");
    } else {
        // No puede salir sin rendirse porque ya está activa la partida
        console.log("No puedes salir de la partida sin rendirte");
    }
}

// -----------------------------------------------------------------------------------------------
// Función para gestionar la rendición de un jugador en una partida activa y dar la victoria
// al rival
// -----------------------------------------------------------------------------------------------
export async function manejarRendicion(data, socket) {
    const idPartida = data.idPartida;
    const idJugador = data.idJugador;

    // Verificar si la partida existe y el jugador está en ella
    if (!ActiveXObjects[idPartida] || !ActiveXObjects[idPartida].players.includes(idJugador)) {
        console.log("No estás en esta partida");
        return socket.emit('errorMessage', 'No estás en esta partida');
    }

    // Notificar al rival de la rendición del jugador
    socket.to(idPartida).emit('player-surrendered', { idJugador });

    const game = ActiveXObjects[idPartida].chess;
    const headers = game.header();
    const color = headers['White'] === idJugador ? 'white' : 'black';
    const oponente = color === 'white' ? headers['Black'] : headers['White'];
    const result = color === 'black' ? 'white' : 'black';
    game.setHeader('Result', color === 'black' ? '1-0' : '0-1');

    
    // Actualizar los datos de la partida en la base de datos
    const partidaEncontrada = await db.select().from(partida).where(eq(partida.id, idPartida)).get();

    let variacionW = 0;
    let variacionB = 0;

    if (partidaEncontrada.Tipo !== 'reto') {
            // Calcular variacion de rating de los jugadores
        ({variacionW, variacionB} = await ratingVariation(
            game.header()['White Elo'],
            game.header()['Black Elo'],
            result,
            40
        ));
    }

    console.log("Variación de elo del jugador blanco:", variacionW);
    console.log("Variación de elo del jugador negro:", variacionB);

    const eloW = game.header()['White Elo'];
    const eloB = game.header()['Black Elo'];

    // Actualizar puntuación del blanco en bbdd
    await db.update(usuario)
        .set({
            [partidaEncontrada.Modo]: sql`${eloW} + ${variacionW}`
        })
        .where(eq(usuario.id, game.header()['White']))
        .run();

    // Actualizar puntuación del negro en bbdd
    await db.update(usuario)
        .set({
            [partidaEncontrada.Modo]: sql`${eloB} + ${variacionB}`
        })
        .where(eq(usuario.id, game.header()['Black']))
        .run();

    // Actualizar rachas y numero de partidas de cada jugador en función del resultado
    const winner = oponente;
    const loser = idJugador;
    
    // Actualizar estadísticas del ganador
    await db.update(usuario)
        .set({
            maxStreak: sql`CASE WHEN actualStreak + 1 > maxStreak THEN actualStreak + 1 ELSE maxStreak END`,
            actualStreak: sql`actualStreak + 1`,
            totalWins: sql`totalWins + 1`,
            totalGames: sql`totalGames + 1`
        })
        .where(eq(usuario.id, winner))
        .run();
    
    // Actualizar estadísticas del perdedor
    await db.update(usuario)
        .set({
            actualStreak: 0,
            totalLosses: sql`totalLosses + 1`,
            totalGames: sql`totalGames + 1`
        })
        .where(eq(usuario.id, loser))
        .run();

    // Actualizar la partida en base de datos con el ganador
    await db.update(partida)
        .set({ Ganador: oponente, Variacion_JW: variacionW, Variacion_JB: variacionB, PGN: game.pgn() })
        .where(eq(partida.id, idPartida))
        .run();

    // Notificar a los jugadores que la partida ha terminado y quién es el ganador
    io.to(idPartida).emit('gameOver', { winner: oponente, timeout: 'false'});

    // Poner el estado de partida de los jugadores a 'null' en la bbdd
    await db.update(usuario)
        .set({ EstadoPartida: null })
        .where(or(
            eq(usuario.id, game.header()['White']),
            eq(usuario.id, game.header()['Black'])))
        .run();

    // Eliminar la partida de memoria
    delete ActiveXObjects[idPartida];
    console.log("La partida ha terminado, el ganador es: ", oponente);
}

// -----------------------------------------------------------------------------------------------
// Función para gestionar la caída de bandera (pérdida de la partida por timeout) de uno de los
// jugadores
// -----------------------------------------------------------------------------------------------
export async function manejarTimeoutPartida(data, socket) {
    const idPartida = data.idPartida;
    const idJugador = data.idJugador;

    // Verificar si la partida existe y el jugador está en ella
    if (!ActiveXObjects[idPartida] || !ActiveXObjects[idPartida].players.includes(idJugador)) {
        console.log("No estás en esta partida");
        return socket.emit('errorMessage', 'No estás en esta partida');
    }

    const game = ActiveXObjects[idPartida].chess;
    const headers = game.header();
    const color = headers['White'] === idJugador ? 'white' : 'black';
    const oponente = color === 'white' ? headers['Black'] : headers['White'];
    const result = color === 'black' ? 'white' : 'black';
    game.setHeader('Result', color === 'black' ? '1-0' : '0-1');

    
    // Actualizar los datos de la partida en la base de datos
    const partidaEncontrada = await db.select().from(partida).where(eq(partida.id, idPartida)).get();

    let variacionW = 0;
    let variacionB = 0;

    if (partidaEncontrada.Tipo !== 'reto') {
            // Calcular variacion de rating de los jugadores
        ({variacionW, variacionB} = await ratingVariation(
            game.header()['White Elo'],
            game.header()['Black Elo'],
            result,
            40
        ));
    }

    console.log("Variación de elo del jugador blanco:", variacionW);
    console.log("Variación de elo del jugador negro:", variacionB);

    const eloW = game.header()['White Elo'];
    const eloB = game.header()['Black Elo'];

    // Actualizar puntuación del blanco en bbdd
    await db.update(usuario)
        .set({
            [partidaEncontrada.Modo]: sql`${eloW} + ${variacionW}`
        })
        .where(eq(usuario.id, game.header()['White']))
        .run();

    // Actualizar puntuación del negro en bbdd
    await db.update(usuario)
        .set({
            [partidaEncontrada.Modo]: sql`${eloB} + ${variacionB}`
        })
        .where(eq(usuario.id, game.header()['Black']))
        .run();

    // Actualizar rachas y numero de partidas de cada jugador en función del resultado
    const winner = oponente;
    const loser = idJugador;
    
    // Actualizar estadísticas del ganador
    await db.update(usuario)
        .set({
            maxStreak: sql`CASE WHEN actualStreak + 1 > maxStreak THEN actualStreak + 1 ELSE maxStreak END`,
            actualStreak: sql`actualStreak + 1`,
            totalWins: sql`totalWins + 1`,
            totalGames: sql`totalGames + 1`
        })
        .where(eq(usuario.id, winner))
        .run();
    
    // Actualizar estadísticas del perdedor
    await db.update(usuario)
        .set({
            actualStreak: 0,
            totalLosses: sql`totalLosses + 1`,
            totalGames: sql`totalGames + 1`
        })
        .where(eq(usuario.id, loser))
        .run();

    // Actualizar la partida en base de datos con el ganador
    await db.update(partida)
        .set({ Ganador: oponente, Variacion_JW: variacionW, Variacion_JB: variacionB, PGN: game.pgn() })
        .where(eq(partida.id, idPartida))
        .run();

    // Notificar a los jugadores que la partida ha terminado y quién es el ganador
    io.to(idPartida).emit('gameOver', { winner: oponente, timeout: 'true'});

    // Poner el estado de partida de los jugadores a 'null' en la bbdd
    await db.update(usuario)
        .set({ EstadoPartida: null })
        .where(or(
            eq(usuario.id, game.header()['White']),
            eq(usuario.id, game.header()['Black'])))
        .run();

    // Eliminar la partida de memoria
    delete ActiveXObjects[idPartida];
    console.log("La partida ha terminado, el ganador es: ", oponente);
}

// -----------------------------------------------------------------------------------------------
// Función para gestionar la oferta de tablas por parte de un jugador en una partida activa,
// notificando dicha oferta al rival para que este decida si aceptarla o rechazarla
// -----------------------------------------------------------------------------------------------
export async function ofertaDeTablas(data, socket) {
    const idPartida = data.idPartida;
    const idJugador = data.idJugador;

    // Verificar si la partida existe y el jugador está en ella
    if (!ActiveXObjects[idPartida] || !ActiveXObjects[idPartida].players.includes(idJugador)) {
        console.log("No estás en esta partida");
        return socket.emit('errorMessage', 'No estás en esta partida');
    }

    // Notificar al rival de la oferta de tablas
    socket.to(idPartida).emit('requestTie', { idJugador, idPartida });
    console.log("El jugador: ", idJugador, " ha ofrecido tablas");
}

// -----------------------------------------------------------------------------------------------
// Función para gestionar la aceptación de una oferta de tablas en una partida activa
// -----------------------------------------------------------------------------------------------
export async function aceptarTablas(data, socket) {
    const idPartida = data.idPartida;
    const idJugador = data.idJugador;

    // Verificar si la partida existe y el jugador está en ella
    if (!ActiveXObjects[idPartida] || !ActiveXObjects[idPartida].players.includes(idJugador)) {
        console.log("No estás en esta partida");
        return socket.emit('errorMessage', 'No estás en esta partida');
    }

    console.log("El jugador: ", idJugador, " ha aceptado las tablas");

    const partidaEncontrada = await db.select().from(partida).where(eq(partida.id, idPartida)).get();

    // Gestionar la finalización de la partida por acuerdo mutuo de tablas
    const game = ActiveXObjects[idPartida].chess;
    const result = "draw";
    game.setHeader('Result', '1/2-1/2');
    
    let variacionW = 0;
    let variacionB = 0;
    if (partidaEncontrada.Tipo !== 'reto') {
        // Calcular variacion de rating de los jugadores
        ({variacionW, variacionB}= await ratingVariation(
            game.header()['White Elo'],
            game.header()['Black Elo'],
            result,
            40
        ));
    }

    // Actualizar la partida en base de datos con el resultado de tablas
    await db.update(partida)
        .set({ PGN: game.pgn(), Variacion_JW: variacionW, Variacion_JB: variacionB })
        .where(eq(partida.id, idPartida))
        .run();

    const eloW = game.header()['White Elo'];
    const eloB = game.header()['Black Elo'];

    // Actualizar la puntuación de los jugadores en la base de datos (tabla usuario) y las
    // estadísticas (racha, total de partidas, victorias, derrotas, ...)

    // Actualizar puntuación del blanco
    await db.update(usuario)
        .set({
            [partidaEncontrada.Modo]: sql`${eloW} + ${variacionW}`
        })
        .where(eq(usuario.id, game.header()['White']))
        .run();

    // Actualizar puntuación del negro
    await db.update(usuario)
        .set({
            [partidaEncontrada.Modo]: sql`${eloB} + ${variacionB}`
        })
        .where(eq(usuario.id, game.header()['Black']))
        .run();

    // Notificar al otro jugador que su oferta de tablas ha sido aceptada, y notificar a ambos
    // que la partida ha terminado
    socket.to(idPartida).emit('draw-accepted', { idJugador });
    io.to(idPartida).emit('gameOver', { winner: "draw", timeout: 'false' });

    // Poner el estadoPartida de los jugadores a null en la base de datos
    await db.update(usuario)
        .set({ EstadoPartida: null })
        .where(or(
            eq(usuario.id, game.header()['White']),
            eq(usuario.id, game.header()['Black'])))
        .run();

    // Actualizar rachas y numero de partidas del blanco
    await db.update(usuario)
    .set({
        [partidaEncontrada.Modo]: sql`${eloW} + ${variacionW}`,
        totalDraws: sql`totalDraws + 1`,
        totalGames: sql`totalGames + 1`
    })
    .where(eq(usuario.id, game.header()['White']))
    .run();

    // Actualizar rachas y numero de partidas del negro
    await db.update(usuario)
        .set({
            [partidaEncontrada.Modo]: sql`${eloB} + ${variacionB}`,
            totalDraws: sql`totalDraws + 1`,
            totalGames: sql`totalGames + 1`
        })
        .where(eq(usuario.id, game.header()['Black']))
        .run();

    // Eliminar la partida de memoria
    delete ActiveXObjects[idPartida];
    console.log("La partida ha terminado en tablas por decisión mutua");
}

// -----------------------------------------------------------------------------------------------
// Función para gestionar el rechazo de una oferta de tablas en una partida activa
// -----------------------------------------------------------------------------------------------
export async function rechazarTablas(data, socket) {
    const idPartida = data.idPartida;
    const idJugador = data.idJugador;

    // Verificar si la partida existe y el jugador está en ella
    if (!ActiveXObjects[idPartida] || !ActiveXObjects[idPartida].players.includes(idJugador)) {
        console.log("No estás en esta partida");
        return socket.emit('errorMessage', 'No estás en esta partida');
    }

    console.log("El jugador ha rechazado las tablas");

    // Notificar al otro jugador que su oferta de tablas ha sido rechazada
    socket.to(idPartida).emit('draw-declined', { idJugador });
}

// -----------------------------------------------------------------------------------------------
// Función para gestionar la desconexión de un jugador en una partida activa, notificando al rival
// y considerando la desconexión como rendición si el jugador no se ha reconectado antes de una
// cuenta atrás de 15 segundos
// -----------------------------------------------------------------------------------------------
export async function gestionarDesconexion(socket) {
    
    // Recuperar el id del usuario cuyo socket se está desconectando (por motivo ajeno a logout)
    let userID;
    activeSockets.forEach((value, key) => {
        if (value.id === socket.id) {
            userID = key;
        }
    });

    // Si no se encuentra el userID, no se puede gestionar la desconexión (ya se ha desconectado
    // por medio del logout)
    if (!userID) {
        console.log("No se pudo encontrar el userID asociado al socket. El usuario cerró sesión" + 
                    + " de forma controlada.");
        return;
    }
    
    console.log("Gestión de desconexión del jugador: ", userID);
    activeSockets.delete(userID);

    // Buscar la partida activa del jugador
    let idPartida;
    for (const [gameID, gameData] of Object.entries(ActiveXObjects)) {
        if (gameData.players.includes(userID)) {
            idPartida = gameID;
            break;
        }
    }

    // Si no se encuentra la partida activa, el jugador no está en ninguna partida y puede 
    // desconectarse sin problemas
    if (!idPartida) {
        console.log("El jugador no está en ninguna partida activa.");
        return;
    }

    // Verificar si la partida existe y el jugador está en ella
    io.to(idPartida).emit('opponent-disconnected', { userID });

    console.log("Iniciando 15 segundos de cortesía para verificar si el jugador se reconecta...");

    setTimeout(() => {
        // Si el jugador no se ha reconectado, se considera que ha abandonado la partida
        if (!activeSockets.has(userID)) {
            console.log("El jugador no se ha reconectado, se considera que ha abandonado la partida.");

            // Verificar si la partida sigue activa o ha terminado ya por otro motivo
            // (tiempo, jaque mate, etc.)
            if (!ActiveXObjects[idPartida]) {
                console.log("La partida ya ha finalizado por otro motivo.");
                return;
            } else {
                console.log("Considerando abandono como rendición, dando la victoria al rival...");

                // Aquí puedes manejar la lógica de abandono de partida (rendición, etc.)
                manejarRendicion({ idPartida: idPartida, idJugador: userID }, socket);
            }
        } else {
            console.log("El jugador se ha reconectado antes de los 15 segundos.");
        }
    }, 15000); // 15 segundos
}
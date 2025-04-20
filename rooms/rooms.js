import { db } from '../db/db.js';
import { partida, usuario } from '../db/schemas/schemas.js';
import { Chess } from 'chess.js';
import { eq, or, and, sql, isNull } from "drizzle-orm";
import { io } from '../server.js';
import crypto from 'crypto';

// Tenemos que crear un objeto que mantenga las partidas activas en memoria
let ActiveXObjects = {};
import { activeSockets } from '../server.js';
/*
 * Crea una nueva partida activa y la almacena en la base de datos
 */
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
            Ganador: null, // Valor por defecto
            Variacion_JW: 0, // Valor por defecto
            Variacion_JB: 0,  // Valor por defecto
            Tipo: tipoPartida
        });
        console.log("Nueva partida creada con ID:", gameId);
        // Almacenar la partida activa en memoria

        // Cambiar el estado de la partida del jugador a 'pairing'
        await db.update(usuario)
            .set({ EstadoPartida: 'pairing' })
            .where(eq(usuario.id, idJugador))
            .run();

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


/*
 * Unirse a una partida existente a traves de su id
 */
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

        //Verificar si la partida esta terminada
        if (partidaEncontrada.Ganador != null) {
            console.log("Partida terminada");
            socket.emit('errorMessage', 'Partida terminada');
            return null;
        }

        //Verificar si ya hay dos jugadores en la partida
        if (partidaEncontrada.JugadorW != null && partidaEncontrada.JugadorB != null) {
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
        const idBlancas = existingGame.header()['White'];
        const idNegras = existingGame.header()['Black'];
        // Obtener de la base de datos el nombre de los jugadores
        const jugadorBlancas = await db.select().from(usuario).where(eq(usuario.id, idBlancas)).get();
        const jugadorNegras = await db.select().from(usuario).where(eq(usuario.id, idNegras)).get();
        const nombreBlancas = jugadorBlancas.NombreUser;
        const nombreNegras = jugadorNegras.NombreUser;

        // Obtener el elo de los jugadores
        const eloBlancas = Math.trunc(existingGame.header()['White Elo']);
        const eloNegras = Math.trunc(existingGame.header()['Black Elo']);

        // Notificar a los jugadores que la partida está lista a través de la sala
        io.to(idPartida).emit('game-ready', { idPartida });

        // Notificar a cada jugador su color en la partida
        console.log("ID jugador blanco:", idBlancas);
        console.log("ID jugador negro:", idNegras);

        // Pasarles el ID del usuario tambien ? o solo eso
        io.to(idPartida).emit('color', {
            jugadores: [
                { id: idBlancas, nombreW: nombreBlancas, eloW: eloBlancas, color: 'white' },
                { id: idNegras, nombreB: nombreNegras, eloB: eloNegras, color: 'black' }
            ]
        });

        console.log("El jugador, " + idJugador + ", se ha unido a la partida con ID:", idPartida);
        console.log("Jugadores en la partida: " + String(ActiveXObjects[idPartida].players));

    } catch (error) {
        console.error("Error al cargar la partida:", error);
    }
}

/*
* Gestionar el movimiento de las piezas
*/
export async function manejarMovimiento(data, socket) {
    const rooms = socket.rooms;
    const idPartida = data.idPartida;
    const movimiento = data.movimiento;

    if (!rooms.has(idPartida)) {
        console.log("No estas jugando la partida! No puedes hacer movimientos en ella.");
        socket.emit('errorMessage', 'No estás en la partida');
        return null;
    }

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

        //Si el movimiento se efectua bien emitimos el movimiento
        console.log("Movimiento realizado:", movimiento);
        console.log("Historial de la partida:", game.history());
        socket.broadcast.to(idPartida).emit('new-move', { movimiento, board: game.board() });

        //Actualizar el PGN en la base de datos
        db.update(partida)
            .set({ PGN: game.pgn() })
            .where(eq(partida.id, idPartida))
            .run();

        //Comprobar si la partida ha terminado
        console.log("¿La partida ha terminado? ", game.isGameOver());

        if (game.isGameOver()) {
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

export async function emparejamiento(idJugadorNuevo, modo, tipoPartida) {
    // Buscar una partida de entre las activas donde solo haya un jugador que coincida con el modo
    // Solo pueden enfrentarse jugadores que en ese modo tengan una diferencia de 100 elo como mucho

    // MIRAR TAMBIEN EL MODO DE LA PARTIDA PARA COGER SOLO LAS QUE SEAN DE ESE MODO !!!!
    // COGER TAMBIEN QUE SEA IGUAL EL TIPO QUE EL QUE ESTA BUSCANDO (guest o normal)
    console.log("Buscando partida de tipo:", tipoPartida);
    console.log("Buscando partida de modo:", modo);
    console.log("ID del jugador nuevo:", idJugadorNuevo);

    console.log("Obteniendo listado de partidas pendientes...");
    const listadoPartidasPendientes = await db.select()
        .from(partida)
        .where(and(eq(partida.Modo, modo),
            eq(partida.Tipo, tipoPartida),
            or(isNull(partida.JugadorW), isNull(partida.JugadorB))))
        .all();

    // Obtener los jugadores de las partidas pendientes
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

    // Para cada jugador pendiente, comprobar si es posible emparejarlo con el jugador actual
    for (const emparejamiento of emparejamientosPendientes) {
        // Obtener la puntuación del jugador pendiente
        const jugadorExistente = await db.select()
            .from(usuario)
            .where(eq(usuario.id, emparejamiento.jugador))
            .get();

        // Obtener la puntuación del jugador actual
        const jugadorNuevo = await db.select().from(usuario).where(eq(usuario.id, idJugadorNuevo)).get();

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

// Buscar una partida de entre las activas donde el jugador pueda ser emparejado, y si no la 
// hay, crear una nueva partida para el jugador
export async function findGame(data, socket) {
    const idJugador = data.idJugador;
    const modo = data.mode;
    let tipoPartida;

    // Comprobar si el jugador ya está en una partida
    const jugador = await db.select()
        .from(usuario)
        .where(eq(usuario.id, idJugador))
        .get();

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

    // Comprobar si el jugador está logeado o si es un invitado
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

    let idPartida = await emparejamiento(idJugador, modo, tipoPartida);

    if (idPartida) {
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
        idPartida = await createNewGame(idJugador, modo, socket);
        // El estado del jugador pasa a 'pairing'
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
    const variacionW = Math.round(((k_factor * (resultadoW - expectativaW)) * 100)) / 100;
    const variacionB = Math.round(((k_factor * (resultadoB - expectativaB)) * 100)) / 100;

    return { variacionW, variacionB };
}

async function resultManager(game, idPartida) {
    if (game.isCheckmate()) {
        console.log("Jaque mate");
        // El ganador es el jugador que hizo el último movimiento
        const lastMove = game.history({ verbose: true }).pop();
        const winner = lastMove.color === 'w' ? game.header()['White'] : game.header()['Black'];
        const loser = lastMove.color === 'w' ? game.header()['Black'] : game.header()['White'];
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

        // Actualizar los datos de la partida en la base de datos
        db.update(partida)
            .set({ Ganador: winner, Variacion_JW: variacionW, Variacion_JB: variacionB, PGN: game.pgn() })
            .where(eq(partida.id, idPartida))
            .run();

        // Actualizar la puntuación de los jugadores en la base de datos (tabla usuario)
        console.log("Variación de elo del jugador blanco:", variacionW);
        console.log("Variación de elo del jugador negro:", variacionB);

        const partidaEncontrada = await db.select().from(partida).where(eq(partida.id, idPartida)).get();
        const eloW = game.header()['White Elo'];
        const eloB = game.header()['Black Elo']
        await db.update(usuario)
            .set({
                [partidaEncontrada.Modo]: sql`${eloW} + ${variacionW}`
            })
            .where(eq(usuario.id, game.header()['White']))
            .run();


        await db.update(usuario)
            .set({
                [partidaEncontrada.Modo]: sql`${eloB} + ${variacionB}`
            })
            .where(eq(usuario.id, game.header()['Black']))
            .run();

        await db.update(usuario)
            .set({
                maxStreak: sql`CASE WHEN actualStreak + 1 > maxStreak THEN actualStreak + 1 ELSE maxStreak END`,
                actualStreak: sql`actualStreak + 1`,
                totalWins: sql`totalWins + 1`,
                totalGames: sql`totalGames + 1`
            })
            .where(eq(usuario.id, winner))
            .run();

        await db.update(usuario)
            .set({
                actualStreak: 0,
                totalLosses: sql`totalLosses + 1`,
                totalGames: sql`totalGames + 1`
            })
            .where(eq(usuario.id, loser))
            .run();

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

        // Actualizar los datos de la partida en la base de datos
        db.update(partida)
            .set({ Variacion_JW: variacionW, Variacion_JB: variacionB, PGN: game.pgn() })
            .where(eq(partida.id, idPartida))
            .run();

        // Actualizar la puntuación de los jugadores en la base de datos (tabla usuario)
        console.log("Variación de elo del jugador blanco:", variacionW);
        console.log("Variación de elo del jugador negro:", variacionB);

        const partidaEncontrada = await db.select().from(partida).where(eq(partida.id, idPartida)).get();
        const eloW = game.header()['White Elo'];
        const eloB = game.header()['Black Elo']
        await db.update(usuario)
            .set({
                [partidaEncontrada.Modo]: sql`${eloW} + ${variacionW}`,
                totalDraws: sql`totalDraws + 1`,
                totalGames: sql`totalGames + 1`
            })
            .where(eq(usuario.id, game.header()['White']))
            .run();


        await db.update(usuario)
            .set({
                [partidaEncontrada.Modo]: sql`${eloB} + ${variacionB}`,
                totalDraws: sql`totalDraws + 1`,
                totalGames: sql`totalGames + 1`
            })
            .where(eq(usuario.id, game.header()['Black']))
            .run();

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

export async function buscarPartidaActiva(userID, socket, timeLeftW, timeLeftB, estadoPartida, gameMode) {
    if (estadoPartida === 'ingame') {
        console.log("El jugador estaba en partida, devolviendo gameID al cliente...");

        let idPartidaEnJuego;
        for (const [gameID, gameData] of Object.entries(ActiveXObjects)) {
            console.log("idPartida:", gameID);
            console.log("jugadores:", gameData.players);
            console.log("partida:", gameData.chess.pgn());
            if (gameData.players.includes(userID)) {
                const game = gameData.chess;

                console.log("Notificando al jugador la información de la partida en la que está...");
                idPartidaEnJuego = gameID;
                console.log("ID de la partida en juego:", idPartidaEnJuego);

                // Unir a la socket room de la partida el nuevo socket de conexión del jugador
                console.log("Uniendo socket a la sala de la partida con id:", gameID);
                socket.join(gameID);
                const pgn = game.pgn();
                const headers = game.header();

                // Recuperar el color del jugador en la partida
                const color = headers['White'] === userID ? 'white' : 'black';
                
                const miElo = color === 'white' ? Math.trunc(headers['White Elo']) : Math.trunc(headers['Black Elo']);
                const eloRival = color === 'white' ? Math.trunc(headers['Black Elo']) : Math.trunc(headers['White Elo']);
                const idRival = color === 'white' ? headers['Black'] : headers['White'];
                
                console.log("Mi elo:", miElo);
                console.log("Elo rival:", eloRival);
                console.log('id rival:', idRival);

                // Obtener el nombre del rival
                const rival = await db.select().from(usuario).where(eq(usuario.id, idRival)).get()
                const nombreRival = rival.NombreUser;
                console.log("Nombre del rival:", nombreRival);

                // Notificar al cliente que estaba en una partida activa, proporcionando la info
                // necesaria para retomarla
                console.log("Enviando datos de la partida activa al cliente...");
                socket.emit('existing-game', { gameID, pgn, color, timeLeftW, timeLeftB, gameMode, miElo, eloRival, nombreRival });

                break;
            }
        }
        // ---------------------------------------------------------------------------------------
        if (!idPartidaEnJuego) {
            console.error("Error al buscar la partida activa del jugador");
            socket.emit('errorMessage', 'Error al buscar la partida activa del jugador');
        }
    }
    console.log("El jugador no estaba en ninguna partida activa...");
}

// -----------------------------------------------------------------------------------------------
// FINALIZACIÓN DE PARTIDA POR MOTIVOS EXTERNOS A LA PROPIA PARTIDA (RENDICIÓN, ACUERDO DE TABLAS,
// ETC)
// -----------------------------------------------------------------------------------------------
export async function cancelarBusquedaPartida(data, socket) {

    console.log("Cancelando la búsqueda de partida...");
    const idJugador = data.idJugador;
    let idPartida;
    // Recorrer ActiveXObjects para encontrar la partida en la que está el jugador
    for (const [gameID, gameData] of Object.entries(ActiveXObjects)) {
        if (gameData.players.includes(idJugador)) {
            // Guardar el id de la partida en la que está el jugador y parar el bucle
            idPartida = gameID;
            break;

        }
    }

    if (!idPartida) {
        console.log("No se ha encontrado la partida en la que está el jugador");
        socket.emit('errorMessage', 'No se ha encontrado tu emparejamiento activo');
        return null;
    }

    //Verificar si el jugador es el unico en la partida
    if (ActiveXObjects[idPartida].players.length === 1) {
        //Eliminar la partida de memoria
        delete ActiveXObjects[idPartida];
        //Eliminar la partida de la base de datos
        await db.delete(partida)
            .where(eq(partida.id, idPartida))
            .run();

        await db.update(usuario)
            .set({ EstadoPartida: null })
            .where(eq(usuario.id, idJugador))
            .run();

        //Notificar al jugador que ha salido de la partida
        console.log("El jugador con id:", idJugador, "ha cancelado el emparejamiento.");
    } else {
        //No puede salir sin rendirse porque ya se ha unido alguien
        console.log("No puedes salir de la partida sin rendirte");
    }
}

export async function manejarRendicion(data, socket) {
    console.log("Rendición de la partida...");
    const idPartida = data.idPartida;
    const idJugador = data.idJugador;

    // Verificar si la partida existe y el jugador está en ella
    if (!ActiveXObjects[idPartida] || !ActiveXObjects[idPartida].players.includes(idJugador)) {
        console.log("No estás en esta partida");
        return socket.emit('error', 'No estás en esta partida');
    }

    socket.to(idPartida).emit('player-surrendered', { idJugador });

    // Obtener el color del jugador que se rinde en base a idJugador
    const game = ActiveXObjects[idPartida].chess;

    const headers = game.header();
    const color = headers['White'] === idJugador ? 'white' : 'black';
    // El oponente es el jugador que no se ha rendido
    const oponente = color === 'white' ? headers['Black'] : headers['White'];
    game.setHeader('Result', color === 'black' ? '1-0' : '0-1');
    //Hay que calcular la variacion de elo
    const { variacionW, variacionB } = await ratingVariation(
        game.header()['White Elo'],
        game.header()['Black Elo'],
        color === 'white' ? 'black' : 'white',
        40
    );

    console.log("Variación de elo del jugador blanco:", variacionW);
    console.log("Variación de elo del jugador negro:", variacionB);

    const partidaEncontrada = await db.select().from(partida).where(eq(partida.id, idPartida)).get();

    // Actualizar puntuaciones
    const eloW = game.header()['White Elo'];
    const eloB = game.header()['Black Elo']
    await db.update(usuario)
        .set({
            [partidaEncontrada.Modo]: sql`${eloW} + ${variacionW}`
        })
        .where(eq(usuario.id, game.header()['White']))
        .run();


    await db.update(usuario)
        .set({
            [partidaEncontrada.Modo]: sql`${eloB} + ${variacionB}`
        })
        .where(eq(usuario.id, game.header()['Black']))
        .run();

    // Actualizar rachas y numero de partidas
    const winner = oponente;
    const loser = idJugador;
    
    await db.update(usuario)
        .set({
            maxStreak: sql`CASE WHEN actualStreak + 1 > maxStreak THEN actualStreak + 1 ELSE maxStreak END`,
            actualStreak: sql`actualStreak + 1`,
            totalWins: sql`totalWins + 1`,
            totalGames: sql`totalGames + 1`
        })
        .where(eq(usuario.id, winner))
        .run();

    await db.update(usuario)
        .set({
            actualStreak: 0,
            totalLosses: sql`totalLosses + 1`,
            totalGames: sql`totalGames + 1`
        })
        .where(eq(usuario.id, loser))
        .run();

    // Actualizar la base de datos con el ganador
    await db.update(partida)
        .set({ Ganador: oponente, Variacion_JW: variacionW, Variacion_JB: variacionB, })
        .where(eq(partida.id, idPartida))
        .run();
    // Emitir el evento de fin de partida al oponente
    io.to(idPartida).emit('gameOver', { winner: oponente });

    // Poner el estado de partida a null en la bbdd
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

// jugador1: manda socket.emit('draw-offer', { gameID }); al servidor
// servidor: recibe draw-offer, ejecuta oferta de tablas, y hace socket.to(gameID).emit('draw-offered', { gameID }); al otro jugador
// jugador2: recibe draw-offered, y manda al servidor 
//      --- socket.emit('draw-accepted', { gameID }); si acepta tablas o
//      --- socket.emit('draw-declined', { gameID }); si rechaza tablas
// servidor: recibe draw-accepted o draw-declined, ejecuta aceptarTablas o rechazarTablas
export async function ofertaDeTablas(data, socket) {

    console.log("Oferta de tablas...");
    const idPartida = data.idPartida;
    const idJugador = data.idJugador;

    // Verificar si la partida existe y el jugador está en ella
    if (!ActiveXObjects[idPartida] || !ActiveXObjects[idPartida].players.includes(idJugador)) {
        console.log("No estás en esta partida");
        return socket.emit('error', 'No estás en esta partida');
    }

    socket.to(idPartida).emit('requestTie', { idJugador, idPartida });
    console.log("El jugador ha ofrecido tablas");
    //socket.to(gameID).emit('draw-offered', { gameID });
}

export async function aceptarTablas(data, socket) {
    //parametros
    //idJugador: jugador que ha aceptado las tablas
    //idPartida: id de la partida
    console.log("Tablas aceptadas...");
    const idPartida = data.idPartida;
    const idJugador = data.idJugador;

    // Verificar si la partida existe y el jugador está en ella
    if (!ActiveXObjects[idPartida] || !ActiveXObjects[idPartida].players.includes(idJugador)) {
        console.log("No estás en esta partida");
        return socket.emit('error', 'No estás en esta partida');
    }

    console.log("El jugador  ha aceptado las tablas");
    const game = ActiveXObjects[idPartida].chess;
    game.setHeader('Result', '1/2-1/2');
    // Calcular variacion de rating de los jugadores
    const { variacionW, variacionB } = await ratingVariation(
        game.header()['White Elo'],
        game.header()['Black Elo'],
        "draw",
        40
    );

    const partidaEncontrada = await db.select().from(partida).where(eq(partida.id, idPartida)).get();
    //Actualizar la base de datos con empate de tablas
    await db.update(partida)
        .set({ PGN: game.pgn(), Variacion_JW: variacionW, Variacion_JB: variacionB })
        .where(eq(partida.id, idPartida))
        .run();

    // Actualizar puntuaciones
    const eloW = game.header()['White Elo'];
    const eloB = game.header()['Black Elo']
    await db.update(usuario)
        .set({
            [partidaEncontrada.Modo]: sql`${eloW} + ${variacionW}`
        })
        .where(eq(usuario.id, game.header()['White']))
        .run();


    await db.update(usuario)
        .set({
            [partidaEncontrada.Modo]: sql`${eloB} + ${variacionB}`
        })
        .where(eq(usuario.id, game.header()['Black']))
        .run();

    // Emitir el evento de fin de partida al oponente
    socket.to(idPartida).emit('draw-accepted', { idJugador });
    io.to(idPartida).emit('gameOver', { winner: "draw" });

    // Poner el estadoPartida de los jugadores a null en la base de datos
    await db.update(usuario)
        .set({ EstadoPartida: null })
        .where(or(
            eq(usuario.id, game.header()['White']),
            eq(usuario.id, game.header()['Black'])))
        .run();

    // Actualizar rachas y numero de partidas
    await db.update(usuario)
    .set({
        [partidaEncontrada.Modo]: sql`${eloW} + ${variacionW}`,
        totalDraws: sql`totalDraws + 1`,
        totalGames: sql`totalGames + 1`
    })
    .where(eq(usuario.id, game.header()['White']))
    .run();

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

export async function rechazarTablas(data, socket) {
    console.log("Tablas rechazadas...");

    //hacer un socket.emit('draw-declined', { gameID });
    const idPartida = data.idPartida;
    const idJugador = data.idJugador;
    // Verificar si la partida existe y el jugador está en ella
    if (!ActiveXObjects[idPartida] || !ActiveXObjects[idPartida].players.includes(idJugador)) {
        console.log("No estás en esta partida");
        return socket.emit('error', 'No estás en esta partida');
    }
    console.log("El jugador ha rechazado las tablas");
    socket.to(idPartida).emit('draw-declined', { idJugador });
}
// -----------------------------------------------------------------------------------------------

export async function gestionarDesconexion(socket) {
    // Recuperar el id del usuario cuyo socket se está desconectando (por motivo ajeno a logout)
    let userID;
    activeSockets.forEach((value, key) => {
        if (value.id === socket.id) {
            userID = key;
        }
    });

    // Si no se encuentra el userID, no se puede gestionar la desconexión (algo ha ido mal, había
    // un socket activo que no estaba en activeSockets)
    if (!userID) {
        console.log("No se pudo encontrar el userID asociado al socket.");
        return;
    }
    
    console.log("Gestión de desconexión del jugador: ", userID);

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
    activeSockets.delete(userID);

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
import { spawn } from 'child_process';
import { db } from '../src/db/db.js';
import { partida, mensaje, amistad, usuario } from '../src/db/schemas/schemas.js';
import { eq, or, and, desc } from 'drizzle-orm';

const serverPath = './server.js';
const clientPath = './clientes_prueba/client.js';
const client_cancel_pairing_path = './clientes_prueba/client_cancel_pairing.js';
const client_pide_tablas_path = './clientes_prueba/client_pide_tablas.js';
const client_acepta_tablas_path = './clientes_prueba/client_acepta_tablas.js';
const client_rechaza_tablas_path = './clientes_prueba/client_rechaza_tablas.js';
const client_acepta_amistad_reto_path = './clientes_prueba/client_acepta_amistad_reto.js';
const client_rechaza_amistad_reto_path = './clientes_prueba/client_rechaza_amistad_reto.js';
const client_pide_amistad_path = './clientes_prueba/client_pide_amistad.js';
const client_pide_reto_path = './clientes_prueba/client_pide_reto.js';
const client_borra_amistad_path = './clientes_prueba/client_borra_amistad.js';
const User1_name = 'Prueba11';
const User2_name = 'Prueba22';
const User1_password = '12345a';
const User2_password = '12345a';
const User1_id = '6ed5bb5b-93c8-4dc6-ab22-db3046153d7b';
const User2_id = '51bc4c2c-9918-489a-a29c-a8b2fe035558';

const logInfo = (message) => console.log(`ℹ️   [INFO] ${message}`);
const logSuccess = (message) => console.log(`✅   [SUCCESS] ${'='.repeat(40)}\n${message}\n${'='.repeat(40)}`);
const logFinalSuccess = (message) => console.log(`\n\n✅   [SUCCESS]\n${'✅'.repeat(40)}\n${message}\n${'✅'.repeat(40)}`);
const logWarning = (message) => console.log(`⚠️   [WARNING] ${'-'.repeat(40)}\n${message}\n${'-'.repeat(40)}`);
const logError = (message) => {
    console.error(`❌   [ERROR] ${'*'.repeat(40)}\n${message}\n${'*'.repeat(40)}`);
    HayErrores = true;
};

let HayErrores = false;

async function borrarPartida(idPartida) {
    try {
        await db.delete(mensaje).where(eq(mensaje.Id_partida, idPartida));
        await db.delete(partida).where(eq(partida.id, idPartida));
    } catch (error) {
        console.error('Error al borrar la partida:', error);
    }
}

async function borrarPartidasReto() {
    try {
        await db.delete(partida).where(
            and(
                eq(partida.Tipo, "reto"),
                or(
                    and(eq(partida.JugadorW, User1_id), eq(partida.JugadorB, User2_id)),
                    and(eq(partida.JugadorW, User2_id), eq(partida.JugadorB, User1_id))
                )
            )
        );
    } catch (error) {
        console.error('Error al borrar partidas de reto:', error);
    }
}

async function resetPlayers() {
    try {
        await db.update(usuario)
                .set({  EstadoPartida: null,
                        Punt_3: 10000,
                        Punt_5: 10000,
                        Punt_10: 10000,
                        Punt_30: 10000,
                        Punt_3_2: 10000,
                        Punt_5_10: 10000 
                    })
                .where(eq(usuario.id, User1_id));
        await db.update(usuario)
                .set({  EstadoPartida: null,
                        Punt_3: 10000,
                        Punt_5: 10000,
                        Punt_10: 10000,
                        Punt_30: 10000,
                        Punt_3_2: 10000,
                        Punt_5_10: 10000 
                    })
                .where(eq(usuario.id, User2_id));

    } catch (error) {
        console.error('Error al resetear jugadores:', error);
    }
}

// --------------------------------------------------------------------------------------------- //
// TEST 1: NORMAL GAME                                                                           //
// --------------------------------------------------------------------------------------------- //
async function Test1Base() {
    logInfo('Starting the server...');
    const server = spawn('node', [serverPath]);

    server.stdout.on('data', (data) => {
        console.log(`🖥️   Server: ${data}`);
    });

    server.stderr.on('data', (data) => {
        logError(`Server Error: ${data}`);
    });

    setTimeout(() => {
        logInfo('📋 📋 📋 TEST 1 - NORMAL GAME 📋 📋 📋');
        logInfo('Starting Client 1...');
        const client1 = spawn('node', [clientPath, User1_name, User1_password]);

        client1.stdout.on('data', (data) => {
            console.log(`👤 Client1: ${data}`);
        });

        client1.stderr.on('data', (data) => {
            logError(`Client1 Error: ${data}`);
        });

        let client2 = null;
        setTimeout(() => {
            logInfo('Starting Client 2...');
            client2 = spawn('node', [clientPath, User2_name, User2_password]);

            client2.stdout.on('data', (data) => {
                console.log(`👤 Client2: ${data}`);
            });

            client2.stderr.on('data', (data) => {
                logError(`Client2 Error: ${data}`);
            });
        }, 3000);

        setTimeout(async () => {
            try {
                logInfo('Checking the database for the match...');
                const result = await db.select().from(partida).where(
                    or(
                        and(eq(partida.JugadorW, User1_id), eq(partida.JugadorB, User2_id)),
                        and(eq(partida.JugadorW, User2_id), eq(partida.JugadorB, User1_id))
                    )
                ).orderBy(desc(partida.created_at)).limit(1);

                if (result.length <= 0) {
                    logWarning('No partida found in the database.');
                } else {
                    logSuccess('🎉 Partida found in the database!');
                    console.log(result);
                    if (result[0].JugadorW === User1_id) {
                        logInfo('User1 is playing with white pieces.');
                        if (result[0].JugadorB !== User2_id) logError('JugadorB does not match User2_id.');
                        if (result[0].Ganador !== User2_id) logError('Ganador does not match User2_id.');
                    } else {
                        logInfo('User2 is playing with white pieces.');
                        if (result[0].JugadorB !== User1_id) logError('JugadorB does not match User1_id.');
                        if (result[0].Ganador !== User1_id) logError('Ganador does not match User1_id.');
                    }
                    logSuccess('🎮 🕹️ 🎮    Partida data validation completed.    🎮 🕹️ 🎮');
                    borrarPartida(result[0].id); // Borrar la partida después de la validación
                }
            } catch (error) {
                logError(`Error checking the database: ${error}`);
            } finally {
                logInfo('Stopping clients...');
                client1.kill();
                client2.kill();

                logInfo('Stopping server...');
                server.kill();
            }
        }, 35000);
    }, 3000);
}

// --------------------------------------------------------------------------------------------- //
// TEST 2: ACCORDED DRAW GAME                                                                    //
// --------------------------------------------------------------------------------------------- //
async function Test2Base() {
    logInfo('Starting the server...');
    const server = spawn('node', [serverPath]);

    server.stdout.on('data', (data) => {
        console.log(`🖥️  Server: ${data}`);
    });

    server.stderr.on('data', (data) => {
        logError(`Server Error: ${data}`);
    });

    setTimeout(() => {
        logInfo('📋 📋 📋 TEST 2 - ACCORDED DRAW GAME 📋 📋 📋');
        logInfo('Starting Client 1...');
        const client1 = spawn('node', [client_pide_tablas_path, User1_name, User1_password]);

        client1.stdout.on('data', (data) => {
            console.log(`👤 Client1: ${data}`);
        });

        client1.stderr.on('data', (data) => {
            logError(`Client1 Error: ${data}`);
        });

        let client2 = null;
        setTimeout(() => {
            logInfo('Starting Client 2...');
            client2 = spawn('node', [client_acepta_tablas_path, User2_name, User2_password]);

            client2.stdout.on('data', (data) => {
                console.log(`👤 Client2: ${data}`);
            });

            client2.stderr.on('data', (data) => {
                logError(`Client2 Error: ${data}`);
            });
        }, 3000);

        setTimeout(async () => {
            try {
                logInfo('Checking the database for the match...');
                const result = await db.select().from(partida).where(
                    or(
                        and(eq(partida.JugadorW, User1_id), eq(partida.JugadorB, User2_id)),
                        and(eq(partida.JugadorW, User2_id), eq(partida.JugadorB, User1_id))
                    )
                ).orderBy(desc(partida.created_at)).limit(1);

                if (result.length <= 0) {
                    logWarning('No partida found in the database.');
                } else {
                    logSuccess('🎉 Partida found in the database!');
                    console.log(result);
                    if (result[0].JugadorW === User1_id) {
                        logInfo('User1 is playing with white pieces.');
                        if (result[0].JugadorB !== User2_id) logError('JugadorB does not match User2_id.');
                    } else {
                        logInfo('User2 is playing with white pieces.');
                        if (result[0].JugadorB !== User1_id) logError('JugadorB does not match User1_id.');
                    }
                    let partPGN = result[0].PGN;
                    if (partPGN.includes("[Result \"1/2-1/2\"]")) {
                        logSuccess('The game ended in a draw.');
                    } else if (partPGN.includes("[Result \"0-1\"]")) {
                        logError('User2 won the game.');
                    } else if (partPGN.includes("[Result \"1-0\"]")) {
                        logError('User1 won the game.');
                    } else {
                        logError('Game result not found in PGN.');
                    }
                    logSuccess('🎮 🕹️ 🎮    Partida data validation completed.    🎮 🕹️ 🎮');
                    borrarPartida(result[0].id); // Borrar la partida después de la validación
                }
            } catch (error) {
                logError(`Error checking the database: ${error}`);
            } finally {
                logInfo('Stopping clients...');
                client1.kill();
                // client1Login.kill();
                client2.kill();

                logInfo('Stopping server...');
                server.kill();
            }
        }, 15000);
    }, 10000);
}

// --------------------------------------------------------------------------------------------- //
// TEST 3: RESIGN IN GAME                                                                        //
// --------------------------------------------------------------------------------------------- //
async function Test3Base() {
    logInfo('Starting the server...');
    const server = spawn('node', [serverPath]);

    server.stdout.on('data', (data) => {
        console.log(`🖥️  Server: ${data}`);
    });

    server.stderr.on('data', (data) => {
        logError(`Server Error: ${data}`);
    });

    setTimeout(() => {
        logInfo('📋 📋 📋 TEST 3 - RESIGN IN GAME 📋 📋 📋');
        logInfo('Starting Client 1...');
        const client1 = spawn('node', [client_pide_tablas_path, User1_name, User1_password]);

        client1.stdout.on('data', (data) => {
            console.log(`👤 Client1: ${data}`);
        });

        client1.stderr.on('data', (data) => {
            logError(`Client1 Error: ${data}`);
        });

        let client2 = null;
        setTimeout(() => {
            logInfo('Starting Client 2...');
            client2 = spawn('node', [client_rechaza_tablas_path, User2_name, User2_password]);

            client2.stdout.on('data', (data) => {
                console.log(`👤 Client2: ${data}`);
            });

            client2.stderr.on('data', (data) => {
                logError(`Client2 Error: ${data}`);
            });
        }, 3000);

        setTimeout(async () => {
            try {
                logInfo('Checking the database for the match...');
                const result = await db.select().from(partida).where(
                    or(
                        and(eq(partida.JugadorW, User1_id), eq(partida.JugadorB, User2_id)),
                        and(eq(partida.JugadorW, User2_id), eq(partida.JugadorB, User1_id))
                    )
                ).orderBy(desc(partida.created_at)).limit(1);

                if (result.length <= 0) {
                    logWarning('No partida found in the database.');
                } else {
                    logSuccess('🎉 Partida found in the database!');
                    console.log(result);
                    if (result[0].JugadorW === User1_id) {
                        logInfo('User1 is playing with white pieces.');
                        if (result[0].JugadorB !== User2_id) logError('JugadorB does not match User2_id.');
                    } else {
                        logInfo('User2 is playing with white pieces.');
                        if (result[0].JugadorB !== User1_id) logError('JugadorB does not match User1_id.');
                    }
                    if (result[0].Ganador !== User2_id) {
                        logError('Ganador does not match User2_id.');
                    }
                    else {
                        logSuccess('🎮 🕹️ 🎮    Partida data validation completed.    🎮 🕹️ 🎮');
                    }
                    borrarPartida(result[0].id); // Borrar la partida después de la validación
                }
            } catch (error) {
                logError(`Error checking the database: ${error}`);
            } finally {
                logInfo('Stopping clients...');
                client1.kill();
                // client1Login.kill();
                client2.kill();

                logInfo('Stopping server...');
                server.kill();
            }
        }, 15000);
    }, 10000);
}

// --------------------------------------------------------------------------------------------- //
// TEST 4: CANCEL PAIRING FINDING                                                                //
// --------------------------------------------------------------------------------------------- //
async function Test4Base() {
    logInfo('Starting the server...');
    const server = spawn('node', [serverPath]);

    server.stdout.on('data', (data) => {
        console.log(`🖥️  Server: ${data}`);
    });

    server.stderr.on('data', (data) => {
        logError(`Server Error: ${data}`);
    });

    setTimeout(() => {
        logInfo('📋 📋 📋 TEST 4 - CANCEL PAIRING FINDING 📋 📋 📋');
        logInfo('Starting Client 1...');
        const client1 = spawn('node', [client_cancel_pairing_path, User1_name, User1_password]);

        client1.stdout.on('data', (data) => {
            console.log(`👤 Client1: ${data}`);
        });

        client1.stderr.on('data', (data) => {
            logError(`Client1 Error: ${data}`);
        });

        let client2 = null;
        setTimeout(() => {
            logInfo('Starting Client 2...');
            client2 = spawn('node', [client_cancel_pairing_path, User2_name, User2_password]);

            client2.stdout.on('data', (data) => {
                console.log(`👤 Client2: ${data}`);
            });

            client2.stderr.on('data', (data) => {
                logError(`Client2 Error: ${data}`);
            });
        }, 5000);

        setTimeout(async () => {
            try {
                logInfo('Checking the database for the match...');
                const result = await db.select().from(partida).where(
                    or(
                        and(eq(partida.JugadorW, User1_id), eq(partida.JugadorB, User2_id)),
                        and(eq(partida.JugadorW, User2_id), eq(partida.JugadorB, User1_id))
                    )
                ).orderBy(desc(partida.created_at)).limit(1);

                if (result.length <= 0) {
                    logSuccess('🎮 🕹️ 🎮    Partida has been cancelled and deleted.    🎮 🕹️ 🎮');
                } else {
                    if (result[0].created_at > new Date(Date.now() - 1000 * 60 * 5)) {
                        logError('Partida found in the database and it is too recent.');
                    }
                    logError('Partida found in the database!');
                    console.log(result);
                }
            }
            catch (error) {
                logError(`Error checking the database: ${error}`);
            } finally {
                logInfo('Stopping clients...');
                client1.kill();
                // client1Login.kill();
                client2.kill();

                logInfo('Stopping server...');
                server.kill();
            }
        }, 15000);
    }, 10000);
}

// --------------------------------------------------------------------------------------------- //
// TEST 5: DEVICE CHANGING MID GAME                                                              //
// --------------------------------------------------------------------------------------------- //
async function Test5Base() {
    logInfo('Starting the server...');
    const server = spawn('node', [serverPath]);

    server.stdout.on('data', (data) => {
        console.log(`🖥️   Server: ${data}`);
    });

    server.stderr.on('data', (data) => {
        logError(`Server Error: ${data}`);
    });

    setTimeout(() => {
        logInfo('📋 📋 📋 TEST 5 - CHANGING DEVICE MID GAME 📋 📋 📋');
        logInfo('Starting Client 1...');
        const client1 = spawn('node', [clientPath, User1_name, User1_password, "rand"]);

        client1.stdout.on('data', (data) => {
            console.log(`👤 Client1: ${data}`);
        });

        client1.stderr.on('data', (data) => {
            logError(`Client1 Error: ${data}`);
        });

        let client2 = null;
        setTimeout(() => {
            logInfo('Starting Client 2...');
            client2 = spawn('node', [clientPath, User2_name, User2_password, "rand"]);

            client2.stdout.on('data', (data) => {
                console.log(`👤 Client2: ${data}`);
            });

            client2.stderr.on('data', (data) => {
                logError(`Client2 Error: ${data}`);
            });
        }, 3000);

        let client1Login = null;
        setTimeout(() => {
            logInfo('Logging in Client 1 from another terminal...');
            client1Login = spawn('node', [client_pide_tablas_path, User1_name, User1_password, "rand"]);
            client1Login.stdout.on('data', (data) => {
                console.log(`👤 NEW Client1: ${data}`);
            });
            client1Login.stderr.on('data', (data) => {
                logError(`NEW Client1 Error: ${data}`);
            });
        }
            , 13000);

        setTimeout(async () => {
            try {
                logInfo('Checking the database for the match...');
                const result = await db.select().from(partida).where(
                    or(
                        and(eq(partida.JugadorW, User1_id), eq(partida.JugadorB, User2_id)),
                        and(eq(partida.JugadorW, User2_id), eq(partida.JugadorB, User1_id))
                    )
                ).orderBy(desc(partida.created_at)).limit(1);


                if (result.length <= 0) {
                    logWarning('No partida found in the database.');
                } else {
                    logSuccess('🎉 Partida found in the database!');
                    console.log(result);
                    if (result[0].JugadorW === User1_id) {
                        logInfo('User1 is playing with white pieces.');
                        if (result[0].JugadorB !== User2_id) logError('JugadorB does not match User2_id.');
                    } else {
                        logInfo('User2 is playing with white pieces.');
                        if (result[0].JugadorB !== User1_id) logError('JugadorB does not match User1_id.');
                    }
                    let partPGN = result[0].PGN;
                    if (partPGN.includes("[Result \"1/2-1/2\"]")) {
                        logSuccess('The game ended in a draw.');
                    } else if (partPGN.includes("[Result \"0-1\"]")) {
                        logError('User2 won the game.');
                    } else if (partPGN.includes("[Result \"1-0\"]")) {
                        logError('User1 won the game.');
                    } else {
                        logError('Game result not found in PGN.');
                    }
                    logSuccess('🎮 🕹️ 🎮    Partida data validation completed.    🎮 🕹️ 🎮');
                    borrarPartida(result[0].id); // Borrar la partida después de la validación
                }

            } catch (error) {
                logError(`Error checking the database: ${error}`);
            } finally {
                logInfo('Stopping clients...');
                client1.kill();
                client1Login.kill();
                client2.kill();

                logInfo('Stopping server...');
                server.kill();
            }
        }, 30000);
    }, 10000);
}

// --------------------------------------------------------------------------------------------- //
// TEST 6: REJECTING FRIENDSHIP                                                                  //
// --------------------------------------------------------------------------------------------- //
async function Test6Base() {
    logInfo('Starting the server...');
    const server = spawn('node', [serverPath]);

    server.stdout.on('data', (data) => {
        console.log(`🖥️   Server: ${data}`);
    });

    server.stderr.on('data', (data) => {
        logError(`Server Error: ${data}`);
    });

    setTimeout(() => {
        logInfo('📋 📋 📋 TEST 6 - REJECTING FRIENDSHIP  📋 📋 📋');
        logInfo('Starting Client 1...');
        const client1 = spawn('node', [client_pide_amistad_path, User1_name, User1_password, "rand"]);

        client1.stdout.on('data', (data) => {
            console.log(`👤 Client1: ${data}`);
        });

        client1.stderr.on('data', (data) => {
            logError(`Client1 Error: ${data}`);
        });

        let client2 = null;
        setTimeout(() => {
            logInfo('Starting Client 2...');
            client2 = spawn('node', [client_rechaza_amistad_reto_path, User2_name, User2_password, "rand"]);

            client2.stdout.on('data', (data) => {
                console.log(`👤 Client2: ${data}`);
            });

            client2.stderr.on('data', (data) => {
                logError(`Client2 Error: ${data}`);
            });
        }, 3000);

       
        setTimeout(async () => {
            try {
                logInfo('Checking the database for the friendship...');
                console.log("User1_id: ", User1_id);
                console.log("User2_id: ", User2_id);
                const result = await db.select().from(amistad).where(
                    or(
                        and(eq(amistad.Jugador1, User1_id), eq(amistad.Jugador2, User2_id)),
                        and(eq(amistad.Jugador1, User2_id), eq(amistad.Jugador2, User1_id))
                    )
                )


                if (result.length <= 0) {
                    logSuccess('🎉 NO Amistad found in the database!');
                } else {
                    logWarning('Amistad was found in the database although it was rejected.');
                }

            } catch (error) {
                logError(`Error checking the database: ${error}`);
            } finally {
                logInfo('Stopping clients...');
                client1.kill();
                client2.kill();

                logInfo('Stopping server...');
                server.kill();
            }
        }, 30000);
    }, 10000);
}

// --------------------------------------------------------------------------------------------- //
// TEST 7: ACCEPCTING FRIENDSHIP                                                                 //
// --------------------------------------------------------------------------------------------- //
async function Test7Base() {
    logInfo('Starting the server...');
    const server = spawn('node', [serverPath]);

    server.stdout.on('data', (data) => {
        console.log(`🖥️   Server: ${data}`);
    });

    server.stderr.on('data', (data) => {
        logError(`Server Error: ${data}`);
    });

    setTimeout(() => {
        logInfo('📋 📋 📋 TEST 7 - ACCEPTING FRIENDSHIP  📋 📋 📋');
        logInfo('Starting Client 1...');
        const client1 = spawn('node', [client_pide_amistad_path, User1_name, User1_password, "rand"]);

        client1.stdout.on('data', (data) => {
            console.log(`👤 Client1: ${data}`);
        });

        client1.stderr.on('data', (data) => {
            logError(`Client1 Error: ${data}`);
        });

        let client2 = null;
        setTimeout(() => {
            logInfo('Starting Client 2...');
            client2 = spawn('node', [client_acepta_amistad_reto_path, User2_name, User2_password, "rand"]);

            client2.stdout.on('data', (data) => {
                console.log(`👤 Client2: ${data}`);
            });

            client2.stderr.on('data', (data) => {
                logError(`Client2 Error: ${data}`);
            });
        }, 3000);

       
        setTimeout(async () => {
            try {
                logInfo('Checking the database for the match...');
                console.log("User1_id: ", User1_id);
                console.log("User2_id: ", User2_id);
                const result = await db.select().from(amistad).where(
                    or(
                        and(eq(amistad.Jugador1, User1_id), eq(amistad.Jugador2, User2_id)),
                        and(eq(amistad.Jugador1, User2_id), eq(amistad.Jugador2, User1_id))
                    )
                )


                if (result.length <= 0) {
                    logWarning('No amistad found in the database.');
                } else {
                    logSuccess('🎉 Amistad found in the database!');
                    console.log(result);
                }

            } catch (error) {
                logError(`Error checking the database: ${error}`);
            } finally {
                logInfo('Stopping clients...');
                client1.kill();
                client2.kill();

                logInfo('Stopping server...');
                server.kill();
            }
        }, 30000);
    }, 10000);
}

// --------------------------------------------------------------------------------------------- //
// TEST 8: REJECTING CHALLENGE                                                                   //
// --------------------------------------------------------------------------------------------- //
async function Test8Base() {
    logInfo('Starting the server...');
    const server = spawn('node', [serverPath]);

    server.stdout.on('data', (data) => {
        console.log(`🖥️   Server: ${data}`);
    });

    server.stderr.on('data', (data) => {
        logError(`Server Error: ${data}`);
    });

    setTimeout(() => {
        logInfo('📋 📋 📋 TEST 8 - REJECTING CHALLENGE  📋 📋 📋');
        logInfo('Starting Client 1...');
        const client1 = spawn('node', [client_pide_reto_path, User1_name, User1_password, "rand"]);

        client1.stdout.on('data', (data) => {
            console.log(`👤 Client1: ${data}`);
        });

        client1.stderr.on('data', (data) => {
            logError(`Client1 Error: ${data}`);
        });

        let client2 = null;
        setTimeout(() => {
            logInfo('Starting Client 2...');
            client2 = spawn('node', [client_rechaza_amistad_reto_path, User2_name, User2_password, "rand"]);

            client2.stdout.on('data', (data) => {
                console.log(`👤 Client2: ${data}`);
            });

            client2.stderr.on('data', (data) => {
                logError(`Client2 Error: ${data}`);
            });
        }, 3000);

       
        setTimeout(async () => {
            try {
                logInfo('Checking the database for the match...');
            

                //mirar que haya una partida correspondiente al reto
                const result = await db.select().from(partida).where(
                    and(
                        or(
                            and(eq(partida.JugadorW, User1_id), eq(partida.JugadorB, User2_id)),
                            and(eq(partida.JugadorW, User2_id), eq(partida.JugadorB, User1_id))
                        ),
                        eq(
                            partida.Tipo, "reto"
                        )
                    )
                )

                if (result.length <= 0) {
                    logSuccess('🎉 NO Challenge found in the database! It was successfully rejected');
                } else {
                    logWarning('Challenge was found in the database although it was rejected.');
                }

            } catch (error) {
                logError(`Error checking the database: ${error}`);
            } finally {
                logInfo('Stopping clients...');
                client1.kill();
                client2.kill();

                logInfo('Stopping server...');
                server.kill();
            }
        }, 30000);
    }, 10000);
}

// --------------------------------------------------------------------------------------------- //
// TEST 9: ACCEPTING CHALLENGE                                                                   //
// --------------------------------------------------------------------------------------------- //
async function Test9Base() {
    logInfo('Starting the server...');
    const server = spawn('node', [serverPath]);

    server.stdout.on('data', (data) => {
        console.log(`🖥️   Server: ${data}`);
    });

    server.stderr.on('data', (data) => {
        logError(`Server Error: ${data}`);
    });

    setTimeout(() => {
        logInfo('📋 📋 📋 TEST 9 - ACCEPTING CHALLENGE  📋 📋 📋');
        logInfo('Starting Client 1...');
        const client1 = spawn('node', [client_pide_reto_path, User1_name, User1_password, "rand"]);

        client1.stdout.on('data', (data) => {
            console.log(`👤 Client1: ${data}`);
        });

        client1.stderr.on('data', (data) => {
            logError(`Client1 Error: ${data}`);
        });

        let client2 = null;
        setTimeout(() => {
            logInfo('Starting Client 2...');
            client2 = spawn('node', [client_acepta_amistad_reto_path, User2_name, User2_password, "rand"]);

            client2.stdout.on('data', (data) => {
                console.log(`👤 Client2: ${data}`);
            });

            client2.stderr.on('data', (data) => {
                logError(`Client2 Error: ${data}`);
            });
        }, 3000);

       
        setTimeout(async () => {
            try {
                logInfo('Checking the database for the match...');
            

                //mirar que haya una partida correspondiente al reto
                const result = await db.select().from(partida).where(
                    and(
                        or(
                            and(eq(partida.JugadorW, User1_id), eq(partida.JugadorB, User2_id)),
                            and(eq(partida.JugadorW, User2_id), eq(partida.JugadorB, User1_id))
                        ),
                        eq(
                            partida.Tipo, "reto"
                        )
                    )
                )


                if (result.length <= 0) {
                    logWarning('No challenge found in the database.');
                } else {
                    logSuccess('🎉 Challenge found in the database!');
                    console.log(result);
                    
                    await borrarPartidasReto(); // Borrar la partida después de la validación
                }

            } catch (error) {
                logError(`Error checking the database: ${error}`);
            } finally {
                logInfo('Stopping clients...');
                client1.kill();
                client2.kill();

                logInfo('Stopping server...');
                server.kill();
            }
        }, 30000);
    }, 10000);
}

// --------------------------------------------------------------------------------------------- //
// TEST 10: REMOVING FRIENDSHIP                                                                  //
// --------------------------------------------------------------------------------------------- //
async function Test10Base() {
    logInfo('Starting the server...');
    const server = spawn('node', [serverPath]);

    server.stdout.on('data', (data) => {
        console.log(`🖥️   Server: ${data}`);
    });

    server.stderr.on('data', (data) => {
        logError(`Server Error: ${data}`);
    });

    setTimeout(() => {
        logInfo('📋 📋 📋 TEST 10 - REMOVING FRIENDSHIP  📋 📋 📋');
        logInfo('Starting Client 1...');
        const client1 = spawn('node', [client_borra_amistad_path, User1_name, User1_password, "rand"]);

        client1.stdout.on('data', (data) => {
            console.log(`👤 Client1: ${data}`);
        });

        client1.stderr.on('data', (data) => {
            logError(`Client1 Error: ${data}`);
        });

        let client2 = null;
        setTimeout(() => {
            logInfo('Starting Client 2...');
            client2 = spawn('node', [client_rechaza_amistad_reto_path, User2_name, User2_password, "rand"]);

            client2.stdout.on('data', (data) => {
                console.log(`👤 Client2: ${data}`);
            });

            client2.stderr.on('data', (data) => {
                logError(`Client2 Error: ${data}`);
            });
        }, 3000);

       
        setTimeout(async () => {
            try {
                logInfo('Checking the database for the friendship...');
                console.log("User1_id: ", User1_id);
                console.log("User2_id: ", User2_id);
                const result = await db.select().from(amistad).where(
                    or(
                        and(eq(amistad.Jugador1, User1_id), eq(amistad.Jugador2, User2_id)),
                        and(eq(amistad.Jugador1, User2_id), eq(amistad.Jugador2, User1_id))
                    )
                )


                if (result.length <= 0) {
                    logSuccess('🎉 NO Amistad found in the database! It was successfully deleted');
                } else {
                    logWarning('Amistad was found in the database although it was requested to delete.');
                }

            } catch (error) {
                logError(`Error checking the database: ${error}`);
            } finally {
                logInfo('Stopping clients...');
                client1.kill();
                client2.kill();

                logInfo('Stopping server...');
                server.kill();
            }
        }, 30000);
    }, 10000);
}

async function main() {
    logInfo('Starting the tests...');
    await Test1Base();
    await new Promise(resolve => setTimeout(resolve, 60000)); // Wait for Test1Base to fully complete

    await Test2Base();
    await new Promise(resolve => setTimeout(resolve, 60000)); // Wait for Test2Base to fully complete

    await Test3Base();
    await new Promise(resolve => setTimeout(resolve, 60000)); // Wait for Test3Base to fully complete

    await Test4Base();
    await new Promise(resolve => setTimeout(resolve, 60000)); // Wait for Test4Base to fully complete

    await Test5Base();
    await new Promise(resolve => setTimeout(resolve, 60000)); // Wait for Test5Base to fully complete

    await Test6Base();
    await new Promise(resolve => setTimeout(resolve, 60000)); // Wait for Test6Base to fully complete

    await Test7Base();
    await new Promise(resolve => setTimeout(resolve, 60000)); // Wait for Test7Base to fully complete

    await Test8Base();
    await new Promise(resolve => setTimeout(resolve, 60000)); // Wait for Test8Base to fully complete

    await Test9Base();
    await new Promise(resolve => setTimeout(resolve, 60000)); // Wait for Test8Base to fully complete

    await Test10Base();
    await new Promise(resolve => setTimeout(resolve, 60000)); // Wait for Test8Base to fully complete

    // ----------------------------------------------------------------------------------------- //
    await new Promise(resolve => setTimeout(resolve, 1000));

    await resetPlayers();   // Reset players after all tests

    if (HayErrores) {
        logError(' ❌ ❌ ❌ There were errors during the tests. ❌ ❌ ❌');
    } else {
        logFinalSuccess
        ('\n 🎆 🎆 🎆 🎉 🎉 🎖️  All tests completed successfully!  🎖️ 🎉 🎉 🎆 🎆 🎆  \n');
    }
    // ----------------------------------------------------------------------------------------- //
}

main().catch((error) => {
    logError(`Error in main: ${error}`);
});

import { spawn } from 'child_process';
import { db } from '../db/db.js';
import { partida, mensaje } from '../db/schemas/schemas.js';
import { eq, or, and, desc } from 'drizzle-orm';
import { log } from 'console';

const serverPath = './server.js';
const clientPath = './clientes_prueba/client.js';
const client_cancel_pairing_path = './clientes_prueba/client_cancel_pairing.js';
const client_pide_tablas_path = './clientes_prueba/client_pide_tablas.js';
const client_acepta_tablas_path = './clientes_prueba/client_acepta_tablas.js';
const client_rechaza_tablas_path = './clientes_prueba/client_rechaza_tablas.js';
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
        console.log('Partida borrada');
    } catch (error) {
        console.error('Error al borrar la partida:', error);
    }
}


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
        }, 30000);
    }, 3000);
}

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
    }, 3000);
}


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
        logInfo('📋 📋 📋 TEST 3 - ABANDONED GAME REJECTED 📋 📋 📋');
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
    }, 3000);
}

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
        logInfo('📋 📋 📋 TEST 4 - ABANDONED GAME CANCELED 📋 📋 📋');
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
    }, 3000);
}

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
            , 12000);

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
    }, 3000);
}

async function main() {
    logInfo('Starting the tests...');
    await Test1Base();
    await new Promise(resolve => setTimeout(resolve, 33000)); // Wait for Test1Base to fully complete

    await Test2Base();
    await new Promise(resolve => setTimeout(resolve, 18000)); // Wait for Test2Base to fully complete

    await Test3Base();
    await new Promise(resolve => setTimeout(resolve, 18000)); // Wait for Test3Base to fully complete

    await Test4Base();
    await new Promise(resolve => setTimeout(resolve, 18000)); // Wait for Test4Base to fully complete

    await Test5Base();
    await new Promise(resolve => setTimeout(resolve, 33000)); // Wait for Test5Base to fully complete


    await new Promise(resolve => setTimeout(resolve, 1000)); // Small delay to ensure all logs are printed

    if (HayErrores) {
        logError(' ❌ ❌ ❌ There were errors during the tests. ❌ ❌ ❌');
    } else {
        logFinalSuccess('\n 🎆 🎆 🎆 🎉 🎉 🎖️    All tests completed successfully!   🎖️ 🎉 🎉 🎆 🎆 🎆  \n');
    }
}
main().catch((error) => {
    logError(`Error in main: ${error}`);


});

import { spawn } from 'child_process';
import { db } from '../db/db.js';
import { partida } from '../db/schemas/schemas.js';
import { eq, or, and, desc } from 'drizzle-orm';
import { log } from 'console';

const serverPath = './server.js';
const clientPath = './clientes_prueba/client.js';
const User1_name = 'Prueba11';
const User2_name = 'Prueba22';
const User1_password = '12345a';
const User2_password = '12345a';
const User1_id = '6ed5bb5b-93c8-4dc6-ab22-db3046153d7b';
const User2_id = '51bc4c2c-9918-489a-a29c-a8b2fe035558';

const logInfo = (message) => console.log(`ℹ️   [INFO] ${message}`);
const logSuccess = (message) => console.log(`✅   [SUCCESS] ${'='.repeat(40)}\n${message}\n${'='.repeat(40)}`);
const logWarning = (message) => console.log(`⚠️   [WARNING] ${'-'.repeat(40)}\n${message}\n${'-'.repeat(40)}`);
const logError = (message) => console.error(`❌   [ERROR] ${'*'.repeat(40)}\n${message}\n${'*'.repeat(40)}`);

logInfo('Starting the server...');
const server = spawn('node', [serverPath]);

server.stdout.on('data', (data) => {
    console.log(`🖥️   Server: ${data}`);
});

server.stderr.on('data', (data) => {
    logError(`Server Error: ${data}`);
});

setTimeout(() => {
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
                logSuccess('🎮🕹️🎮    Partida data validation completed.    🎮🕹️🎮');
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

import { spawn } from 'child_process';
import axios from 'axios';
import { db } from '../db/db.js';
import { partida } from '../db/schemas/schemas.js';
import { eq, or } from 'drizzle-orm';

// Paths to your server and client scripts
const serverPath = './server.js';
const clientPath = './clientes_prueba/client.js';
const User1_name = 'Prueba11';
const User2_name = 'Prueba22';
const User1_password = '12345a';
const User2_password = '12345a';
const User1_id = '6ed5bb5b-93c8-4dc6-ab22-db3046153d7b';
const User2_id = '51bc4c2c-9918-489a-a29c-a8b2fe035558';
// Launch the server
const server = spawn('node', [serverPath]);

server.stdout.on('data', (data) => {
    console.log(`Server: ${data}`);
});

server.stderr.on('data', (data) => {
    console.error(`Server Error: ${data}`);
});

// Wait a bit to ensure the server is running
setTimeout(() => {
    // Launch the first client
    const client1 = spawn('node', [clientPath, User1_name, User1_password]);

    client1.stdout.on('data', (data) => {
        console.log(`Client1: ${data}`);
    });

    client1.stderr.on('data', (data) => {
        console.error(`Client1 Error: ${data}`);
    });

    let client2 = null;
    setTimeout(() => {
        // Launch the second client
        client2 = spawn('node', [clientPath, User2_name, User2_password]);

        client2.stdout.on('data', (data) => {
            console.log(`Client2: ${data}`);
        });

        client2.stderr.on('data', (data) => {
            console.error(`Client2 Error: ${data}`);
        });

    }, 3000); // Adjust the timeout as needed

    // Wait for clients to finish their tasks
    setTimeout(async () => {
        try {
            // Check the database for the expected data
            //Search for partida with JugadorW and JugadorB as User1 and User2 (they can be in any order)
            const result = await db.select().from(partida).where(
                (partida) => (eq(partida.JugadorW, User1_id).and(eq(partida.JugadorB, User2_id))).or(eq(partida.JugadorW, User2_id).and(eq(partida.JugadorB, User1_id)))
            );

            if (result.length <= 0) {
                console.log('No partida found in the database.');
            }
            else {
                console.log('Partida found in the database:', result);
                if (result[0].JugadorW === User1_id) {
                    console.log('User1 is playing with white pieces.');
                    if (result[0].JugadorB !== User2_id) {
                        console.log('Error: JugadorB does not match User2_id.');
                    }
                    if (result[0].Ganador !== User1_id) {
                        console.log('Error: Ganador does not match User1_id. It is wrong');
                    }
                }
                else {
                    console.log('User2 is playing with white pieces.');
                    if (result[0].JugadorB !== User1_id) {
                        console.log('Error: JugadorB does not match User1_id.');
                    }
                    if (result[0].Ganador !== User2_id) {
                        console.log('Error: Ganador does not match User2_id. It is wrong');
                    }
                }
                console.log('Partida data is correct.');
            }

        } catch (error) {
            console.error('Error checking the database:', error);
        } finally {
            // Kill the server and clients
            server.kill();
            client1.kill();
            client2.kill();
        }
    }, 15000); // Adjust the timeout as needed
}, 3000); // Adjust the timeout as needed
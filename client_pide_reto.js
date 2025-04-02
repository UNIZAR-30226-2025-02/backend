import { io } from 'socket.io-client';
import { Chess } from 'chess.js';
import axios from 'axios';

// Configuración del servidor
// const BASE_URL = 'https://checkmatex-gkfda9h5bfb0gsed.spaincentral-01.azurewebsites.net';
//const BASE_URL = 'https://checkmatex-gkfda9h5bfb0gsed.spaincentral-01.azurewebsites.net';
 const BASE_URL = "http://localhost:3000";
const loginUrl = "http://localhost:3000/login";
let chess = new Chess();
// ID del usuario (pasa este valor como argumento o variable global)

const user = process.argv[2]; 
const password = process.argv[3];
let userId = '';                                        // Se actualizará una vez logueado
const mode = 'Punt_3';                                  // Modo de juego 
let gameId = '';                                        // Se actualizará una vez emparejado
let color = '';                                         // Se actualizará una vez emparejado

const idamigo = 'db0b91ac-46a1-4387-a935-bb93ac59d7e1'  //Prueba111
//const idamigo = '26b206e6-1fef-434e-a229-7cee643cc845'  //Prueba222

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

        lanzarReto(socket); 


    } catch (error) {
        console.error('Error al hacer login o conectar al WebSocket:', error.message);
    }


}

function lanzarReto(socket) {
    

    socket.on('connect', () => {
        console.log('Conectado al servidor WebSocket con ID de socket:', socket.id);
        
        //Esperar 10 segundos antes de enviar la petición de amistad
        setTimeout(() => {
            console.log('Retando...');
            //llamada a evento que lanza un reto
            socket.emit('challenge-friend', { idRetador: userId, idRetado: idamigo, modo: mode });
            console.log('Reto lanzado...');

            
        }, 10000);
        
    });

   

}

// Ejecutar la función de login y luego buscar partida
async function main() {
    await clientLogin(user, password);  // Esperar a que el login se complete
        
}
    
main();  // Ejecutar el programa principal
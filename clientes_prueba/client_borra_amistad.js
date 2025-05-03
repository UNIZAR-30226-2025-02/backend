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

//const idamigo = 'db0b91ac-46a1-4387-a935-bb93ac59d7e1'  //Prueba11
//const idamigo = '26b206e6-1fef-434e-a229-7cee643cc845'  //Prueba22

//const idamigo = '6ed5bb5b-93c8-4dc6-ab22-db3046153d7b'; // Prueba11
const idamigo = '51bc4c2c-9918-489a-a29c-a8b2fe035558'; // Prueba22

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

        esperar(socket); 


    } catch (error) {
        console.error('Error al hacer login o conectar al WebSocket:', error.message);
    }


}

function esperar(socket) {
    
    setTimeout(() => {
        socket.emit('remove-friend', { idJugador: userId, idAmigo: idamigo });
    }, 5000);  // Enviar solicitud al server para borrar amistad tras 5 seg

    socket.on('connect', () => {
        //Hace un consol log de estoy esperando cada 5 segundos
        console.log("Estoy esperando...")
           
    });

    socket.on('friendRequest', (data) => {
        console.log("Solicitud de amistad recibida de " ,  data.idJugador , " a " , data.idAmigo);
        //Por defecto aceptar la solicitud de amistad
        //socket.emit('accept-request', { idJugador: data.idJugador, idAmigo: data.idAmigo });
        setTimeout(() => {
            socket.emit('reject-request', { idJugador: data.idJugador, idAmigo: data.idAmigo });
        }, 3000);  // Rechazar amistad tras 3seg
    });

    socket.on('friendRemoved', (data) => {
        console.log("El jugador " ,  data.idJugador , " ha eliminado la amistad contigo" );
    
    });

    socket.on('challengeSent', (data) => {
        console.log(`Reto enviado de ${data.idRetador} a ${data.idRetado}`);
        // Por defecto aceptar el reto
        //socket.emit('accept-challenge', { idRetador: data.idRetador, idRetado: data.idRetado, modo: data.modo });
        setTimeout(() => {
            socket.emit('reject-challenge', { idRetador: data.idRetador, idRetado: data.idRetado, modo: data.modo });
        }, 3000);  // Rechazar reto tras 3seg
    });


    socket.on('friendRequestAccepted', (data) => {
        console.log(`Solicitud de amistad aceptada de ${data.idAmigo} a ${data.idJugador}`);
    });

    socket.on('friendRequestRejected', (data) => {
        console.log(`Solicitud de amistad rechazada de ${data.idAmigo} a ${data.idJugador}`);
    });

}

// Ejecutar la función de login y luego buscar partida
async function main() {
    await clientLogin(user, password);  // Esperar a que el login se complete
        
}
    
main();  // Ejecutar el programa principal
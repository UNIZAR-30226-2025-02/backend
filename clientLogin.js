import axios from 'axios';
import io from 'socket.io-client';

const loginUrl = 'http://localhost:3000/login';     // URL de tu API de login
const logoutUrl = 'http://localhost:3000/logout';   // URL de tu API de logout
const socketUrl = 'http://localhost:3000';          // URL del servidor WebSocket

let socket;
// Función para hacer login y luego conectarse al WebSocket
async function clientLogin(username, password) {
  try {
    // Realiza la petición POST para hacer login
    const response = await axios.post(loginUrl, {
      NombreUser: username,
      Contrasena: password,
    });

    // Obtiene el token de la respuesta
    const token = response.data.accessToken;

    console.log('Login exitoso. Token recibido:', token);

    // Conectar al servidor WebSocket usando el token
    socket = io(socketUrl, {
      query: { token: token }  // Enviar el token a través del query en la conexión
    });

    // Cuando el socket se conecte correctamente
    socket.on('connect', () => {
      console.log('Conexión WebSocket establecida.');
    });

    socket.on('disconnect', () => {
      console.log('Desconectado del servidor WebSocket');
    });

  } catch (error) {
    console.error('Error al hacer login o conectar al WebSocket:', error.message);
  }
}

async function clientLogout(username) {
    try {
        // Realiza la petición POST para hacer login
        await axios.post(logoutUrl, {
            NombreUser: username,
        });
    
        console.log('Logout exitoso. Adiós!');
        socket.disconnect();
    } catch (error) {
        console.error('Error al hacer logout:', error.message);
    }
}

// Intenta hacer login y conectarse con un usuario y contraseña
const username = 'sammy';  // Sustituir con el nombre de usuario
const password = '123456';  // Sustituir con la contraseña

clientLogin(username, password);
setTimeout(() => {
  clientLogout(username);
}, 5000); // Desconectar después de 5 segundos

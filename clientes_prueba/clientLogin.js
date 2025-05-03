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
    
    socket.on('ping', (data) => {
      console.log('Ping recibido: ' + data.message);
      socket.emit('pong', { message: 'Pong!' });
    });

    socket.on('force-logout', (data) => {
      console.log('Sesión abierta en otro dispositivo, cerrando sesion:', data.message);
      socket.disconnect();
    });
    
  } catch (error) {
    console.error('Error al hacer login o conectar al WebSocket:', error.message);
  }
}

async function clientLogout(username) {
  try {
    // Realiza la petición POST para hacer logout
    await axios.post(logoutUrl, {
        NombreUser: username,
    });

    if (socket.connected) {
      console.log('El servidor no ha forzado el logout, desconectando...');
      socket.disconnect();
    }

  } catch (error) {
      console.error('Error al hacer logout:', error.message);
  }
}

// Intenta hacer login y conectarse con un usuario y contraseña
const username = 'Prueba22';  // Sustituir con el nombre de usuario
const password = '12345a';  // Sustituir con la contraseña

await clientLogin(username, password);

setTimeout(() => {
  clientLogout(username);
}, 10000);  // Desconectar después de 10 segundos

# Backend – Chess Online API
Este repositorio contiene el backend del proyecto de ajedrez en línea, desarrollado con Node.js, Express y WebSockets mediante socket.io.

## Project Structure
backend/
├── app.js                         # Configura middlewares y define rutas HTTP principales
├── server.js                      # Inicia el servidor y gestiona los sockets
├── package.json                   # Dependencias 
├── .env                           # Variables de entorno 
├── LICENSE                        # Licencia del proyecto
└── src/
    ├── login/                     # Autenticación y gestión de usuarios
    ├── db/db_requests.js/         # Consultas a base de datos 
    ├── rooms/                     # Lógica de partidas en tiempo real 
    ├── chat/                      # Chat entre usuarios
    ├── friendship/                # Sistema de amigos y desafíos
    └── cronjobs/                  # Tareas programadas 

## Convenciones de Código
Se usa JavaScript moderno.

El proyecto está modularizado en subdirectorios por funcionalidad (login, chat, rooms, etc.).

Se sigue el patrón MVC de forma flexible.

Nombres de archivos, funciones y variables están en inglés para mantener consistencia.
Comentarios y explicaciones están en español.

## Dependencias
Las dependencias principales incluyen:

express – Framework HTTP

socket.io – Comunicación en tiempo real con WebSockets

cors, dotenv, node-schedule – Middleware, configuración y cron jobs

Instala las dependencias con:

npm install

## Cómo Ejecutar el Servidor
Asegúrate de tener Node.js instalado.

Clona el repositorio y navega al directorio backend/.

Crea y configura tu archivo .env (ver sección siguiente).

Ejecuta el servidor:

node server.js

## Configuración del Entorno
Este backend depende de un archivo .env para definir variables como el puerto y la conexión a base de datos. 
El archivo .env no está incluido por razones de seguridad. Solicita uno al equipo si lo necesitas.

## WebSockets
El backend implementa comunicación en tiempo real con socket.io. Algunas funcionalidades cubiertas:

Buscar o crear partidas en vivo

Mover piezas y rendirse

Solicitar o aceptar tablas

Gestión de desconexiones

Chat entre usuarios durante la partida

Desafíos entre amigos

## Cron Jobs
Se ejecutan tareas automatizadas mediante node-schedule, como:

Eliminar usuarios invitados inactivos

## Licencia
Este proyecto está licenciado bajo los términos especificados en el archivo LICENSE.


import io from "socket.io-client";

// Parámetros del usuario
const username = process.argv[2] || "aceptador";
const password = process.argv[3] || "123456";

// URL del servidor
const SERVER_URL = "http://localhost:3000";

// Login para obtener el token JWT
async function login() {
    const response = await fetch(`${SERVER_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    });

    const data = await response.json();
    if (!data.token) throw new Error("Error en la autenticación");
    return data.token;
}

(async () => {
    try {
        const token = await login();
        console.log(`Usuario ${username} autenticado.`);

        // Conexión al WebSocket con el token
        const socket = io(SERVER_URL, { query: { token } });

        socket.on("connect", () => {
            console.log("Conectado al servidor.");
            socket.emit("find-game");
        });

        socket.on("game-start", (gameData) => {
            console.log("Partida encontrada!", gameData);

            // Simular movimiento tras 2 segundos
            setTimeout(() => {
                const move = { from: "e7", to: "e5" }; // Movimiento de ejemplo
                socket.emit("make-move", move);
                console.log("Movimiento enviado:", move);
            }, 2000);
        });

        socket.on("draw-offer", () => {
            console.log("Oferta de tablas recibida. Aceptando...");
            socket.emit("draw-accept");
        });

        socket.on("game-end", (result) => {
            console.log("La partida ha terminado en tablas.", result);
            socket.disconnect();
        });

        socket.on("disconnect", () => console.log("Desconectado del servidor."));
    } catch (error) {
        console.error("Error:", error.message);
    }
})();

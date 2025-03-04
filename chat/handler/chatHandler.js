import { saveMessage, fetchMessages, deleteMessage } from '../controller/chat.js';

export async function chatHandler(socket) {
    // Envío de mensaje por parte de uno de los jugadores (y notificación al resto)
    socket.on('send-message', async (data) => {
        await saveMessage(data);
    });

    // Eliminación de mensaje por parte de uno de los jugadores (y notificación al resto)
    socket.on('delete-message', async (data) => {
        await deleteMessage(data);
    });
    
    // Petición para recuperar toda la conversación entre los jugadores de una partida
    socket.on('fetch-msgs', async (data) => {
        const messages = await fetchMessages(data);
        //socket.emit('chat-history', messages);
        console.log(messages)
    });

    socket.on('new-message', async (data) => {
        console.log("Nuevo mensaje recibido!" + JSON.stringify(data))
    });

    socket.on('message-deleted', async (data) => {
        console.log("Mensaje eliminado!" + JSON.stringify(data))
    });
}
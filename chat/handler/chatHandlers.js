import { saveMessage,
         deleteMessage,
         fetchMessages,
         notifyMessageDeleted,
         notifyNewMessage } from '../controller/chat.js';

export const handleChatEvents = (io, socket) => {
    socket.on('disconnect', () => {
        console.log("Usuario desconectado")
    })

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

    // Notificación de que ha habido un nuevo mensaje en la partida
    socket.on('new-message', async (data) => {
        await notifyNewMessage(data);
    });

    // Notificación de que se ha eliminado un mensaje en la partida
    socket.on('message-deleted', async (data) => {
        await notifyMessageDeleted(data);
    });
};
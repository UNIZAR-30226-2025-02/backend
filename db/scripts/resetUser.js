import { usuario } from '../schemas/schemas.js';
import { partida } from '../schemas/schemas.js';
import { db } from '../db.js';
import { eq, or } from 'drizzle-orm';

console.log("Reseteando usuario " + process.argv[2]);

await db.update(usuario).set({
    EstadoPartida: "unlogged",
    estadoUser: "unlogged"
}).where(eq(usuario.NombreUser, process.argv[2]));
console.log("Modificado");

const users = await db.select().from(usuario).where(eq(usuario.NombreUser, process.argv[2]));
console.log("Modificado usuario " + JSON.stringify(users) + "\n\n\n\n");

let user = null;

if (users.length > 0) {
    user = users[0];
    console.log("Usuario particular " + JSON.stringify(user) + "\n\n\n\n");
}
const id = user.id;
console.log("ID del usuario: " + id);
await db.delete(partida)
    .where(eq(partida.JugadorW, id));

await db.delete(partida)
    .where(eq(partida.JugadorB, id));
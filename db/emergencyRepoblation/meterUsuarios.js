import { createClient } from '@libsql/client';
import fs from 'fs';

const db = createClient({ url: "libsql://checkmatex-checkmatex.turso.io", authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NDA3NTEyNTksImlkIjoiOGM3MjA3ZWEtOGQ3MC00ZGEzLWE1YjYtZTIzMWU5OWE4NDBmIn0.EywA3DmY9SYTycoB8Q2X0RWPKPC049ityhUcYFVqOhZ9PBM8hQbJ4yjg8EbRVE1nKKW37gEJwmkfkT6dxujtAw" });

fs.readFile("C:/Users/hugol/Downloads/export.csv", "utf8", async (err, data) => {
    if (err) throw err;

    const lines = data.split("\n").slice(1); // Omitir encabezado
    for (const line of lines) {
        const [id, created_at, FotoPerfil, NombreUser, Correo, Contrasena, EstadoPartida, Amistades, Punt_3, Punt_5, Punt_10, Punt_30, Punt_3_2, Punt_5_10, correoVerificado, estadoUser, tokenVerificacion, tokenPasswd, totalGames, totalWins, totalLosses, totalDraws] = line.split(",");
        await db.execute(`INSERT INTO usuario (id,created_at,FotoPerfil,NombreUser,Correo,Contrasena,EstadoPartida,Amistades,Punt_3,Punt_5,Punt_10,Punt_30,Punt_3_2,Punt_5_10,correoVerificado,estadoUser,tokenVerificacion,tokenPasswd,totalGames,totalWins,totalLosses,totalDraws) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [id, created_at, FotoPerfil, NombreUser, Correo, Contrasena, EstadoPartida, Amistades, Punt_3, Punt_5, Punt_10, Punt_30, Punt_3_2, Punt_5_10, correoVerificado, estadoUser, tokenVerificacion, tokenPasswd,
            totalGames, totalWins, totalLosses, totalDraws]);
        console.log("Datos importados correctamente.");
    }
});

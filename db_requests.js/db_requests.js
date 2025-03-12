import { db } from '../db/db.js';
import { eq, like, or, desc } from 'drizzle-orm';
import { usuario } from '../db/schemas/schemas.js';
import { partida } from '../db/schemas/schemas.js';

export async function buscarUsuarioPorUser(req, res) {
    const user = req.query.NombreUser;
    try {
        const resultado = await db.select().from(usuario).where(like(usuario.NombreUser, `%${user}%`)); // % busca en cualquier parte del texto
        res.json(resultado); // Devolver los usuarios encontrados
    } catch (error) {
        res.status(500).json({ error: 'Error al buscar usuario' });
    }
}

export async function getUserInfo(req, res) {
    try {
        const userId = req.query.id;
        if (!userId) {
            res.status(400).json({ error: 'Faltan campos' });
            return;
        }
        const usuarios = await db.select().from(usuario).where(eq(usuario.id, userId));
        if (usuarios.length === 0) {
            res.status(400).json({ error: 'Usuario no encontrado' });
            return;
        }
        const user = usuarios[0];
        // Comprobar si el correo del usuario ha sido verificado y el usuario está logueado
        if (user.correoVerificado === 'no') {
            res.status(400).json({ error: 'Correo no verificado. Por favor, verifica tu correo antes de iniciar sesión' });
            return;
        }
        if (user.estadoUser === 'unlogged') {
            res.status(400).json({ error: 'Usuario no logueado. Inicie sesión para ver su información' });
            return;
        }
        const { Contrasena, tokenPasswd, tokenVerificacion, ...publicUser } = user;
        res.send(publicUser);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener la información del usuario' });
    }
}

export async function buscarPartidasDeUsuario(req, res) {
    const id = req.query.id;
    try {
        // Usamos 'or' directamente en la cláusula where
        const partidas = await db.select().from(partida)
            .where(or(eq(partida.JugadorW, id), eq(partida.JugadorB, id))); // Usamos 'or' correctamente
        res.json(partidas); // Devolver las partidas encontradas
    } catch (error) {
        res.status(500).json({ error: 'Error al buscar las partidas del usuario' });
    }
}

export async function buscarUlt5PartidasDeUsuario(req, res) {
    const id = req.query.id;
    try {
        const partidas = await db.select().from(partida)
            .where(or(eq(partida.JugadorW, id), eq(partida.JugadorB, id)))
            .orderBy(desc(partida.created_at))
            .limit(5);
        res.json(partidas); // Devolver las últimas 5 partidas
    } catch (error) {
        res.status(500).json({ error: 'Error al buscar las últimas 5 partidas del usuario' });
    }
}

export async function buscarPartida(req, res) {
    const id = req.query.id;
    try {
        const partidaEncontrada = await db.select().from(partida).where(eq(partida.id, id));
        res.json(partidaEncontrada); // Devolver la partida encontrada
    } catch (error) {
        res.status(500).json({ error: 'Error al buscar la partida' });
    }
}



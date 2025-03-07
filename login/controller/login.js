import { db } from '../../db/db.js';
import { usuario } from '../../db/schemas/schemas.js';
import { eq } from 'drizzle-orm';
import crypto from 'node:crypto';
import bcrypt from 'bcrypt';

export async function crearUsuario(req, res) {
    try {
        if (!req.body.NombreUser || !req.body.NombreCompleto || !req.body.Apellidos || !req.body.Correo || !req.body.Contrasena) {
            throw new Error('Faltan campos');
        }

        // Verificar si el usuario ya existe
        const usuarioExistente = await db.select().from(usuario).where(eq(usuario.NombreUser, req.body.NombreUser));
        if (usuarioExistente.length > 0) {
            throw new Error('El usuario ya existe');
        }

        // Verificar si el correo ya está en uso
        const correoExistente = await db.select().from(usuario).where(eq(usuario.Correo, req.body.Correo));
        if (correoExistente.length > 0) {
            throw new Error('El correo ya está en uso');
        }

        if (req.body.Contrasena.length < 4) {
            throw new Error('La contraseña debe tener al menos 4 caracteres');
        }
        if (req.body.NombreUser.length < 4) {
            throw new Error('El nombre de usuario debe tener al menos 4 caracteres');
        }

        // Hashear la contraseña antes de almacenarla
        const hashedPassword = await bcrypt.hash(req.body.Contrasena, 10);
        // Crear un identificador único para el usuario
        const id = crypto.randomBytes(16).toString('hex');
        await db.insert(usuario).values({
            id: id,
            FotoPerfil: 'none',
            NombreUser: req.body.NombreUser,
            NombreCompleto: req.body.NombreCompleto,
            Apellidos: req.body.Apellidos,
            Correo: req.body.Correo,
            Contrasena: hashedPassword
        });

        res.send({ mensaje: 'Usuario creado correctamente' });
    } catch (error) {
        console.log(error.message);
        res.status(400).send(error.message);
    }
}

export async function login(req, res) {
    try {
        if (!req.body.NombreUser || !req.body.Contrasena) {
            res.status(400).send('Faltan campos');
            return;
        }

        const usuarios = await db.select().from(usuario).where(eq(usuario.NombreUser, req.body.NombreUser));
        if (usuarios.length === 0) {
            res.status(400).send('Usuario no encontrado');
            return;
        }

        const user = usuarios[0];

        // Comparar la contraseña hasheada con la ingresada
        const isMatch = await bcrypt.compare(req.body.Contrasena, user.Contrasena);
        if (!isMatch) {
            res.status(400).send('Contraseña incorrecta');
            return;
        }

        // Actualizar el estado de sesión
        await db.update(usuario).set({ EstadoSesion: 'logueado' }).where(eq(usuario.NombreUser, req.body.NombreUser));

        const { Contrasena, ...publicUser } = user;
        res.send(publicUser);
    } catch (error) {
        res.status(500).send('Error al loguear el usuario');
    }
}

export async function logout(req, res) {
    try {
        await db.update(usuario).set({ EstadoSesion: 'deslogueado' }).where(eq(usuario.NombreUser, req.body.NombreUser));
        res.send('Usuario deslogueado correctamente');
    } catch (error) {
        res.status(500).send('Error al desloguear el usuario');
    }
}

export async function editUser(req, res) {
    try {
        if (!req.body.NombreUser || !req.body.NombreCompleto || !req.body.Apellidos || !req.body.Correo || !req.body.Contrasena) {
            res.status(400).send('Faltan campos');
            return;
        }
        if (req.body.Contrasena.length < 4) {
            res.status(400).send('La contraseña debe tener al menos 4 caracteres');
            return;
        }
        if (req.body.NombreUser.length < 4) {
            res.status(400).send('El nombre de usuario debe tener al menos 4 caracteres');
            return;
        }

        const hashedPassword = await bcrypt.hash(req.body.Contrasena, 10);

        await db.update(usuario)
            .set({
                FotoPerfil: req.body.FotoPerfil || 'none',
                NombreCompleto: req.body.NombreCompleto,
                Apellidos: req.body.Apellidos,
                Correo: req.body.Correo,
                Contrasena: hashedPassword
            })
            .where(eq(usuario.NombreUser, req.body.NombreUser));

        res.send({ mensaje: 'Usuario editado correctamente' });
    } catch (error) {
        res.status(500).send('Error al editar el usuario');
    }
}



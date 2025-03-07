import { db } from '../../db/db.js';
import { usuario } from '../../db/schemas/schemas.js';
import { eq } from 'drizzle-orm';
import crypto, { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';


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
        const id = uuidv4();
        // Insertar el usuario en la base de datos
        await db.insert(usuario).values({
            id: id,
            FotoPerfil: "none",
            NombreUser: req.body.NombreUser,
            NombreCompleto: req.body.NombreCompleto,
            Apellidos: req.body.Apellidos,
            Correo: req.body.Correo,
            Contrasena: hashedPassword,
            estadoUser: "unlogged",
            correoVerificado: "no",
            created_at: new Date().toISOString()
        });
        res.send({ mensaje: 'Usuario creado correctamente' });
    } catch (error) {
        console.log(error.message);
        res.status(400).send("Error al crear el usuario");
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

        // Comprobar si el correo del usuario ha sido verificado
        // if (user.correoVerificado === 'no') {
        //     res.status(400).send('Correo no verificado');
        //     return;
        // }

        // Actualizar el estado de sesión
        await db.update(usuario).set({ estadoUser: 'logged' }).where(eq(usuario.NombreUser, req.body.NombreUser));
        const { Contrasena, ...publicUser } = user;
        // Establecer en user el estado de sesión
        user.estadoUser = 'logged';
        res.send(publicUser);
    } catch (error) {
        res.status(500).send('Error al loguear el usuario');
    }
}

export async function logout(req, res) {
    try {
        if (!req.body.NombreUser) {
            res.status(400).send('Faltan campos');
            return;
        }

        await db.update(usuario).set({ estadoUser: 'unlogged' }).where(eq(usuario.NombreUser, req.body.NombreUser));
        res.send('Usuario deslogueado correctamente');
    } catch (error) {
        res.status(500).send('Error al desloguear el usuario');
    }
}

export async function editUser(req, res) {
    try {
        if (!req.body.NombreUser || !req.body.NombreCompleto || !req.body.Apellidos || !req.body.Contrasena) {
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

        // Buscar el usuario a editar
        const usuarios = await db.select().from(usuario).where(eq(usuario.NombreUser, req.body.NombreUser));
        if (usuarios.length === 0) {
            res.status(400).send('Usuario no encontrado');
            return;
        }
        const user = usuarios[0];

        if (user.estadoUser === 'unlogged') {
            res.status(400).send('Usuario no logueado. Inicie sesión para editar su perfil');
            return;
        }
        const hashedPassword = await bcrypt.hash(req.body.Contrasena, 10);

        await db.update(usuario)
            .set({
                FotoPerfil: req.body.FotoPerfil || 'none',
                NombreCompleto: req.body.NombreCompleto,
                Apellidos: req.body.Apellidos,
                Contrasena: hashedPassword
            })
            .where(eq(usuario.NombreUser, req.body.NombreUser))
        user.FotoPerfil = req.body.FotoPerfil || 'none';
        user.NombreCompleto = req.body.NombreCompleto;
        user.Apellidos = req.body.Apellidos;
        const { Contrasena, ...publicUser } = user;
        res.send({ mensaje: 'Usuario editado correctamente', publicUser });
    } catch (error) {
        res.status(500).send('Error al editar el usuario');
    }
}



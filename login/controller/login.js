import { db } from '../../db/db.js';
import { usuario } from '../../db/schemas/schemas.js';
import { eq } from 'drizzle-orm';
import crypto, { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { Console } from 'node:console';


export async function crearUsuario(req, res) {
    try {
        const NombreUser = req.body.NombreUser;
        const NombreCompleto = req.body.NombreCompleto;
        const Apellidos = req.body.Apellidos;
        const Correo = req.body.Correo;
        const Contrasena = req.body.Contrasena;

        if (!NombreUser || !NombreCompleto || !Apellidos || !Correo || !Contrasena) {
            throw new Error('Faltan campos');
        }
        // Verificar si el usuario ya existe
        const usuarioExistente = await db.select().from(usuario).where(eq(usuario.NombreUser, NombreUser));
        if (usuarioExistente.length > 0) {
            throw new Error('El usuario ya existe');
        }
        // Verificar si el correo ya está en uso
        const correoExistente = await db.select().from(usuario).where(eq(usuario.Correo, Correo));
        if (correoExistente.length > 0) {
            throw new Error('El correo ya está en uso');
        }
        if (Contrasena.length < 4) {
            throw new Error('La contraseña debe tener al menos 4 caracteres');
        }
        if (NombreUser.length < 4) {
            throw new Error('El nombre de usuario debe tener al menos 4 caracteres');
        }

        // Hashear la contraseña antes de almacenarla
        const hashedPassword = await bcrypt.hash(Contrasena, 10);
        // Crear un identificador único para el usuario
        const id = uuidv4();
        // Insertar el usuario en la base de datos
        await db.insert(usuario).values({
            id: id,
            FotoPerfil: "none",
            NombreUser: NombreUser,
            NombreCompleto: NombreCompleto,
            Apellidos: Apellidos,
            Correo: Correo,
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
        const NombreUser = req.body.NombreUser;
        const Contrasegna = req.body.Contrasena;

        if (!NombreUser || !Contrasegna) {
            res.status(400).send('Faltan campos');
            return;
        }

        const usuarios = await db.select().from(usuario).where(eq(usuario.NombreUser, NombreUser));
        if (usuarios.length === 0) {
            res.status(400).send('Usuario no encontrado');
            return;
        }

        const user = usuarios[0];

        // Comparar la contraseña hasheada con la ingresada
        const isMatch = await bcrypt.compare(Contrasegna, user.Contrasena);
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
        await db.update(usuario).set({ estadoUser: 'logged' }).where(eq(usuario.NombreUser, NombreUser));
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
        const NombreUser = req.body.NombreUser;
        if (!NombreUser) {
            res.status(400).send('Faltan campos');
            return;
        }

        await db.update(usuario).set({ estadoUser: 'unlogged' }).where(eq(usuario.NombreUser, NombreUser));
        res.send('Usuario deslogueado correctamente');
    } catch (error) {
        res.status(500).send('Error al desloguear el usuario');
    }
}

export async function editUser(req, res) {
    try {
        const NombreUser = req.body.NombreUser;
        const NombreCompleto = req.body.NombreCompleto;
        const Apellidos = req.body.Apellidos;
        const Contrasegna = req.body.Contrasena;
        const FotoPerfil = !req.body.FotoPerfil ? 'none' : req.body.FotoPerfil;

        if (!NombreUser || !NombreCompleto || !Apellidos || !Contrasegna || !FotoPerfil) {
            res.status(400).send('Faltan campos');
            return;
        }
        if (Contrasegna.length < 4) {
            res.status(400).send('La contraseña debe tener al menos 4 caracteres');
            return;
        }
        if (NombreUser.length < 4) {
            res.status(400).send('El nombre de usuario debe tener al menos 4 caracteres');
            return;
        }
        if (NombreCompleto.length < 4) {
            res.status(400).send('El nombre completo debe tener al menos 4 caracteres');
            return;
        }
        if (Apellidos.length < 4) {
            res.status(400).send('Los apellidos deben tener al menos 4 caracteres');
            return;
        }
        if (FotoPerfil.length < 4) {
            res.status(400).send('La foto de perfil debe tener al menos 4 caracteres');
            return;
        }

        // Buscar el usuario a editar
        const usuarios = await db.select().from(usuario).where(eq(usuario.NombreUser, NombreUser));
        if (usuarios.length === 0) {
            res.status(400).send('Usuario no encontrado');
            return;
        }
        const user = usuarios[0];
        if (user.estadoUser === 'unlogged') {
            res.status(400).send('Usuario no logueado. Inicie sesión para editar su perfil');
            return;
        }
        const hashedPassword = await bcrypt.hash(Contrasegna, 10);

        await db.update(usuario)
            .set({
                FotoPerfil: FotoPerfil,
                NombreCompleto: NombreCompleto,
                Apellidos: Apellidos,
                Contrasena: hashedPassword
            })
            .where(eq(usuario.NombreUser, NombreUser))
        user.FotoPerfil = FotoPerfil;
        user.NombreCompleto = NombreCompleto;
        user.Apellidos = Apellidos;
        const { Contrasena, ...publicUser } = user;
        res.send({ mensaje: 'Usuario editado correctamente', publicUser });
    } catch (error) {
        res.status(500).send('Error al editar el usuario');
    }
}



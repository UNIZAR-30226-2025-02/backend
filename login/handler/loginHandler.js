import { Server } from 'socket.io';
import http from 'http';
import { app } from './app.js';
import { db } from '../../db/db.js';
import { usuario } from '../../db/schemas/usuario.js';
import { crearUsuario } from '../controller/login.js';



app.post('/register', async (req, res) => {
    await crearUsuario(req, res);
});

app.post('/login', async (req, res) => {
    await login(req, res);
});

app.post('/logout', async (req, res) => {
    await logout(req, res);
});

app.post('/editUser', async (req, res) => {
    await editUser(req, res);
});
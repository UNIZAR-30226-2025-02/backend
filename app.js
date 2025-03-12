import express from 'express';
import cors from 'cors';
import { crearUsuario, login, logout, editUser, verifyEmail, resendVerificationEmail, sendPasswdReset, resetPasswd } from './login/controller/login.js';
import { buscarUsuarioPorUser, buscarPartidasDeUsuario, buscarUlt5PartidasDeUsuario, buscarPartida } from './db_requests.js/db_requests.js';

export const app = express()

app.set('port', process.env.PORT || 3000)
app.set('trust proxy', true)

app.use(cors())
// Middleware para parsear JSON
app.use(express.json());

// Ruta de prueba
app.get("/", (req, res) => {
    res.send("Servidor de Ajedrez en Línea Activo!");
});



// ########## Usuario, inicio de sesión y autenticación ##########
app.post('/register', async (req, res) => {
    await crearUsuario(req, res);
});

app.post('/resendVerification', async (req, res) => {
    await resendVerificationEmail(req, res);
});

app.get('/verificar', async (req, res) => {
    await verifyEmail(req, res);
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

app.post('/sendPasswdReset', async (req, res) => {
    await sendPasswdReset(req, res);
});

app.post('/tryResetPasswd', async (req, res) => {
    await resetPasswd(req, res);
});


// ########## Consultas Información ##########
app.get('/buscarUsuarioPorUser', async (req, res) => {
    await buscarUsuarioPorUser(req, res);
});

app.get('/buscarPartidasDeUsuario', async (req, res) => {
    await buscarPartidasDeUsuario(req, res);
});

app.get('/buscarUlt5PartidasDeUsuario', async (req, res) => {
    await buscarUlt5PartidasDeUsuario(req, res);
});

app.get('/buscarPartida', async (req, res) => {
    await buscarPartida(req, res);
});


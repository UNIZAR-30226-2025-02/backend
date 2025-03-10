import express from 'express';
import cors from 'cors';
import { crearUsuario, login, logout, editUser, verifyEmail, resendVerificationEmail } from './login/controller/login.js';


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


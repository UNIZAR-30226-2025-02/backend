import express from 'express';
import cors from 'cors';

// Importar funciones del módulo de autenticación
import {
    crearUsuario, login, logout, editUser, verifyEmail,
    resendVerificationEmail, sendPasswdReset, resetPasswd, crearInvitado, borrarInvitado
}
    from './src/login/login.js';

// Importar funciones del módulo de consultas a base de datos
import {
    buscarUsuarioPorUser, buscarPartidasDeUsuario, buscarUlt10PartidasDeUsuario,
    buscarUlt10PartidasDeUsuarioPorModo, buscarPartida, getUserInfo, buscarAmigos,
    rankingPorModo, rankingUserPorModo
}
    from './src/db/db_requests.js/db_requests.js';

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

app.post('/crearInvitado', async (req, res) => {
    await crearInvitado(req, res);
});

app.post('/borrarInvitado', async (req, res) => {
    await borrarInvitado(req, res);
});




// ########## Consultas Información ##########
app.get('/buscarUsuarioPorUser', async (req, res) => {
    await buscarUsuarioPorUser(req, res);
});

app.get('/buscarPartidasDeUsuario', async (req, res) => {
    await buscarPartidasDeUsuario(req, res);
});

app.get('/buscarUlt10PartidasDeUsuario', async (req, res) => {
    await buscarUlt10PartidasDeUsuario(req, res);
});

app.get('/buscarUlt10PartidasDeUsuarioPorModo', async (req, res) => {
    await buscarUlt10PartidasDeUsuarioPorModo(req, res);
});


app.get('/buscarPartida', async (req, res) => {
    await buscarPartida(req, res);
});

app.get('/getUserInfo', async (req, res) => {
    await getUserInfo(req, res);
});

app.get('/buscarAmigos', async (req, res) => {
    await buscarAmigos(req, res);
});

app.get(('/rankingPorModo'), async (req, res) => {
    await rankingPorModo(req, res);
});

app.get(('/rankingUserPorModo'), async (req, res) => {
    await rankingUserPorModo(req, res);
});


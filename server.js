
// PRIMERAS PRUEEBAS DEL SERVIDOR CON NODEJS Y EXPRESS
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Ruta de prueba
app.get("/", (req, res) => {
    res.send("Servidor de Ajedrez en Línea Activo!");
});

//PONER VARIABLES DE ENTORNO EN .ENV DEL DIRECTORIO RAIZ DEL PROYECTO

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
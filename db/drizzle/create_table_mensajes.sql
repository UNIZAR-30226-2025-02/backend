-- Tabla: Mensajes
CREATE TABLE if NOT EXISTS Mensajes (
    id_mensaje SERIAL PRIMARY KEY,
    id_partida INT REFERENCES Partidas(id_partida) ON DELETE CASCADE,
    id_usuario INT REFERENCES Usuarios(id_usuario) ON DELETE CASCADE,
    mensaje TEXT NOT NULL,
    fecha_envio TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
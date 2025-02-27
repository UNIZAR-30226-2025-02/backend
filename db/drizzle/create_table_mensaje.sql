-- Tabla: Mensaje
CREATE TABLE if NOT EXISTS Mensaje (
    id_mensaje SERIAL PRIMARY KEY,
    id_partida INT REFERENCES Partida(id_partida) ON DELETE CASCADE,
    id_usuario INT REFERENCES Usuario(id_usuario) ON DELETE CASCADE,
    mensaje TEXT NOT NULL,
    fecha_envio TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
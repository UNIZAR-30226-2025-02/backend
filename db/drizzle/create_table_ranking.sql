-- Tabla: Ranking
CREATE TABLE IF NOT EXISTS Ranking (
    id SERIAL PRIMARY KEY,
    id_usuario INT REFERENCES Usuario(id) ON DELETE CASCADE,
    modo TEXT NOT NULL,
    puntuacion INT NOT NULL DEFAULT 0,
    posicion INT NOT NULL DEFAULT 0  -- Se actualizará con el trigger
);
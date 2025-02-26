-- Tabla: Ranking
CREATE TABLE Ranking (
    id SERIAL PRIMARY KEY,
    id_usuario INT REFERENCES Usuario(id) ON DELETE CASCADE,
    modo TEXT NOT NULL,
    puntuacion INT NOT NULL DEFAULT 0,
    posicion INT GENERATED ALWAYS AS 
        (RANK() OVER (PARTITION BY modo ORDER BY puntuacion DESC)) STORED
);
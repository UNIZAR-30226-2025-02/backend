-- Tabla: Partida
CREATE TABLE if NOT EXISTS Partida (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    JugadorW INT REFERENCES Usuario(id),
    JugadorB INT REFERENCES Usuario(id),
    Modo TEXT,
    Ganador INT REFERENCES Usuario(id),
    PGN TEXT,
    Variacion_JW INT,
    Variacion_JB INT
);



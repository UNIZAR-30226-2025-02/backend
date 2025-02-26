-- Tabla: Amistad
CREATE TABLE if NOT EXISTS Amistad (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    Jugador1 INT REFERENCES Usuario(id),
    Jugador2 INT REFERENCES Usuario(id),
    HistorialAmistad INT,
    Retos INT
);



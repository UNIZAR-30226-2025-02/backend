-- Tabla: Apertura
CREATE TABLE if NOT EXISTS Apertura (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    Nombre_Aper TEXT NOT NULL UNIQUE,
    PGN_Aper TEXT
);
-- Tabla: Apertura
CREATE TABLE if NOT EXISTS Apertura (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    Nombre_Aper TEXT NOT NULL,
    PGN_Aper TEXT
);
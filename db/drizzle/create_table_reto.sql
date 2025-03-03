-- Tabla: Reto
CREATE TABLE if NOT EXISTS Reto (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    Retador INT REFERENCES Usuario(id),
    Retado INT REFERENCES Usuario(id),
    Activo BOOLEAN DEFAULT TRUE,
    Pendiente BOOLEAN DEFAULT TRUE,
    Modo TEXT);
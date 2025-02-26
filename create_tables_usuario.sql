-- Tabla: Usuario
CREATE TABLE Usuario (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FotoPerfil BYTEA,
    NombreUser TEXT NOT NULL UNIQUE,
    NombreCompleto TEXT,
    Apellidos TEXT,
    Correo TEXT UNIQUE,
    Edad INT,
    Contrasena TEXT NOT NULL,
    EstadoPartida TEXT,
    Amistades INT,
    Punt_3 INT,
    Punt_5 INT,
    Punt_10 INT,
    Punt_30 INT,
    Punt_3_2 INT,
    Punt_5_10 INT
);

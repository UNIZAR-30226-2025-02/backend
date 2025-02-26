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

-- Tabla: Apertura
CREATE TABLE Apertura (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    Nombre_Aper TEXT NOT NULL,
    PGN_Aper TEXT
);

-- Tabla: Partidas
CREATE TABLE Partidas (
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

-- Tabla: Amistad
CREATE TABLE Amistad (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    Jugador1 INT REFERENCES Usuario(id),
    Jugador2 INT REFERENCES Usuario(id),
    HistorialAmistad INT,
    Retos INT
);

-- Tabla: Reto
CREATE TABLE Reto (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    Retador INT REFERENCES Usuario(id),
    Retado INT REFERENCES Usuario(id),
    Activo BOOLEAN DEFAULT TRUE,
    Pendiente BOOLEAN DEFAULT TRUE
);

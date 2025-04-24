import { db } from '../db.js';
import { apertura } from '../schemas/schemas.js';

const aperturas = [
    { id: 1, Nombre_Aper: "Apertura Española o Ruy López", PGN: "1. e4 e5 2. Nf3 Nc6 3. Bb5 {La Ruy López, también conocida como Apertura Española.} 3... a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 {Preparando d4 y evitando Bg4.} 9... Na5 10. Bc2 c5" },
    { id: 2, Nombre_Aper: "Defensa Siciliana", PGN: "1. e4 c5 {La Defensa Siciliana, una de las aperturas más populares.} 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Be2 e5 {La variante Najdorf.} 7. Nb3 Be6 8. O-O Be7 9. f4 exf4 10. Bxf4 O-O" },
    { id: 3, Nombre_Aper: "Gambito de Dama", PGN: "1. d4 d5 2. c4 {El Gambito de Dama, una apertura clásica.} 2... e6 3. Nc3 Nf6 4. Bg5 Be7 5. e3 O-O 6. Nf3 h6 7. Bh4 b6 {Preparando Bb7.} 8. Rc1 Bb7 9. cxd5 exd5 10. Bd3 Nbd7" },
    { id: 4, Nombre_Aper: "Defensa Francesa", PGN: "1. e4 e6 {La Defensa Francesa, sólida y estratégica.} 2. d4 d5 3. Nc3 Nf6 4. e5 Nfd7 5. f4 c5 6. Nf3 Nc6 7. Be3 Be7 8. Qd2 O-O 9. O-O-O a6 10. h4 {Un ataque agresivo en el flanco de rey.}" },
    { id: 5, Nombre_Aper: "Apertura Italiana", PGN: "1. e4 e5 2. Nf3 Nc6 3. Bc4 {La Apertura Italiana, clásica y directa.} 3... Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+ 7. Nc3 d6 8. O-O O-O 9. Bg5 h6 10. Bh4 Bg4 {Desarrollando las piezas rápidamente.}" },
    { id: 6, Nombre_Aper: "Defensa Caro-Kann", PGN: "1. e4 c6 {La Defensa Caro-Kann, sólida y estructural.} 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Nd7 5. Nf3 Ngf6 6. Nxf6+ Nxf6 7. Bc4 Bf5 8. O-O e6 9. Re1 Be7 10. c3 O-O" },
    { id: 7, Nombre_Aper: "Apertura Inglesa", PGN: "1. c4 {La Apertura Inglesa, flexible y posicional.} 1... e5 2. Nc3 Nc6 3. g3 g6 4. Bg2 Bg7 5. d3 d6 6. e4 Nge7 7. Nge2 O-O 8. O-O f5 9. Be3 Be6 10. Qd2 Qd7" },
    { id: 8, Nombre_Aper: "Defensa Alekhine", PGN: "1. e4 Nf6 {La Defensa Alekhine, provocadora y poco convencional.} 2. e5 Nd5 3. d4 d6 4. Nf3 Bg4 5. Be2 e6 6. O-O Be7 7. h3 Bh5 8. c4 Nb6 9. Nc3 O-O 10. Be3 Nc6" },
    { id: 9, Nombre_Aper: "Gambito de Rey", PGN: "1. e4 e5 2. f4 {El Gambito de Rey, una apertura agresiva.} 2... exf4 3. Nf3 g5 4. h4 g4 5. Ne5 Nf6 6. Bc4 d5 7. exd5 Bd6 8. d4 Nh5 9. O-O Qxh4 10. Bxf4 g3" },
    { id: 10, Nombre_Aper: "Defensa Escandinava", PGN: "1. e4 d5 {La Defensa Escandinava, directa y poco común.} 2. exd5 Qxd5 3. Nc3 Qa5 4. d4 Nf6 5. Nf3 Bg4 6. h3 Bxf3 7. Qxf3 c6 8. Bd2 Qb6 9. O-O-O e6 10. g4 Nbd7" }
];

async function insertAperturas() {
    try {
        for (const aperturaData of aperturas) {
            await db.insert(apertura).values(aperturaData).run();
            console.log(`Apertura insertada: ${aperturaData.Nombre_Aper}`);
        }
        console.log("Todas las aperturas han sido insertadas correctamente.");
    } catch (error) {
        console.error("Error al insertar aperturas:", error);
    }
}

insertAperturas();
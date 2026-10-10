// Posiciones de juego. La lista es cerrada. Los grupos solo sirven para
// mostrarlas ordenadas en el selector; no se guardan en ningún sitio.
export const GRUPOS_POSICIONES = [
  { linea: 'Portería', posiciones: ['Portero'] },
  { linea: 'Defensas', posiciones: ['Lateral Derecho', 'Lateral Izquierdo', 'Central Derecho', 'Central Izquierdo'] },
  { linea: 'Medios', posiciones: ['Carrilero Derecho', 'Carrilero Izquierdo', 'Medio Centro', 'Medio Organizador', 'Interior Derecho', 'Interior Izquierdo'] },
  { linea: 'Ataque', posiciones: ['Extremo Derecho', 'Extremo Izquierdo', 'Segundo Delantero', 'Media Punta', 'Delantero Centro'] },
];

export const POSICIONES = GRUPOS_POSICIONES.flatMap((g) => g.posiciones);

// "Lateral Derecho / Carrilero Derecho", o solo la principal si no hay segunda.
export function textoPosiciones(jugador) {
  if (!jugador || !jugador.posicion) return 'Sin posición';
  return jugador.posicion_secundaria ? `${jugador.posicion} / ${jugador.posicion_secundaria}` : jugador.posicion;
}

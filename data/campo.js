// Dibujo automático de una tarea: el campo a escala (largo × ancho), las porterías según la referencia y los
// jugadores de cada equipo colocados en líneas. Las posiciones son fracciones del campo (0 a 1) y las usan
// la pantalla (componente CampoTarea) y la hoja imprimible (svgCampo), para que se vea igual en las dos.
import { ROLES, REFERENCIAS } from './tareas';

export const PORTERIA_M = 7.32;   // anchura de una portería de fútbol 11
export const MINIPORTERIA_M = 3;  // anchura de una miniportería

const ANCHO_Y = [0.12, 0.88];     // por dónde se reparten los jugadores a lo ancho (deja aire en las bandas)

// Reparte n jugadores en líneas dentro de [x0, x1]; cada línea se reparte a lo ancho.
function equipoEnLineas(n, x0, x1, rol) {
  if (n <= 0) return [];
  const lineas = n <= 2 ? 1 : n <= 5 ? 2 : n <= 9 ? 3 : 4;
  const base = Math.floor(n / lineas);
  const extra = n % lineas;
  const salida = [];
  for (let l = 0; l < lineas; l++) {
    const m = base + (l < extra ? 1 : 0);
    const x = lineas === 1 ? (x0 + x1) / 2 : x0 + ((l + 0.5) / lineas) * (x1 - x0);
    for (let i = 0; i < m; i++) {
      salida.push({ rol, x, y: ANCHO_Y[0] + ((i + 0.5) / m) * (ANCHO_Y[1] - ANCHO_Y[0]) });
    }
  }
  return salida;
}

export function posicionesCampo({ n_ataque = 0, n_defensa = 0, n_comodines = 0, n_porteros = 0, referencia = 'porterias', largo, ancho }) {
  if (!(largo > 0) || !(ancho > 0)) return null;
  const jugadores = [
    ...equipoEnLineas(n_ataque, 0.08, 0.5, 'ataque'),
    ...equipoEnLineas(n_defensa, 0.5, 0.92, 'defensa'),
  ];

  // Comodines sobre las bandas, alternando arriba y abajo.
  for (let i = 0; i < n_comodines; i++) {
    const delLado = Math.ceil((n_comodines - (i % 2)) / 2); // cuántos van en su misma banda
    const posicion = Math.floor(i / 2);
    jugadores.push({ rol: 'comodin', x: 0.1 + ((posicion + 0.5) / delLado) * 0.8, y: i % 2 === 0 ? 0 : 1 });
  }

  // Porteros: el primero en la portería de la derecha, el segundo en la de la izquierda, y así.
  let porterias = null;
  if (referencia === 'porterias') porterias = { tipo: 'porterias', anchoNorm: Math.min(0.5, PORTERIA_M / ancho) };
  else if (referencia === 'miniporterias') porterias = { tipo: 'miniporterias', anchoNorm: Math.min(0.3, MINIPORTERIA_M / ancho) };
  const porLado = { 0: 0, 1: 0 };
  for (let i = 0; i < Math.min(4, n_porteros); i++) {
    const lado = i % 2 === 0 ? 1 : 0;
    const ya = porLado[lado]++;
    const desvio = ya === 0 ? 0 : (ya % 2 === 1 ? 1 : -1) * 0.07 * Math.ceil(ya / 2);
    jugadores.push({ rol: 'portero', x: lado === 1 ? 0.97 : 0.03, y: 0.5 + desvio });
  }
  return { jugadores, porterias, largo, ancho };
}

// Cuántos jugadores de cada rol hay dibujados (para la leyenda).
export const conteoDibujado = (campo) =>
  campo ? campo.jugadores.reduce((c, j) => ({ ...c, [j.rol]: (c[j.rol] || 0) + 1 }), {}) : {};

// Tamaño del campo en píxeles manteniendo la escala (largo:ancho) dentro de una caja.
export function tamanoCampo(largo, ancho, anchoMax, altoMax) {
  const escala = Math.min(anchoMax / largo, altoMax / ancho);
  return { ancho: Math.round(largo * escala), alto: Math.round(ancho * escala) };
}

export const COLOR_CAMPO = { fondo: '#e8f6ea', linea: '#16a34a' };
export const COLOR_ROL = { ataque: ROLES.ataque.color, defensa: ROLES.defensa.color, comodin: ROLES.comodin.color, portero: '#111827' };

const num = (v) => Math.round(v * 10) / 10;

// El mismo dibujo como SVG (para la hoja imprimible).
export function svgCampo(tarea, anchoMax = 280, altoMax = 170) {
  const campo = posicionesCampo({
    n_ataque: tarea.n_ataque, n_defensa: tarea.n_defensa, n_comodines: tarea.n_comodines, n_porteros: tarea.n_porteros,
    referencia: tarea.referencia, largo: tarea.largo, ancho: tarea.ancho,
  });
  if (!campo) return '';
  const margen = 10;
  const { ancho: w, alto: h } = tamanoCampo(campo.largo, campo.ancho, anchoMax, altoMax);
  const r = 5.5;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${w + margen * 2}" height="${h + margen * 2}" viewBox="0 0 ${w + margen * 2} ${h + margen * 2}" style="display:block;margin:4px 0">`;
  s += `<rect x="${margen}" y="${margen}" width="${w}" height="${h}" fill="${COLOR_CAMPO.fondo}" stroke="${COLOR_CAMPO.linea}" stroke-width="1.5"/>`;
  s += `<line x1="${num(margen + w / 2)}" y1="${margen}" x2="${num(margen + w / 2)}" y2="${margen + h}" stroke="${COLOR_CAMPO.linea}" stroke-width="0.8" stroke-dasharray="3 3" opacity="0.6"/>`;
  if (campo.porterias) {
    const gh = Math.max(6, campo.porterias.anchoNorm * h);
    const gw = 4;
    for (const lado of [0, 1]) {
      const gx = lado === 0 ? margen - gw : margen + w;
      s += `<rect x="${gx}" y="${num(margen + h / 2 - gh / 2)}" width="${gw}" height="${num(gh)}" fill="#fff" stroke="#374151" stroke-width="1"/>`;
    }
  }
  for (const j of campo.jugadores) {
    s += `<circle cx="${num(margen + j.x * w)}" cy="${num(margen + j.y * h)}" r="${r}" fill="${COLOR_ROL[j.rol]}" stroke="#fff" stroke-width="1.2"/>`;
  }
  return s + '</svg>';
}

export const etiquetaReferencia = (ref) => (REFERENCIAS[ref] ? REFERENCIAS[ref].etiqueta : '');

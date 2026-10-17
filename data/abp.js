// Jugadas de balón parado (córners, faltas, barrera…): láminas editables con jugadores numerados, rivales, balón, flechas y notas.
// El dibujo es de la jugada (biblioteca del club); en cada partido solo se asigna quién es cada número (y a quién marca).
//
// Todas las posiciones van de 0 a 1 sobre una zona de campo de 585 × 364 (la portería arriba, el ataque hacia ella).
import { svgDeFormas } from './formas';

export const ANCHO_BASE = 585;
export const ALTO_BASE = 364;
export const PROPORCION = ALTO_BASE / ANCHO_BASE;
export const MAX_ELEMENTOS = 80;
export const TIPOS = {
  corner_of: 'Córner ofensivo', falta_of: 'Falta ofensiva', corner_def: 'Córner defensivo', falta_def: 'Falta defensiva', barrera: 'Barrera', otro: 'Otra jugada',
};
// En córners y faltas defensivas hay un panel de marcajes: 5 filas con un círculo (nuestro número) y un recuadro amarillo (número del rival).
export const FILAS_MARCAJES = 5;
export const ES_DEFENSIVA = (tipo) => tipo === 'corner_def' || tipo === 'falta_def';
export const claveMarcaje = (id, lado, i) => `${id}${lado}${i}`; // lado: 'n' (nuestro) | 'r' (rival)
export const ESTILOS_FLECHA = { pase: { etiqueta: 'Balón', color: '#1e3a8a', dash: null }, carrera: { etiqueta: 'Jugador', color: '#facc15', dash: '6,4' } };

const redondear = (n) => Math.round(n * 1000) / 1000;
const limitar = (v) => Math.min(1, Math.max(0, Number.isFinite(Number(v)) ? Number(v) : 0));
const copiar = (o) => JSON.parse(JSON.stringify(o));
const punto = (p) => ({ x: redondear(limitar(p && p.x)), y: redondear(limitar(p && p.y)) });

// Lo que llega del servidor o de un fichero → jugada limpia, o null si no sirve.
export function limpiarJugada(j) {
  if (!j || typeof j !== 'object' || !Array.isArray(j.elementos)) return null;
  const vistos = new Set();
  const elementos = [];
  for (const e of j.elementos.slice(0, MAX_ELEMENTOS)) {
    if (!e || typeof e.id !== 'string' || vistos.has(e.id)) continue;
    const id = e.id.slice(0, 20);
    if (e.k === 'jugador' && Number.isInteger(e.n) && e.n >= 1 && e.n <= 30) elementos.push({ id, k: 'jugador', n: e.n, ...punto(e), ...(e.marca ? { marca: true } : {}) });
    else if (e.k === 'rival') elementos.push({ id, k: 'rival', ...(Number.isInteger(e.n) && e.n >= 1 && e.n <= 30 ? { n: e.n } : {}), ...punto(e) });
    else if (e.k === 'marcajes' && !elementos.some((x) => x.k === 'marcajes')) elementos.push({ id, k: 'marcajes', ...punto(e) });
    else if (e.k === 'balon') elementos.push({ id, k: 'balon', ...punto(e) });
    else if (e.k === 'flecha' && ESTILOS_FLECHA[e.estilo]) elementos.push({ id, k: 'flecha', estilo: e.estilo, a: punto(e.a), b: punto(e.b) });
    else if (e.k === 'nota') elementos.push({ id, k: 'nota', t: String(e.t || '').slice(0, 120), ...punto(e) });
    else continue;
    vistos.add(e.id);
  }
  return { id: j.id ?? null, titulo: String(j.titulo || 'Jugada').slice(0, 80), tipo: TIPOS[j.tipo] ? j.tipo : 'otro', consigna: String(j.consigna || '').slice(0, 120), orden: Number(j.orden) || 0, elementos };
}

export const jugadoresDe = (j) => j.elementos.filter((e) => e.k === 'jugador').sort((a, b) => a.n - b.n);
export const siguienteN = (j) => { const usados = new Set(jugadoresDe(j).map((e) => e.n)); let n = 1; while (usados.has(n)) n++; return n; };
const nuevoId = (j, prefijo) => { const usados = new Set(j.elementos.map((e) => e.id)); let i = 1; while (usados.has(`${prefijo}${i}`)) i++; return `${prefijo}${i}`; };

// Añadir un elemento. datos: { x, y } o, en flechas, { estilo, a, b }; en notas, { t }.
export function anadirElemento(j, k, datos = {}) {
  if (j.elementos.length >= MAX_ELEMENTOS) return j;
  const x = redondear(limitar(datos.x ?? 0.5)); const y = redondear(limitar(datos.y ?? 0.5));
  let e;
  if (k === 'jugador') e = { id: nuevoId(j, 'p'), k, n: siguienteN(j), x, y };
  else if (k === 'rival') e = { id: nuevoId(j, 'r'), k, x, y, ...(datos.n ? { n: datos.n } : {}) };
  else if (k === 'balon') e = { id: nuevoId(j, 'b'), k, x, y };
  else if (k === 'marcajes') { if (j.elementos.some((q) => q.k === 'marcajes')) return j; e = { id: nuevoId(j, 'm'), k, x: redondear(limitar(datos.x ?? 0.09)), y: redondear(limitar(datos.y ?? 0.5)) }; }
  else if (k === 'nota') e = { id: nuevoId(j, 'n'), k, t: String(datos.t || 'Nota').slice(0, 120), x, y };
  else if (k === 'flecha') e = { id: nuevoId(j, 'f'), k, estilo: ESTILOS_FLECHA[datos.estilo] ? datos.estilo : 'pase', a: punto(datos.a), b: punto(datos.b) };
  else return j;
  return { ...j, elementos: [...j.elementos, e] };
}
export function moverElemento(j, id, x, y) {
  return { ...j, elementos: j.elementos.map((e) => (e.id === id && e.k !== 'flecha' ? { ...e, x: redondear(limitar(x)), y: redondear(limitar(y)) } : e)) };
}
// Número que lleva el rival (su dorsal) para poder decir «marca al 9». null lo quita.
export const numeroRival = (j, id, n) => ({ ...j, elementos: j.elementos.map((e) => {
  if (e.id !== id || e.k !== 'rival') return e;
  const resto = { ...e }; delete resto.n;
  return n == null ? resto : { ...resto, n: Math.min(30, Math.max(1, Math.round(Number(n)) || 1)) };
}) });
export const borrarElemento = (j, id) => ({ ...j, elementos: j.elementos.filter((e) => e.id !== id) });
export const cambiarNota = (j, id, t) => ({ ...j, elementos: j.elementos.map((e) => (e.id === id && e.k === 'nota' ? { ...e, t: String(t).slice(0, 120) } : e)) });
export const alternarMarca = (j, id) => ({ ...j, elementos: j.elementos.map((e) => (e.id === id && e.k === 'jugador' ? (e.marca ? (({ marca, ...r }) => r)(e) : { ...e, marca: true }) : e)) });
export const duplicar = (j, titulo) => ({ ...copiar(j), id: null, titulo: String(titulo || `${j.titulo} (copia)`).slice(0, 80) });

// ---------- Asignación de cada partido ----------
// { asig: { [idElemento]: jugadorId }, textos: { [idElemento]: 'número del rival al que marca' }, pos: { [idElemento]: {x, y} } }
// pos mueve a ese jugador solo en este partido (el dibujo de la biblioteca no cambia).
export const asignacionVacia = () => ({ asig: {}, textos: {}, pos: {} });
export function asignar(a, elementoId, jugadorId) {
  const asig = { ...a.asig };
  for (const k of Object.keys(asig)) if (asig[k] === jugadorId) delete asig[k]; // un jugador solo ocupa un puesto
  if (jugadorId == null) delete asig[elementoId]; else asig[elementoId] = jugadorId;
  return { ...a, asig };
}
// Solo el número del rival (hasta 2 cifras).
export const ponerTexto = (a, elementoId, t) => ({ ...a, textos: { ...a.textos, [elementoId]: String(t).replace(/\D/g, '').slice(0, 2) } });
export const moverAsignado = (a, elementoId, x, y) => ({ ...a, pos: { ...(a.pos || {}), [elementoId]: { x: redondear(limitar(x)), y: redondear(limitar(y)) } } });
export const quitarPosiciones = (a) => ({ ...a, pos: {} });
// La jugada con los jugadores en las posiciones de este partido.
export const conPosiciones = (j, a) => ((a && a.pos && Object.keys(a.pos).length)
  ? { ...j, elementos: j.elementos.map((e) => (e.k === 'jugador' && a.pos[e.id] ? { ...e, x: a.pos[e.id].x, y: a.pos[e.id].y } : e)) } : j);

// Deja solo lo que existe en la jugada y entre los convocados.
export function limpiarAsignacion(a, j, convocadosIds) {
  const ids = new Set(j.elementos.filter((e) => e.k === 'jugador').map((e) => e.id));
  const clavesMarcaje = new Set();
  for (const e of j.elementos.filter((x) => x.k === 'marcajes')) for (let i = 1; i <= FILAS_MARCAJES; i++) { clavesMarcaje.add(claveMarcaje(e.id, 'n', i)); clavesMarcaje.add(claveMarcaje(e.id, 'r', i)); }
  const asig = {}; const textos = {}; const pos = {}; const usados = new Set();
  for (const [k, v] of Object.entries((a && a.asig) || {})) if (ids.has(k) && convocadosIds.includes(v) && !usados.has(v)) { asig[k] = v; usados.add(v); }
  for (const [k, v] of Object.entries((a && a.textos) || {})) { const d = typeof v === 'string' ? v.replace(/\D/g, '').slice(0, 2) : ''; if ((ids.has(k) || clavesMarcaje.has(k)) && d) textos[k] = d; }
  for (const [k, v] of Object.entries((a && a.pos) || {})) if (ids.has(k) && v && Number.isFinite(Number(v.x)) && Number.isFinite(Number(v.y))) pos[k] = { x: redondear(limitar(v.x)), y: redondear(limitar(v.y)) };
  return { asig, textos, pos };
}

// ---------- Dibujo ----------
const COLOR = { campo: '#58a03f', linea: '#ffffff', jugador: '#7f1d1d', rival: '#5b1022', nota: '#f8fafc' };

// Líneas con saltos para que el texto de una nota quepa en su caja.
export function partirTexto(t, maxCaracteres) {
  const palabras = String(t || '').split(/\s+/).filter(Boolean);
  const lineas = []; let actual = '';
  for (const p of palabras) {
    if (actual && (actual + ' ' + p).length > maxCaracteres) { lineas.push(actual); actual = p; } else actual = actual ? `${actual} ${p}` : p;
  }
  if (actual) lineas.push(actual);
  return lineas.length ? lineas : [''];
}

function medidas(ancho) {
  const e = ancho / ANCHO_BASE;
  return { e, radio: 17 * e, fuente: Math.max(8, 11 * e), notaAncho: 150 * e, linea: 13 * e, marcaAncho: 118 * e };
}
const cajaNota = (e, ancho) => {
  const m = medidas(ancho); const lineas = partirTexto(e.t, Math.max(8, Math.floor(m.notaAncho / (m.fuente * 0.56))));
  return { lineas, w: m.notaAncho, h: lineas.length * m.linea + 8 * m.e, x: e.x * ancho - m.notaAncho / 2, y: e.y * ancho * PROPORCION - (lineas.length * m.linea + 8 * m.e) / 2 };
};

// Panel de marcajes: (x, y) es el centro del círculo de la primera fila; las filas bajan de una en una.
function geometriaMarcajes(e, ancho) {
  const m = medidas(ancho); const alto = ancho * PROPORCION;
  const radio = 17 * m.e; const paso = 0.113 * alto; const anchoCaja = 88 * m.e; const altoCaja = 26 * m.e; const hueco = 8 * m.e;
  const cx = e.x * ancho; const filas = Array.from({ length: FILAS_MARCAJES }, (_, i) => ({ cx, cy: e.y * alto + i * paso, bx: cx + radio + hueco }));
  const caja = { x: cx - radio - 4, y: filas[0].cy - radio - 4, w: radio * 2 + hueco + anchoCaja + 8, h: paso * (FILAS_MARCAJES - 1) + radio * 2 + 8 };
  return { radio, anchoCaja, altoCaja, filas, caja };
}

export function formasJugada(jOriginal, { ancho = 585, asignacion = asignacionVacia(), nombres = {}, dorsales = {}, seleccion = null, bloqueados = {} } = {}) {
  const j = conPosiciones(jOriginal, asignacion);
  const alto = Math.round(ancho * PROPORCION);
  const m = medidas(ancho);
  const X = (u) => u * ancho; const Y = (v) => v * alto;
  const f = [];
  const L = (x1, y1, x2, y2, sw = 2 * m.e) => f.push({ k: 'line', x1, y1, x2, y2, stroke: COLOR.linea, sw, op: 0.9 });
  f.push({ k: 'rect', x: 0, y: 0, w: ancho, h: alto, fill: COLOR.campo, stroke: COLOR.campo, sw: 0 });
  // Campo: línea de fondo arriba, área grande y pequeña, punto de penalti, arco del área, círculo central abajo y córners.
  L(X(0.038), Y(0.06), X(0.978), Y(0.06)); L(X(0.038), Y(0.06), X(0.038), alto); L(X(0.978), Y(0.06), X(0.978), alto);
  f.push({ k: 'rect', x: X(0.287), y: Y(0.06), w: X(0.422), h: Y(0.297), fill: 'none', stroke: COLOR.linea, sw: 2 * m.e, op: 0.9 });
  f.push({ k: 'rect', x: X(0.41), y: Y(0.06), w: X(0.18), h: Y(0.095), fill: 'none', stroke: COLOR.linea, sw: 2 * m.e, op: 0.9 });
  f.push({ k: 'rect', x: X(0.455), y: Y(0.015), w: X(0.09), h: Y(0.045), fill: '#111827', stroke: COLOR.linea, sw: 1.5 * m.e });
  f.push({ k: 'circle', cx: X(0.495), cy: Y(0.25), r: 2.5 * m.e, fill: COLOR.linea, stroke: COLOR.linea, sw: 0 });
  const R = 0.155 * ancho; const cx = X(0.495); const cy = Y(0.25); const yArea = Y(0.357);
  const a0 = Math.asin((yArea - cy) / R);
  for (let i = 0; i < 20; i++) { const t0 = a0 + ((Math.PI - 2 * a0) * i) / 20; const t1 = a0 + ((Math.PI - 2 * a0) * (i + 1)) / 20; L(cx + R * Math.cos(t0), cy + R * Math.sin(t0), cx + R * Math.cos(t1), cy + R * Math.sin(t1)); }
  const Rc = 0.1 * ancho;
  for (let i = 0; i < 24; i++) { const t0 = Math.PI + (Math.PI * i) / 24; const t1 = Math.PI + (Math.PI * (i + 1)) / 24; L(X(0.495) + Rc * Math.cos(t0), Y(0.98) + Rc * Math.sin(t0), X(0.495) + Rc * Math.cos(t1), Y(0.98) + Rc * Math.sin(t1)); }

  // Flechas debajo de los jugadores.
  for (const e of j.elementos.filter((x) => x.k === 'flecha')) {
    const est = ESTILOS_FLECHA[e.estilo]; const sel = seleccion === e.id;
    const x1 = X(e.a.x); const y1 = Y(e.a.y); const x2 = X(e.b.x); const y2 = Y(e.b.y);
    f.push({ k: 'line', x1, y1, x2, y2, stroke: sel ? '#f97316' : est.color, sw: (sel ? 4.5 : 3) * m.e, dash: est.dash, });
    const ang = Math.atan2(y2 - y1, x2 - x1); const h = 10 * m.e;
    f.push({ k: 'poly', pts: [[x2, y2], [x2 - h * Math.cos(ang - 0.45), y2 - h * Math.sin(ang - 0.45)], [x2 - h * Math.cos(ang + 0.45), y2 - h * Math.sin(ang + 0.45)]], fill: sel ? '#f97316' : est.color, stroke: sel ? '#f97316' : est.color, sw: 1 });
  }
  for (const e of j.elementos.filter((x) => x.k === 'balon')) {
    f.push({ k: 'circle', cx: X(e.x), cy: Y(e.y), r: 6 * m.e, fill: '#ffffff', stroke: seleccion === e.id ? '#f97316' : '#111827', sw: seleccion === e.id ? 3 : 1.5 });
  }
  for (const e of j.elementos.filter((x) => x.k === 'rival')) {
    f.push({ k: 'circle', cx: X(e.x), cy: Y(e.y), r: m.radio, fill: COLOR.rival, stroke: seleccion === e.id ? '#f97316' : '#2b0a12', sw: seleccion === e.id ? 4 : 2 });
    if (e.n) f.push({ k: 'text', x: X(e.x), y: Y(e.y) + m.fuente * 0.36, t: String(e.n), size: m.fuente * 1.1, fill: '#ffffff', anchor: 'middle', bold: true });
  }
  for (const e of jugadoresDe(j)) {
    const x = X(e.x); const y = Y(e.y); const nom = nombres[asignacion.asig[e.id]];
    f.push({ k: 'circle', cx: x, cy: y, r: m.radio, fill: '#ffffff', stroke: seleccion === e.id ? '#f97316' : COLOR.jugador, sw: seleccion === e.id ? 4 : 2.5 * m.e });
    const dorsal = dorsales[asignacion.asig[e.id]];
    const numero = dorsal != null && dorsal !== '' ? String(dorsal) : String(e.n); // con jugador asignado, su dorsal
    f.push({ k: 'text', x, y: y + m.fuente * 0.36, t: numero, size: m.fuente * (numero.length > 2 ? 0.9 : 1.1), fill: '#111827', anchor: 'middle', bold: true });
    if (bloqueados[e.id]) f.push({ k: 'text', x: x + m.radio * 0.55, y: y - m.radio * 0.55, t: '🔒', size: m.fuente * 1.1, fill: '#111827', anchor: 'middle' });
    if (nom) f.push({ k: 'text', x, y: y + m.radio + m.fuente + 1, t: nom, size: m.fuente, fill: '#ffffff', anchor: 'middle', bold: true });
    const txt = (asignacion.textos[e.id] || '').trim();
    if (e.marca || txt) {
      const bx = x + m.radio + 6 * m.e;
      f.push({ k: 'rect', x: bx, y: y - 11 * m.e, w: m.marcaAncho, h: 22 * m.e, rx: 3, fill: '#fffbe6', stroke: '#facc15', sw: 2 });
      f.push({ k: 'text', x: bx + 5 * m.e, y: y + m.fuente * 0.36, t: `${numero} marca a ${txt || '…'}`, size: m.fuente * 0.95, fill: '#111827', anchor: 'start', bold: true });
    }
  }
  for (const e of j.elementos.filter((x) => x.k === 'marcajes')) {
    const g = geometriaMarcajes(e, ancho);
    if (seleccion === e.id) f.push({ k: 'rect', x: g.caja.x, y: g.caja.y, w: g.caja.w, h: g.caja.h, rx: 8, fill: 'none', stroke: '#f97316', sw: 3 });
    g.filas.forEach((r, i) => {
      const nuestro = (asignacion.textos[claveMarcaje(e.id, 'n', i + 1)] || '').trim(); const rival = (asignacion.textos[claveMarcaje(e.id, 'r', i + 1)] || '').trim();
      f.push({ k: 'circle', cx: r.cx, cy: r.cy, r: g.radio, fill: '#ffffff', stroke: '#1e293b', sw: 3 * m.e });
      if (nuestro) f.push({ k: 'text', x: r.cx, y: r.cy + m.fuente * 0.38, t: nuestro, size: m.fuente * 1.25, fill: '#111827', anchor: 'middle', bold: true });
      f.push({ k: 'rect', x: r.bx, y: r.cy - g.altoCaja / 2, w: g.anchoCaja, h: g.altoCaja, rx: 5, fill: '#ffffff', stroke: '#facc15', sw: 3 * m.e });
      if (rival) f.push({ k: 'text', x: r.bx + g.anchoCaja / 2, y: r.cy + m.fuente * 0.38, t: rival, size: m.fuente * 1.25, fill: '#111827', anchor: 'middle', bold: true });
    });
  }
  for (const e of j.elementos.filter((x) => x.k === 'nota')) {
    const c = cajaNota(e, ancho);
    f.push({ k: 'rect', x: c.x, y: c.y, w: c.w, h: c.h, rx: 3, fill: COLOR.nota, stroke: seleccion === e.id ? '#f97316' : '#334155', sw: seleccion === e.id ? 3 : 1.2 });
    c.lineas.forEach((l, i) => f.push({ k: 'text', x: c.x + c.w / 2, y: c.y + 4 * m.e + (i + 1) * m.linea - 3 * m.e, t: l, size: m.fuente, fill: '#111827', anchor: 'middle' }));
  }
  return { ancho, alto, formas: f };
}

const distSegmento = (px, py, x1, y1, x2, y2) => {
  const dx = x2 - x1; const dy = y2 - y1; const l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l2)) : 0;
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
};

// Qué hay en el punto (px, py) en píxeles del dibujo: primero jugadores, rivales y balón, luego notas y por último flechas.
export function elementoEn(jOriginal, px, py, ancho, asignacion = null) {
  const j = conPosiciones(jOriginal, asignacion);
  const m = medidas(ancho); const alto = ancho * PROPORCION;
  let mejor = null; let mejorD = Infinity;
  for (const e of j.elementos.filter((x) => x.k === 'jugador' || x.k === 'rival' || x.k === 'balon')) {
    const d = Math.hypot(px - e.x * ancho, py - e.y * alto); const tol = (e.k === 'balon' ? 8 : m.radio) + 4;
    if (d <= tol && d < mejorD) { mejor = e.id; mejorD = d; }
  }
  if (mejor) return mejor;
  for (const e of j.elementos.filter((x) => x.k === 'marcajes')) { const c = geometriaMarcajes(e, ancho).caja; if (px >= c.x && px <= c.x + c.w && py >= c.y && py <= c.y + c.h) return e.id; }
  for (const e of j.elementos.filter((x) => x.k === 'nota')) { const c = cajaNota(e, ancho); if (px >= c.x && px <= c.x + c.w && py >= c.y && py <= c.y + c.h) return e.id; }
  for (const e of j.elementos.filter((x) => x.k === 'flecha')) { const d = distSegmento(px, py, e.a.x * ancho, e.a.y * alto, e.b.x * ancho, e.b.y * alto); if (d <= 9 && d < mejorD) { mejor = e.id; mejorD = d; } }
  return mejor;
}

const esc = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Hoja imprimible de una jugada (A4 apaisado): el dibujo con los nombres puestos y la lista de quién es cada número.
// jugadores: { [id]: { dorsal, nombre } }
export function htmlJugada(j, asignacion, jugadores, { equipo = '', rival = '', categoria = '2º ANDALUZA SENIOR' } = {}, saltoDePagina = false) {
  const nombres = Object.fromEntries(Object.entries(jugadores).map(([id, v]) => [id, v.nombre]));
  const dorsales = Object.fromEntries(Object.entries(jugadores).map(([id, v]) => [id, v.dorsal]));
  const res = formasJugada(j, { ancho: 760, asignacion, nombres, dorsales });
  const filasMarcaje = j.elementos.filter((e) => e.k === 'marcajes').flatMap((e) => Array.from({ length: FILAS_MARCAJES }, (_, i) => [(asignacion.textos[claveMarcaje(e.id, 'n', i + 1)] || '').trim(), (asignacion.textos[claveMarcaje(e.id, 'r', i + 1)] || '').trim()])).filter(([a, b]) => a || b)
    .map(([a, b]) => `<li><b>${esc(a || '—')}</b> marca al <b>${esc(b || '—')}</b> rival</li>`).join('');
  const lista = filasMarcaje + jugadoresDe(j).map((e) => {
    const id = asignacion.asig[e.id]; const jug = id != null ? jugadores[id] : null;
    const tx = (asignacion.textos[e.id] || '').trim();
    const marca = e.marca || tx ? ` · marca a <b>${esc(tx || '—')}</b>` : '';
    return `<li>${jug ? `${esc(jug.dorsal != null && jug.dorsal !== '' ? `#${jug.dorsal} ` : '')}${esc(jug.nombre)}` : '<span style="color:#9ca3af">puesto ' + e.n + ' sin asignar</span>'}${marca}</li>`;
  }).join('');
  return `<div style="${saltoDePagina ? 'page-break-before: always;' : ''}font-family:-apple-system,Arial,sans-serif;padding:14px;max-width:790px;margin:auto;-webkit-print-color-adjust:exact;print-color-adjust:exact">
  <div style="background:#7f1d1d;color:#fff;padding:8px 12px;border-radius:8px;display:flex;justify-content:space-between;align-items:center">
    <b style="font-size:16px">${esc(categoria)}</b><span style="font-size:13px">${esc(equipo)}${rival ? ' vs ' + esc(rival) : ''}</span></div>
  <h2 style="margin:10px 0 2px;font-size:20px">${esc(j.titulo)} <span style="font-size:13px;color:#6b7280">${esc(TIPOS[j.tipo] || '')}</span></h2>
  ${j.consigna ? `<div style="font-size:14px;margin-bottom:6px"><b>Consigna:</b> ${esc(j.consigna)}</div>` : ''}
  ${svgDeFormas(res)}
  <ul style="columns:2;font-size:13px;margin:8px 0 0 18px;padding:0">${lista}</ul>
  <div style="margin-top:6px;font-size:11px;color:#6b7280">Flecha azul: balón · Flecha amarilla discontinua: jugador sin balón · Círculo oscuro: rival</div>
</div>`;
}

// Convierte el dibujo de la tarea en formas sencillas (rectángulos, círculos, líneas, polígonos y textos) en píxeles.
// Las dos formas de pintarlas leen esta misma lista: la pantalla (react-native-svg) y la hoja imprimible (texto SVG).
import { FLECHAS, COLOR_JUGADOR, CAMPO_POR_DEFECTO, dimsZona, aCampo, medidasElemento, zonaCabe } from './pizarra';

export const COLOR_CAMPO = { fondo: '#e8f6ea', linea: '#16a34a', zona: '#bbf7d0', zonaBorde: '#15803d', error: '#dc2626', seleccion: '#7c3aed' };
const PAD = 8; // px de aire alrededor del dibujo (porterías y comodines van sobre el borde)

const limitar = (v, min, max) => Math.min(max, Math.max(min, v));
const num = (v) => Math.round(v * 100) / 100;

// Zona del campo que se enseña. En la pizarra, el campo entero; en las vistas, la zona de la tarea con un margen.
export function ventanaVista({ tarea, dibujo, campo, modo }) {
  const c = campo || CAMPO_POR_DEFECTO;
  if (modo === 'pizarra') return { x0: 0, y0: 0, w: c.largo, h: c.ancho };
  const { L, W } = dimsZona(tarea);
  const margen = Math.max(3, 0.12 * Math.max(L, W));
  let x0 = dibujo.zona.x - margen; let y0 = dibujo.zona.y - margen;
  let x1 = dibujo.zona.x + L + margen; let y1 = dibujo.zona.y + W + margen;
  // Que quepa también lo que se haya puesto fuera de la zona (porterías, material, flechas).
  const incluir = (p, m = 1) => { x0 = Math.min(x0, p.x - m); y0 = Math.min(y0, p.y - m); x1 = Math.max(x1, p.x + m); y1 = Math.max(y1, p.y + m); };
  for (const e of dibujo.elementos || []) { const m = medidasElemento(e); incluir(aCampo(dibujo, tarea, e.u, e.v), Math.max(m.largo, m.ancho) / 2); }
  for (const f of dibujo.flechas || []) { incluir(aCampo(dibujo, tarea, f.u1, f.v1)); incluir(aCampo(dibujo, tarea, f.u2, f.v2)); }
  x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(c.largo, x1); y1 = Math.min(c.ancho, y1);
  return { x0, y0, w: Math.max(1, x1 - x0), h: Math.max(1, y1 - y0) };
}

/**
 * Devuelve { ancho, alto, escala, formas, ventana }. ancho y alto son los píxeles del lienzo (con el aire incluido).
 * seleccion: { tipo, i, extremo? } para marcarla (solo pizarra).
 */
export function formasTarea({ tarea, dibujo, campo, modo = 'vista', anchoMax = 300, altoMax = 190, seleccion = null }) {
  const c = campo || CAMPO_POR_DEFECTO;
  const vent = ventanaVista({ tarea, dibujo, campo: c, modo });
  const escala = Math.min((anchoMax - PAD * 2) / vent.w, (altoMax - PAD * 2) / vent.h);
  const X = (x) => PAD + (x - vent.x0) * escala;
  const Y = (y) => PAD + (y - vent.y0) * escala;
  const S = (m) => m * escala;
  const formas = [];
  const { L, W } = dimsZona(tarea);

  // --- Campo (solo lo que entra en la ventana)
  const cx0 = Math.max(0, vent.x0); const cy0 = Math.max(0, vent.y0);
  const cx1 = Math.min(c.largo, vent.x0 + vent.w); const cy1 = Math.min(c.ancho, vent.y0 + vent.h);
  formas.push({ k: 'rect', x: X(cx0), y: Y(cy0), w: S(cx1 - cx0), h: S(cy1 - cy0), fill: COLOR_CAMPO.fondo, stroke: COLOR_CAMPO.linea, sw: 1.5 });
  const linea = (x1, y1, x2, y2) => formas.push({ k: 'line', x1: X(x1), y1: Y(y1), x2: X(x2), y2: Y(y2), stroke: COLOR_CAMPO.linea, sw: 1, op: 0.45 });
  const contorno = (x, y, w, h) => formas.push({ k: 'rect', x: X(x), y: Y(y), w: S(w), h: S(h), fill: 'none', stroke: COLOR_CAMPO.linea, sw: 1, op: 0.45 });
  if (modo === 'pizarra' && c.largo >= 40) {
    linea(c.largo / 2, 0, c.largo / 2, c.ancho);
    if (c.largo >= 90 && c.ancho >= 55) {
      formas.push({ k: 'circle', cx: X(c.largo / 2), cy: Y(c.ancho / 2), r: S(9.15), fill: 'none', stroke: COLOR_CAMPO.linea, sw: 1, op: 0.45 });
      for (const lado of [0, 1]) {
        contorno(lado === 0 ? 0 : c.largo - 16.5, (c.ancho - 40.32) / 2, 16.5, 40.32);
        contorno(lado === 0 ? 0 : c.largo - 5.5, (c.ancho - 18.32) / 2, 5.5, 18.32);
      }
    }
  }

  // --- Zona de la tarea
  const cabe = zonaCabe(c, L, W);
  formas.push({ k: 'rect', x: X(dibujo.zona.x), y: Y(dibujo.zona.y), w: S(L), h: S(W), fill: COLOR_CAMPO.zona, op: 0.55, stroke: cabe ? COLOR_CAMPO.zonaBorde : COLOR_CAMPO.error, sw: 1.4, dash: '5 3' });
  formas.push({ k: 'text', x: X(dibujo.zona.x) + 4, y: Y(dibujo.zona.y) + 11, t: `${L} × ${W} m`, size: 9, fill: COLOR_CAMPO.zonaBorde, anchor: 'start' });

  const abs = (u, v) => { const p = aCampo(dibujo, tarea, u, v); return { x: X(p.x), y: Y(p.y) }; };

  // --- Zonas de color, luego el material
  const elementos = dibujo.elementos || [];
  elementos.forEach((e) => {
    if (e.tipo !== 'zona') return;
    const p = abs(e.u, e.v); const m = medidasElemento(e);
    formas.push({ k: 'rect', x: p.x - S(m.largo) / 2, y: p.y - S(m.ancho) / 2, w: S(m.largo), h: S(m.ancho), fill: e.color, op: 0.35, stroke: e.color, sw: 1.2 });
    if (e.texto) formas.push({ k: 'text', x: p.x, y: p.y + 3.5, t: e.texto, size: 10, fill: '#111827', anchor: 'middle', bold: true });
  });
  elementos.forEach((e) => {
    if (e.tipo === 'zona' || e.tipo === 'texto') return;
    const p = abs(e.u, e.v); const m = medidasElemento(e);
    const w = S(m.largo); const h = S(m.ancho);
    const horizontal = m.largo >= m.ancho;
    if (e.tipo === 'cono') {
      const sz = Math.max(5, S(0.5));
      formas.push({ k: 'poly', pts: [[p.x, p.y - sz * 0.85], [p.x - sz * 0.75, p.y + sz * 0.6], [p.x + sz * 0.75, p.y + sz * 0.6]], fill: '#f97316', stroke: '#c2410c', sw: 1 });
    } else if (e.tipo === 'marca') {
      formas.push({ k: 'circle', cx: p.x, cy: p.y, r: Math.max(3, S(0.3)), fill: '#6b7280', stroke: '#fff', sw: 1 });
    } else if (e.tipo === 'porteria' || e.tipo === 'miniporteria') {
      const ww = Math.max(5, w); const hh = Math.max(5, h);
      formas.push({ k: 'rect', x: p.x - ww / 2, y: p.y - hh / 2, w: ww, h: hh, fill: '#ffffff', stroke: '#374151', sw: 1.6 });
    } else if (e.tipo === 'pica' || e.tipo === 'valla') {
      const len = Math.max(10, horizontal ? w : h);
      const [x1, y1, x2, y2] = horizontal ? [p.x - len / 2, p.y, p.x + len / 2, p.y] : [p.x, p.y - len / 2, p.x, p.y + len / 2];
      formas.push({ k: 'line', x1, y1, x2, y2, stroke: e.tipo === 'pica' ? '#0f766e' : '#a16207', sw: 3.2 });
      if (e.tipo === 'valla') {
        const pata = 5;
        if (horizontal) { formas.push({ k: 'line', x1, y1, x2: x1, y2: y1 + pata, stroke: '#a16207', sw: 2 }, { k: 'line', x1: x2, y1: y2, x2, y2: y2 + pata, stroke: '#a16207', sw: 2 }); }
        else { formas.push({ k: 'line', x1, y1, x2: x1 + pata, y2: y1, stroke: '#a16207', sw: 2 }, { k: 'line', x1: x2, y1: y2, x2: x2 + pata, y2, stroke: '#a16207', sw: 2 }); }
      }
    } else if (e.tipo === 'aro') {
      formas.push({ k: 'circle', cx: p.x, cy: p.y, r: Math.max(5, S(0.45)), fill: 'none', stroke: '#0f766e', sw: 2.5 });
    } else if (e.tipo === 'escalera') {
      const ww = Math.max(horizontal ? 14 : 6, w); const hh = Math.max(horizontal ? 6 : 14, h);
      formas.push({ k: 'rect', x: p.x - ww / 2, y: p.y - hh / 2, w: ww, h: hh, fill: '#fef3c7', stroke: '#92400e', sw: 1.2 });
      const peldanos = Math.max(2, Math.floor((horizontal ? ww : hh) / Math.max(5, S(0.6))));
      for (let n = 1; n < peldanos; n++) {
        const f = n / peldanos;
        if (horizontal) formas.push({ k: 'line', x1: p.x - ww / 2 + ww * f, y1: p.y - hh / 2, x2: p.x - ww / 2 + ww * f, y2: p.y + hh / 2, stroke: '#92400e', sw: 1 });
        else formas.push({ k: 'line', x1: p.x - ww / 2, y1: p.y - hh / 2 + hh * f, x2: p.x + ww / 2, y2: p.y - hh / 2 + hh * f, stroke: '#92400e', sw: 1 });
      }
    }
  });

  // --- Flechas (debajo de los jugadores)
  (dibujo.flechas || []).forEach((f) => {
    const tipo = FLECHAS[f.tipo]; if (!tipo) return;
    const a = abs(f.u1, f.v1); const b = abs(f.u2, f.v2);
    const largo = Math.hypot(b.x - a.x, b.y - a.y);
    if (largo < 4) return;
    const ux = (b.x - a.x) / largo; const uy = (b.y - a.y) / largo;
    const cabeza = 9;
    formas.push({ k: 'line', x1: a.x, y1: a.y, x2: b.x - ux * cabeza * 0.6, y2: b.y - uy * cabeza * 0.6, stroke: tipo.color, sw: 2.4, dash: tipo.discontinua ? '7 5' : null });
    formas.push({ k: 'poly', pts: [[b.x, b.y], [b.x - ux * cabeza - uy * cabeza * 0.5, b.y - uy * cabeza + ux * cabeza * 0.5], [b.x - ux * cabeza + uy * cabeza * 0.5, b.y - uy * cabeza - ux * cabeza * 0.5]], fill: tipo.color, stroke: tipo.color, sw: 1 });
  });

  // --- Jugadores
  const radio = limitar(S(0.9), 6, 9.5);
  (dibujo.jugadores || []).forEach((j) => {
    const p = abs(j.u, j.v);
    formas.push({ k: 'circle', cx: p.x, cy: p.y, r: radio, fill: COLOR_JUGADOR[j.rol], stroke: '#ffffff', sw: 1.6 });
  });

  // --- Textos (encima de todo)
  elementos.forEach((e) => {
    if (e.tipo !== 'texto' || !e.texto) return;
    const p = abs(e.u, e.v);
    const ancho = e.texto.length * 6.4 + 8;
    formas.push({ k: 'rect', x: p.x - ancho / 2, y: p.y - 8, w: ancho, h: 15, fill: '#ffffff', op: 0.8, stroke: 'none', sw: 0, rx: 3 });
    formas.push({ k: 'text', x: p.x, y: p.y + 3.5, t: e.texto, size: 11, fill: '#111827', anchor: 'middle', bold: true });
  });

  // --- Selección (solo pizarra)
  if (seleccion) {
    const col = COLOR_CAMPO.seleccion;
    if (seleccion.tipo === 'zona') {
      formas.push({ k: 'rect', x: X(dibujo.zona.x) - 2, y: Y(dibujo.zona.y) - 2, w: S(L) + 4, h: S(W) + 4, fill: 'none', stroke: col, sw: 2.2 });
    } else if (seleccion.tipo === 'jugador' && dibujo.jugadores[seleccion.i]) {
      const j = dibujo.jugadores[seleccion.i]; const p = abs(j.u, j.v);
      formas.push({ k: 'circle', cx: p.x, cy: p.y, r: radio + 4, fill: 'none', stroke: col, sw: 2.2 });
    } else if (seleccion.tipo === 'elemento' && elementos[seleccion.i]) {
      const e = elementos[seleccion.i]; const p = abs(e.u, e.v); const m = medidasElemento(e);
      const ww = Math.max(16, S(m.largo)) + 8; const hh = Math.max(16, S(m.ancho)) + 8;
      formas.push({ k: 'rect', x: p.x - ww / 2, y: p.y - hh / 2, w: ww, h: hh, fill: 'none', stroke: col, sw: 2, dash: '4 3' });
    } else if (seleccion.tipo === 'flecha' && (dibujo.flechas || [])[seleccion.i]) {
      const f = dibujo.flechas[seleccion.i]; const a = abs(f.u1, f.v1); const b = abs(f.u2, f.v2);
      formas.push({ k: 'circle', cx: a.x, cy: a.y, r: 6, fill: '#ffffff', stroke: col, sw: 2.2 }, { k: 'circle', cx: b.x, cy: b.y, r: 6, fill: '#ffffff', stroke: col, sw: 2.2 });
    }
  }

  return { ancho: Math.round(vent.w * escala + PAD * 2), alto: Math.round(vent.h * escala + PAD * 2), escala, formas, ventana: vent, pad: PAD };
}

// Pasar de píxeles del lienzo a metros del campo (para tocar y arrastrar en la pizarra).
export const pxAMetros = (res, px, py) => ({ x: res.ventana.x0 + (px - res.pad) / res.escala, y: res.ventana.y0 + (py - res.pad) / res.escala });

// ---------- Texto SVG (hoja imprimible) ----------
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export function svgDeFormas(res) {
  const partes = res.formas.map((f) => {
    const op = f.op != null ? ` opacity="${f.op}"` : '';
    const dash = f.dash ? ` stroke-dasharray="${f.dash}"` : '';
    if (f.k === 'rect') return `<rect x="${num(f.x)}" y="${num(f.y)}" width="${num(f.w)}" height="${num(f.h)}"${f.rx ? ` rx="${f.rx}"` : ''} fill="${f.fill}" stroke="${f.stroke}" stroke-width="${f.sw}"${dash}${op}/>`;
    if (f.k === 'circle') return `<circle cx="${num(f.cx)}" cy="${num(f.cy)}" r="${num(f.r)}" fill="${f.fill}" stroke="${f.stroke}" stroke-width="${f.sw}"${dash}${op}/>`;
    if (f.k === 'line') return `<line x1="${num(f.x1)}" y1="${num(f.y1)}" x2="${num(f.x2)}" y2="${num(f.y2)}" stroke="${f.stroke}" stroke-width="${f.sw}"${dash}${op}/>`;
    if (f.k === 'poly') return `<polygon points="${f.pts.map((p) => `${num(p[0])},${num(p[1])}`).join(' ')}" fill="${f.fill}" stroke="${f.stroke}" stroke-width="${f.sw}"/>`;
    if (f.k === 'text') return `<text x="${num(f.x)}" y="${num(f.y)}" font-size="${f.size}" fill="${f.fill}" text-anchor="${f.anchor}"${f.bold ? ' font-weight="700"' : ''} font-family="Arial, sans-serif">${esc(f.t)}</text>`;
    return '';
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${res.ancho}" height="${res.alto}" viewBox="0 0 ${res.ancho} ${res.alto}" style="display:block;margin:4px 0">${partes.join('')}</svg>`;
}

// Leyenda de las flechas que hay dibujadas (para el pie de la ficha).
export function leyendaFlechas(dibujo) {
  const usados = [...new Set((dibujo.flechas || []).map((f) => f.tipo))].filter((t) => FLECHAS[t]);
  return usados.map((t) => ({ tipo: t, etiqueta: FLECHAS[t].etiqueta, color: FLECHAS[t].color, discontinua: FLECHAS[t].discontinua }));
}

// Alineación por momentos: el 11 inicial y cada cambio de sistema o de jugadores durante el partido.
// Un "momento" lleva el 11 completo con su posición en el campo, así que un cambio puede mover a varios
// jugadores o cambiar el sistema entero, no solo sustituir uno por otro.
//
// momento = { id, etiqueta, minuto|null, sistema, huecos: [{ x, y, jugador_id|null }] }   (11 huecos, el primero es el portero)
// x e y van de 0 a 1: la portería abajo (y alto), el ataque arriba (y bajo).
import { GRUPOS_POSICIONES } from './posiciones';

export const SISTEMAS = [
  '4-2-1-3', '4-3-3', '4-3-1-2', '4-2-4', '4-2-2-2',
  '3-3-1-3', '3-4-3', '3-4-1-2', '3-3-4', '3-3-2-2',
  '4-4-2', '4-2-3-1', '5-4-1', '5-2-1-2', '5-3-2',
];
// Posiciones de cada sistema leídas de la lámina «Sistemas de fútbol 11 más utilizados» (x de izquierda a derecha, y de la portería, abajo, al ataque, arriba).
const POSICIONES = {
  '3-4-1-2': [[0.5, 0.92], [0.201, 0.728], [0.515, 0.771], [0.784, 0.732], [0.1, 0.482], [0.372, 0.524], [0.638, 0.522], [0.9, 0.475], [0.488, 0.284], [0.226, 0.184], [0.772, 0.183]],
  '3-3-2-2': [[0.5, 0.92], [0.202, 0.726], [0.513, 0.771], [0.744, 0.738], [0.35, 0.507], [0.494, 0.597], [0.639, 0.513], [0.132, 0.365], [0.839, 0.37], [0.365, 0.244], [0.625, 0.245]],
  '3-4-3': [[0.5, 0.92], [0.204, 0.726], [0.52, 0.77], [0.812, 0.727], [0.257, 0.493], [0.494, 0.391], [0.501, 0.579], [0.742, 0.487], [0.128, 0.258], [0.462, 0.208], [0.886, 0.261]],
  '4-4-2': [[0.5, 0.92], [0.1, 0.662], [0.366, 0.789], [0.642, 0.788], [0.9, 0.639], [0.116, 0.406], [0.364, 0.523], [0.658, 0.512], [0.844, 0.391], [0.351, 0.237], [0.605, 0.232]],
  '4-2-3-1': [[0.5, 0.92], [0.1, 0.658], [0.366, 0.787], [0.641, 0.786], [0.9, 0.635], [0.36, 0.517], [0.64, 0.506], [0.22, 0.282], [0.5, 0.403], [0.78, 0.277], [0.506, 0.198]],
  '4-3-1-2': [[0.5, 0.92], [0.1, 0.655], [0.363, 0.784], [0.636, 0.783], [0.9, 0.631], [0.274, 0.481], [0.487, 0.58], [0.718, 0.491], [0.478, 0.338], [0.309, 0.188], [0.639, 0.179]],
  '4-3-3': [[0.5, 0.92], [0.1, 0.659], [0.36, 0.788], [0.632, 0.789], [0.9, 0.635], [0.262, 0.453], [0.479, 0.584], [0.726, 0.439], [0.148, 0.248], [0.498, 0.197], [0.794, 0.23]],
  '5-4-1': [[0.5, 0.92], [0.1, 0.691], [0.271, 0.788], [0.5, 0.818], [0.745, 0.795], [0.9, 0.696], [0.223, 0.493], [0.439, 0.597], [0.625, 0.596], [0.8, 0.492], [0.506, 0.301]],
  '5-2-1-2': [[0.5, 0.92], [0.1, 0.641], [0.259, 0.784], [0.484, 0.813], [0.738, 0.791], [0.9, 0.644], [0.315, 0.544], [0.663, 0.539], [0.478, 0.341], [0.285, 0.173], [0.717, 0.173]],
  '5-3-2': [[0.5, 0.92], [0.1, 0.659], [0.271, 0.795], [0.5, 0.828], [0.748, 0.801], [0.9, 0.66], [0.277, 0.514], [0.507, 0.576], [0.757, 0.509], [0.263, 0.21], [0.741, 0.214]],
};

export const MAX_MOMENTOS = 12;

const redondear = (n) => Math.round(n * 1000) / 1000;
export const lineasDe = (sistema) => (String(sistema).match(/\d+/g) || []).map(Number);
export const sistemaValido = (s) => { const l = lineasDe(s); return l.length >= 2 && l.length <= 5 && l.reduce((a, b) => a + b, 0) === 10 && l.every((n) => n >= 1 && n <= 6); };

// Etiquetas de cada hueco (POR, LI, DFC…) según la línea y el lado.
export function etiquetasSistema(sistema) {
  const lineas = lineasDe(sistema);
  const etiquetas = ['POR'];
  lineas.forEach((n, i) => {
    const ultima = i === lineas.length - 1;
    const primeraMedia = i === 1;
    const haySiguienteMedia = i < lineas.length - 2;
    let fila;
    if (i === 0) fila = n === 4 ? ['LI', 'DFC', 'DFC', 'LD'] : n === 3 ? ['DFC', 'DFC', 'DFC'] : n === 5 ? ['CAI', 'DFC', 'DFC', 'DFC', 'CAD'] : Array(n).fill('DFC');
    else if (ultima) fila = n === 1 ? ['DC'] : n === 2 ? ['DC', 'DC'] : n === 3 ? ['EI', 'DC', 'ED'] : n === 4 ? ['EI', 'DC', 'DC', 'ED'] : Array(n).fill('DEL');
    else if (n === 1) fila = [primeraMedia && haySiguienteMedia ? 'MCD' : 'MP'];
    else if (n === 2) fila = primeraMedia && haySiguienteMedia ? ['MCD', 'MCD'] : i > 1 ? ['MP', 'MP'] : ['MC', 'MC'];
    else if (n === 3) fila = ['MI', 'MC', 'MD'];
    else if (n === 4) fila = ['MI', 'MC', 'MC', 'MD'];
    else fila = Array(n).fill('MC');
    etiquetas.push(...fila);
  });
  return etiquetas;
}

// Grupo de posición de cada hueco: 0 portería, 1 defensas, 2 medios, 3 ataque.
export function gruposSistema(sistema) {
  const lineas = lineasDe(sistema);
  const g = [0];
  lineas.forEach((n, i) => { for (let k = 0; k < n; k++) g.push(i === 0 ? 1 : i === lineas.length - 1 ? 3 : 2); });
  return g;
}

// Puntos de los 11 huecos de un sistema (el portero primero).
export function huecosDeSistema(sistema) {
  const tabla = POSICIONES[lineasDe(sistema).join('-')];
  if (tabla) return tabla.map(([x, y]) => ({ x, y })).map((p) => ({ ...p, jugador_id: null }));
  const lineas = lineasDe(sistema);
  const pts = [{ x: 0.5, y: 0.92 }];
  lineas.forEach((n, i) => {
    const y = lineas.length === 1 ? 0.5 : 0.76 - (i * 0.62) / (lineas.length - 1);
    // Las parejas van por dentro, separadas pero sin pegarse a la banda (los extremos y los carrileros sí van abiertos).
    const ancho2 = i === lineas.length - 1 ? [0.36, 0.64] : i === 1 ? [0.36, 0.64] : [0.28, 0.72];
    for (let k = 0; k < n; k++) pts.push({ x: redondear(n === 1 ? 0.5 : n === 2 ? ancho2[k] : 0.14 + (k * 0.72) / (n - 1)), y: redondear(y) });
  });
  return pts.map((p) => ({ ...p, jugador_id: null }));
}

const grupoDePosicion = (pos) => GRUPOS_POSICIONES.findIndex((g) => g.posiciones.includes(pos));

// Reparte a los titulares de la convocatoria por su posición; los que sobran, en los huecos que queden libres.
export function rellenarHuecos(sistema, titulares) {
  const huecos = huecosDeSistema(sistema);
  const grupos = gruposSistema(sistema);
  const pendientes = [];
  const usados = new Set();
  for (const j of titulares) {
    const g = grupoDePosicion(j.posicion);
    const libre = g >= 0 ? huecos.findIndex((h, i) => h.jugador_id == null && grupos[i] === g) : -1;
    if (libre >= 0) { huecos[libre].jugador_id = j.id; usados.add(j.id); } else pendientes.push(j);
  }
  for (const j of pendientes) {
    const libre = huecos.findIndex((h) => h.jugador_id == null);
    if (libre >= 0) huecos[libre].jugador_id = j.id;
  }
  return huecos;
}

let contador = 0;
export const idMomento = () => `m${Date.now().toString(36)}${(contador++).toString(36)}`;

export function momentoInicial(sistema, titulares, id = idMomento()) {
  return { id, etiqueta: '11 inicial', minuto: null, sistema, huecos: rellenarHuecos(sistema, titulares) };
}

const copiar = (o) => JSON.parse(JSON.stringify(o));

// Copia del momento para empezar un cambio desde él.
export function copiaComoNuevo(m, etiqueta, minuto, id = idMomento()) {
  return { ...copiar(m), id, etiqueta, minuto: minuto == null || minuto === '' ? null : Number(minuto) };
}

// Convocados que no están en el campo en este momento.
export const suplentesDe = (m, convocados) => convocados.filter((j) => !m.huecos.some((h) => h.jugador_id === j.id));

// Cambiar de sistema conservando a los jugadores: se ordenan de atrás adelante y de izquierda a derecha en los dos sistemas.
export function cambiarSistema(m, sistema) {
  const orden = (huecos) => huecos.map((h, i) => ({ h, i })).sort((a, b) => (a.i === 0 ? -1 : b.i === 0 ? 1 : b.h.y - a.h.y || a.h.x - b.h.x));
  const jugadores = orden(m.huecos).map((o) => o.h.jugador_id);
  const nuevos = huecosDeSistema(sistema);
  const ordenNuevo = orden(nuevos);
  ordenNuevo.forEach((o, k) => { nuevos[o.i].jugador_id = jugadores[k] ?? null; });
  return { ...m, sistema, huecos: nuevos };
}

// Poner a un jugador en un hueco: si ya estaba en otro, se intercambian; si estaba en el banquillo, el que ocupaba el hueco pasa al banquillo.
export function asignar(m, indice, jugadorId) {
  const huecos = copiar(m.huecos);
  const previo = huecos[indice].jugador_id;
  const otro = huecos.findIndex((h) => h.jugador_id === jugadorId);
  if (otro === indice) return m;
  if (otro >= 0) huecos[otro].jugador_id = previo;
  huecos[indice].jugador_id = jugadorId;
  return { ...m, huecos };
}

export function intercambiar(m, a, b) {
  if (a === b) return m;
  const huecos = copiar(m.huecos);
  const t = huecos[a].jugador_id; huecos[a].jugador_id = huecos[b].jugador_id; huecos[b].jugador_id = t;
  return { ...m, huecos };
}

// Mover a un jugador a otro punto del campo (su sitio queda donde lo ponen).
export function moverHueco(m, indice, x, y) {
  const huecos = copiar(m.huecos);
  huecos[indice].x = redondear(Math.min(0.96, Math.max(0.04, x)));
  huecos[indice].y = redondear(Math.min(0.96, Math.max(0.04, y)));
  return { ...m, huecos };
}

export const quitarJugador = (m, indice) => { const huecos = copiar(m.huecos); huecos[indice].jugador_id = null; return { ...m, huecos }; };

// Qué cambia entre dos momentos: quién entra, quién sale y quién cambia de sitio.
export function cambiosEntre(anterior, nuevo) {
  if (!anterior) return { entran: [], salen: [], mueven: [], sistema: null };
  const ids = (m) => m.huecos.map((h) => h.jugador_id).filter((x) => x != null);
  const antes = new Set(ids(anterior)); const ahora = new Set(ids(nuevo));
  const etiquetasA = etiquetasSistema(anterior.sistema); const etiquetasN = etiquetasSistema(nuevo.sistema);
  const mueven = [];
  nuevo.huecos.forEach((h, i) => {
    if (h.jugador_id == null || !antes.has(h.jugador_id)) return;
    const j = anterior.huecos.findIndex((x) => x.jugador_id === h.jugador_id);
    const a = anterior.huecos[j];
    const distancia = Math.hypot(a.x - h.x, a.y - h.y);
    if (distancia > 0.08 || etiquetasA[j] !== etiquetasN[i]) mueven.push({ jugador_id: h.jugador_id, de: etiquetasA[j], a: etiquetasN[i], desde: { x: a.x, y: a.y }, hasta: { x: h.x, y: h.y } });
  });
  return {
    entran: nuevo.huecos.filter((h) => h.jugador_id != null && !antes.has(h.jugador_id)).map((h) => h.jugador_id),
    salen: [...antes].filter((id) => !ahora.has(id)),
    mueven,
    sistema: anterior.sistema !== nuevo.sistema ? { de: anterior.sistema, a: nuevo.sistema } : null,
  };
}

// Frases para el cuerpo técnico y para la hoja impresa. nombre(id) devuelve cómo se llama el jugador.
export function frasesDeCambios(anterior, nuevo, nombre) {
  const c = cambiosEntre(anterior, nuevo);
  const f = [];
  if (c.sistema) f.push(`Cambio de sistema: ${c.sistema.de} → ${c.sistema.a}`);
  const etiquetasN = etiquetasSistema(nuevo.sistema);
  c.entran.forEach((id) => { const i = nuevo.huecos.findIndex((h) => h.jugador_id === id); f.push(`Entra ${nombre(id)} de ${etiquetasN[i]}`); });
  c.salen.forEach((id) => f.push(`Sale ${nombre(id)}`));
  c.mueven.forEach((m) => f.push(`${nombre(m.jugador_id)}: de ${m.de} a ${m.a}`));
  return f;
}

// Comprobación de lo que llega del servidor o de un fichero: devuelve los momentos limpios o [].
export function limpiarMomentos(datos) {
  const lista = datos && Array.isArray(datos.momentos) ? datos.momentos : [];
  return lista.slice(0, MAX_MOMENTOS).filter((m) => m && sistemaValido(m.sistema) && Array.isArray(m.huecos) && m.huecos.length === 11).map((m) => ({
    id: String(m.id || idMomento()).slice(0, 40),
    etiqueta: String(m.etiqueta || 'Momento').slice(0, 40),
    minuto: Number.isFinite(Number(m.minuto)) && m.minuto !== null && m.minuto !== '' ? Math.min(130, Math.max(0, Math.round(Number(m.minuto)))) : null,
    sistema: m.sistema,
    huecos: m.huecos.map((h) => ({ x: redondear(Math.min(1, Math.max(0, Number(h.x) || 0))), y: redondear(Math.min(1, Math.max(0, Number(h.y) || 0))), jugador_id: Number.isInteger(h.jugador_id) ? h.jugador_id : null })),
  }));
}

const esc = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Hoja imprimible de un momento (A4 vertical): el campo con cada jugador en su sitio, los cambios marcados y los suplentes.
// jugadores: { [id]: { dorsal, nombre (corto) } }
export function htmlMomento(momento, anterior, jugadores, { equipo = '', rival = '', categoria = '2º ANDALUZA SENIOR' } = {}, saltoDePagina = false) {
  const W = 420; const H = 560;
  const nom = (id) => (jugadores[id] ? jugadores[id].nombre : '—');
  const dor = (id) => (jugadores[id] && jugadores[id].dorsal != null && jugadores[id].dorsal !== '' ? jugadores[id].dorsal : '');
  const c = cambiosEntre(anterior, momento);
  const entran = new Set(c.entran); const mueven = new Map(c.mueven.map((m) => [m.jugador_id, m]));
  const etiquetas = etiquetasSistema(momento.sistema);
  const flechas = c.mueven.map((m) => `<line x1="${m.desde.x * W}" y1="${m.desde.y * H}" x2="${m.hasta.x * W}" y2="${m.hasta.y * H}" stroke="#f59e0b" stroke-width="3" stroke-dasharray="7,5" marker-end="url(#p)"/>`).join('');
  const discos = momento.huecos.map((h, i) => {
    const cx = h.x * W; const cy = h.y * H;
    const borde = h.jugador_id != null && entran.has(h.jugador_id) ? '#16a34a' : h.jugador_id != null && mueven.has(h.jugador_id) ? '#f59e0b' : '#111827';
    return `<circle cx="${cx}" cy="${cy}" r="21" fill="#fff" stroke="${borde}" stroke-width="${borde === '#111827' ? 2 : 4}"/>`
      + `<text x="${cx}" y="${cy + 5}" text-anchor="middle" font-size="15" font-weight="700" fill="#111827">${esc(h.jugador_id != null ? dor(h.jugador_id) : '')}</text>`
      + `<text x="${cx}" y="${cy + 38}" text-anchor="middle" font-size="12" font-weight="700" fill="#fff" stroke="#14532d" stroke-width="0.6" paint-order="stroke">${esc(h.jugador_id != null ? nom(h.jugador_id) : etiquetas[i])}</text>`;
  }).join('');
  const frases = frasesDeCambios(anterior, momento, nom);
  const convocadosEnCampo = new Set(momento.huecos.map((h) => h.jugador_id));
  const suplentes = Object.keys(jugadores).map(Number).filter((id) => !convocadosEnCampo.has(id));
  return `<div style="${saltoDePagina ? 'page-break-before: always;' : ''}font-family:-apple-system,Arial,sans-serif;padding:14px;max-width:${W + 28}px;margin:auto">
  <div style="background:#7f1d1d;color:#fff;padding:8px 12px;border-radius:8px;display:flex;justify-content:space-between;align-items:center">
    <b style="font-size:16px">${esc(categoria)}</b><span style="font-size:13px">${esc(equipo)}${rival ? ' vs ' + esc(rival) : ''}</span></div>
  <h2 style="margin:10px 0 2px;font-size:20px">${esc(momento.etiqueta)}${momento.minuto != null ? ` · ${momento.minuto}'` : ''} <span style="font-size:14px;color:#6b7280">${esc(momento.sistema)}</span></h2>
  <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="background:#4d9a3b;border-radius:8px;display:block">
    <defs><marker id="p" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#f59e0b"/></marker></defs>
    <rect x="6" y="6" width="${W - 12}" height="${H - 12}" fill="none" stroke="#fff" stroke-width="2"/>
    <line x1="6" y1="${H / 2}" x2="${W - 6}" y2="${H / 2}" stroke="#fff" stroke-width="2"/>
    <circle cx="${W / 2}" cy="${H / 2}" r="48" fill="none" stroke="#fff" stroke-width="2"/>
    <rect x="${W / 2 - 100}" y="${H - 96}" width="200" height="90" fill="none" stroke="#fff" stroke-width="2"/>
    <rect x="${W / 2 - 100}" y="6" width="200" height="90" fill="none" stroke="#fff" stroke-width="2"/>
    ${flechas}${discos}
  </svg>
  ${frases.length ? `<div style="margin-top:8px;font-size:13px"><b>Cambios</b><ul style="margin:4px 0 0 18px;padding:0">${frases.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>` : ''}
  <div style="margin-top:8px;font-size:13px"><b>Suplentes</b>: ${suplentes.map((id) => `${esc(dor(id))} ${esc(nom(id))}`.trim()).join(' · ') || '—'}</div>
  <div style="margin-top:6px;font-size:11px;color:#6b7280">Borde verde: entra · Borde naranja y flecha: cambia de sitio</div>
</div>`;
}

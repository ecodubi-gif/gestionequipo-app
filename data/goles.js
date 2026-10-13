// Goles de un rival por minuto: resumen a partir de los partidos que devuelve el servidor (La Preferente).
// Cada partido: { jornada, rival, local, gf, gc, goles: [{ min, a: 'f'|'c', jugador }] }

export const TRAMOS = [
  { id: 't1', etiqueta: "1-15'", desde: 1, hasta: 15 },
  { id: 't2', etiqueta: "16-30'", desde: 16, hasta: 30 },
  { id: 't3', etiqueta: "31-45'", desde: 31, hasta: 45 },
  { id: 't4', etiqueta: "46-60'", desde: 46, hasta: 60 },
  { id: 't5', etiqueta: "61-75'", desde: 61, hasta: 75 },
  { id: 't6', etiqueta: "76-90'", desde: 76, hasta: 999 },
];

export const tramoDe = (min) => TRAMOS.findIndex((t) => min >= t.desde && min <= t.hasta);

// Quién marcó primero en cada partido y cómo acabaron los goles en cada parte.
export function resumenGoles(partidos) {
  const lista = Array.isArray(partidos) ? partidos : [];
  const tramos = TRAMOS.map((t) => ({ ...t, f: 0, c: 0 }));
  let gf = 0, gc = 0, primero = 0, recibePrimero = 0, sinGoles = 0, primeraParteF = 0, segundaParteF = 0, primeraParteC = 0, segundaParteC = 0;
  const goleadores = {};
  for (const p of lista) {
    const goles = (p.goles || []).filter((g) => Number.isFinite(g.min)).slice().sort((a, b) => a.min - b.min);
    if (goles.length === 0) { sinGoles += 1; continue; }
    if (goles[0].a === 'f') primero += 1; else recibePrimero += 1;
    for (const g of goles) {
      const i = tramoDe(g.min);
      if (i < 0) continue;
      if (g.a === 'f') {
        tramos[i].f += 1; gf += 1;
        if (g.min <= 45) primeraParteF += 1; else segundaParteF += 1;
        if (g.jugador && g.tipo !== 'propia' && !/\(pp\)$/.test(g.jugador)) goleadores[g.jugador] = (goleadores[g.jugador] || 0) + 1;
      } else {
        tramos[i].c += 1; gc += 1;
        if (g.min <= 45) primeraParteC += 1; else segundaParteC += 1;
      }
    }
  }
  const maxTramo = Math.max(1, ...tramos.map((t) => Math.max(t.f, t.c)));
  const mejor = (campo) => {
    const m = Math.max(...tramos.map((t) => t[campo]));
    return m > 0 ? tramos.filter((t) => t[campo] === m).map((t) => t.etiqueta) : [];
  };
  return {
    partidos: lista.length, gf, gc, primero, recibePrimero, sinGoles, primeraParteF, segundaParteF, primeraParteC, segundaParteC,
    tramos, maxTramo,
    fuerteAFavor: mejor('f'), debilEnContra: mejor('c'),
    goleadores: Object.entries(goleadores).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5).map(([nombre, goles]) => ({ nombre, goles })),
  };
}

export const FRASE_GOLES = (r) => {
  if (!r || (r.partidos === 0 && !r.manual)) return '';
  const trozos = [];
  if (r.fuerteAFavor.length) trozos.push(`Marca más en ${r.fuerteAFavor.join(' y ')}`);
  if (r.debilEnContra.length) trozos.push(`encaja más en ${r.debilEnContra.join(' y ')}`);
  return trozos.join(' · ');
};

// ---------- Entrada a mano: se pega el texto de la ficha del partido (La Preferente, federación…) ----------

const SOBRAN = ['cd', 'ud', 'cf', 'fc', 'sd', 'ad', 'pd', 'cad', 'club', 'deportivo', 'de', 'del', 'la', 'el', 'los', 'las', 'futbol', 'balompie'];
const normalizar = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

// "U.D. Morón C.F." → ['moron']
export function clavesEquipo(equipo) {
  return normalizar(equipo).split(' ').filter((p) => p && !SOBRAN.includes(p) && (p.length > 2 || p === 'b' || /^\d+$/.test(p)));
}
const contiene = (texto, claves) => {
  if (!claves.length) return false;
  const pal = normalizar(texto).split(' ');
  return claves.every((c) => pal.includes(c));
};

const CORTE = /Amonest|Expuls|Árbitr|Arbitr|Tarjeta|Cambios|Alineaci|Suplentes|Incidencias/;
const GOL = /(\d+)\s*-\s*(\d+)\s*[:,]?\s*([^()]*?)\s*\(\s*(\d{1,3})(?:\s*\+\s*\d{1,2})?\s*['’′´]?\s*([^)]*)\)/g;

// Lee los goles de la ficha pegada, vistos desde el equipo indicado. null si no encuentra nada.
// Devuelve { goles: [{ min, a: 'f'|'c', jugador, tipo }], gf, gc, rival }
export function leerFicha(texto, equipo) {
  const t = String(texto || '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\s+/g, ' ');
  const claves = clavesEquipo(equipo);
  const etiquetas = [...t.matchAll(/Goles\s+del?\s+([^:]{2,60}?)\s*:/g)];
  if (etiquetas.length === 0) return null;
  const goles = [];
  let rival = '';
  etiquetas.forEach((e, i) => {
    const nombre = e[1].trim();
    const mio = contiene(nombre, claves);
    if (!mio && !rival) rival = nombre;
    const ini = e.index + e[0].length;
    const fin = i + 1 < etiquetas.length ? etiquetas[i + 1].index : t.length;
    let seg = t.slice(ini, fin);
    const c = seg.search(CORTE);
    if (c >= 0) seg = seg.slice(0, c);
    for (const x of seg.matchAll(GOL)) {
      const min = parseInt(x[4], 10);
      if (!(min >= 1 && min <= 130)) continue;
      const nota = String(x[5] || '').toLowerCase();
      const nombreGol = x[3].trim();
      const propia = /p\.p|propia/.test(nota) || /propia (meta|puerta)/i.test(nombreGol);
      goles.push({ min, a: mio ? 'f' : 'c', jugador: nombreGol.replace(/\s+en propia (meta|puerta)\s*$/i, ''), tipo: propia ? 'propia' : /pen/.test(nota) ? 'penalti' : '' });
    }
  });
  goles.sort((a, b) => a.min - b.min);
  return { goles, gf: goles.filter((g) => g.a === 'f').length, gc: goles.filter((g) => g.a === 'c').length, rival };
}

// ---------- Cómo se guarda dentro del informe de scouting: una clave por jornada (goles_05) ----------
export const claveGoles = (jornada) => `goles_${String(jornada).padStart(2, '0')}`;
export const esClaveGoles = (k) => /^goles_\d{2}$/.test(k);

// Texto corto (máx. 600) con { j, r, g: [[min, 'f'|'c', jugador]] }
export function codificarPartido(jornada, rival, goles) {
  let largo = 16;
  for (; largo >= 4; largo -= 4) {
    const s = JSON.stringify({ j: jornada, r: String(rival || '').slice(0, 30), g: goles.slice(0, 20).map((g) => [g.min, g.a, (String(g.jugador || '').slice(0, largo) + (g.tipo === 'propia' ? ' (pp)' : '')).trim()]) });
    if (s.length <= 600) return s;
  }
  return JSON.stringify({ j: jornada, r: String(rival || '').slice(0, 30), g: goles.slice(0, 20).map((g) => [g.min, g.a, '']) }).slice(0, 600);
}

export function partidosDeDatos(datos) {
  const out = [];
  for (const [k, v] of Object.entries(datos || {})) {
    if (!esClaveGoles(k)) continue;
    try {
      const o = JSON.parse(v);
      const goles = (o.g || []).map(([min, a, jugador]) => ({ min, a, jugador }));
      out.push({ clave: k, jornada: o.j, rival: o.r || '', goles, gf: goles.filter((g) => g.a === 'f').length, gc: goles.filter((g) => g.a === 'c').length });
    } catch (e) { /* un valor roto se ignora */ }
  }
  return out.sort((a, b) => a.jornada - b.jornada);
}

// ---------- Entrada rápida: solo los goles a favor y en contra de cada tramo (clave goles_tramos) ----------
export const CLAVE_TRAMOS = 'goles_tramos';

// "2,2;2,1;1,0;2,3;0,2;4,1" → [[2,2],[2,1],[1,0],[2,3],[0,2],[4,1]] (null si no hay o está roto)
export function leerTramos(texto) {
  const trozos = String(texto || '').split(';');
  if (trozos.length !== TRAMOS.length) return null;
  const out = trozos.map((t) => t.split(',').map((x) => parseInt(x, 10)));
  return out.every((p) => p.length === 2 && p.every((n) => Number.isFinite(n) && n >= 0 && n <= 99)) ? out : null;
}
export const escribirTramos = (arr) => arr.map(([f, c]) => `${f},${c}`).join(';');
export const tramosVacios = () => TRAMOS.map(() => [0, 0]);

// Mismo resumen que resumenGoles pero a partir de los totales por tramo (no sabe quién marca primero ni los goleadores).
export function resumenDeTramos(arr) {
  const tramos = TRAMOS.map((t, i) => ({ ...t, f: arr[i][0], c: arr[i][1] }));
  const suma = (campo, de, a) => tramos.slice(de, a).reduce((n, t) => n + t[campo], 0);
  const maxTramo = Math.max(1, ...tramos.map((t) => Math.max(t.f, t.c)));
  const mejor = (campo) => {
    const m = Math.max(...tramos.map((t) => t[campo]));
    return m > 0 ? tramos.filter((t) => t[campo] === m).map((t) => t.etiqueta) : [];
  };
  return {
    partidos: 0, manual: true, gf: suma('f', 0, 6), gc: suma('c', 0, 6), primero: 0, recibePrimero: 0, sinGoles: 0,
    primeraParteF: suma('f', 0, 3), segundaParteF: suma('f', 3, 6), primeraParteC: suma('c', 0, 3), segundaParteC: suma('c', 3, 6),
    tramos, maxTramo, fuerteAFavor: mejor('f'), debilEnContra: mejor('c'), goleadores: [],
  };
}

// ¿Hay algo de goles en el informe? (tramos escritos o partidos pegados)
export function hayGoles(datos) {
  const manual = leerTramos(datos && datos[CLAVE_TRAMOS]);
  if (manual && manual.some(([f, c]) => f + c > 0)) return true;
  return partidosDeDatos(datos).length > 0;
}

// Resumen en una línea para la ficha del rival: "11 a favor · 9 en contra | Marca más en … · encaja más en … | por tramos: 2-2 · 2-1 …"
export function textoGoles(datos) {
  if (!hayGoles(datos)) return '';
  const manual = leerTramos(datos[CLAVE_TRAMOS]);
  const r = manual ? resumenDeTramos(manual) : resumenGoles(partidosDeDatos(datos));
  const partes = [`${r.gf} a favor · ${r.gc} en contra${r.manual ? '' : ` (${r.partidos} partidos)`}`];
  const frase = FRASE_GOLES(r);
  if (frase) partes.push(frase);
  partes.push(`por tramos (a favor-en contra): ${r.tramos.map((t) => `${t.etiqueta} ${t.f}-${t.c}`).join(' · ')}`);
  return partes.join('. ');
}

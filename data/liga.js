// Seguimiento de la liga: clasificación pegada desde la web de la federación, calendario y ficha del próximo rival.
// Funciones puras (sin pantalla ni red) para poder probarlas.

export const MI_EQUIPO = 'C.D. DE FÚTBOL HERRERA';

const MARCAS = { G: 'G', E: 'E', P: 'P' };

export const sinTildes = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
export const normEquipo = (s) => sinTildes(s).toUpperCase().replace(/\s+/g, ' ').trim();
export const mismoEquipo = (a, b) => normEquipo(a) === normEquipo(b);

// Lee la tabla tal como sale en la web (copiada y pegada). Cada equipo es una línea:
//   puesto, nombre, Pts, [casa: J G E P], [fuera: J G E P], F, C, últimos 5, puntos de sanción
// Los "últimos" vienen con el más reciente PRIMERO; aquí se guardan en orden cronológico (el más reciente, el último).
export function parsearClasificacion(texto) {
  const filas = [];
  const avisos = [];
  const lineas = String(texto || '').split(/\r?\n/);
  for (const bruta of lineas) {
    const l = bruta.replace(/\s+/g, ' ').trim();
    if (!l || !/^\d+ /.test(l)) continue;
    const m = l.match(/^(\d+) (.+?) (\d+(?: \d+){10})((?: [GEP]){0,5}) (\d+)$/);
    if (!m) {
      avisos.push(`No he entendido esta línea: "${l.slice(0, 60)}"`);
      continue;
    }
    const n = m[3].split(' ').map(Number);
    const casa = { j: n[1], g: n[2], e: n[3], p: n[4] };
    const fuera = { j: n[5], g: n[6], e: n[7], p: n[8] };
    const ultimos = m[4].trim() ? m[4].trim().split(' ').reverse().map((x) => MARCAS[x]) : [];
    const sancion = Number(m[5]);
    const fila = {
      pos: Number(m[1]), equipo: m[2].trim(), pts: n[0], casa, fuera, f: n[9], c: n[10], ultimos, sancion,
    };
    const g = casa.g + fuera.g; const e = casa.e + fuera.e;
    if (casa.j !== casa.g + casa.e + casa.p || fuera.j !== fuera.g + fuera.e + fuera.p) avisos.push(`${fila.equipo}: los partidos en casa o fuera no cuadran con ganados, empatados y perdidos.`);
    else if (fila.pts + sancion !== 3 * g + e) avisos.push(`${fila.equipo}: los puntos (${fila.pts}) no cuadran con sus resultados.`);
    filas.push(fila);
  }
  filas.sort((a, b) => a.pos - b.pos);
  if (filas.length === 0) avisos.push('No he encontrado ninguna fila de la clasificación. Copia la tabla entera de la web y pégala tal cual.');
  else {
    const pos = filas.map((f) => f.pos).join(',');
    if (pos !== filas.map((_, i) => i + 1).join(',')) avisos.push('Los puestos no son 1, 2, 3… seguidos: puede faltar alguna fila.');
    if (new Set(filas.map((f) => normEquipo(f.equipo))).size !== filas.length) avisos.push('Hay un equipo repetido.');
  }
  return { filas, avisos };
}

export const totales = (f) => ({
  j: f.casa.j + f.fuera.j, g: f.casa.g + f.fuera.g, e: f.casa.e + f.fuera.e, p: f.casa.p + f.fuera.p,
});

export const filaDe = (filas, equipo) => (filas || []).find((f) => mismoEquipo(f.equipo, equipo)) || null;

// Los partidos de un equipo, por jornada, con su rival y si juega en casa.
export function partidosDe(calendario, equipo) {
  return (calendario || [])
    .filter((p) => mismoEquipo(p.local, equipo) || mismoEquipo(p.visitante, equipo))
    .map((p) => {
      const esLocal = mismoEquipo(p.local, equipo);
      return { ...p, esLocal, rival: esLocal ? p.visitante : p.local };
    })
    .sort((a, b) => a.jornada - b.jornada);
}

// Primer partido de la jornada de hoy en adelante. fecha: 'AAAA-MM-DD'.
export function proximoPartido(calendario, equipo, hoy) {
  return partidosDe(calendario, equipo).find((p) => p.fecha >= hoy) || null;
}

// Todo lo que se enseña del próximo rival.
export function fichaRival({ filas, anterior, calendario, equipo = MI_EQUIPO, hoy }) {
  const proximo = proximoPartido(calendario, equipo, hoy);
  if (!proximo) return null;
  const rival = filaDe(filas, proximo.rival);
  const mia = filaDe(filas, equipo);
  const antes = anterior ? filaDe(anterior, proximo.rival) : null;
  // Si nosotros jugamos fuera, el rival juega en casa: es su récord en casa el que importa (y al revés).
  const sede = proximo.esLocal ? 'fuera' : 'casa';
  const t = rival ? totales(rival) : null;
  return {
    proximo, rival, mia, sede,
    cambioPuesto: rival && antes ? antes.pos - rival.pos : null, // positivo = ha subido
    rendimientoSede: rival ? rival[sede] : null,
    golesPorPartido: rival && t.j ? { f: Math.round((rival.f / t.j) * 10) / 10, c: Math.round((rival.c / t.j) * 10) / 10 } : null,
    diferenciaPuntos: rival && mia ? rival.pts - mia.pts : null,
  };
}

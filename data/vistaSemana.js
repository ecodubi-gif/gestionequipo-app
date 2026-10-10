// Vista de la semana: para cada entreno, lo previsto (las tareas montadas) frente a lo real (RPE del
// preparador físico), el partido, el día respecto al partido (MD-3, MD+2…) y una lectura en frases.
import { compararCarga, TEXTO_VEREDICTO } from './cargaPlanificada';
import { cargaPartido } from './carga';

const MS_DIA = 86400000;
const aDias = (iso) => {
  const [a, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return Math.round(Date.UTC(a, m - 1, d) / MS_DIA);
};

/**
 * Día respecto al partido más cercano (de esta semana o de la anterior): 'MD-3', 'MD+2', 'MD'.
 * Si hay empate de distancia, cuenta el partido siguiente. Sin partidos: null.
 */
export function diaRespectoPartido(fechaISO, fechasPartidos) {
  const f = aDias(fechaISO);
  let mejor = null;
  for (const p of fechasPartidos || []) {
    const dif = f - aDias(p); // positivo: ya pasó el partido
    if (mejor === null || Math.abs(dif) < Math.abs(mejor) || (Math.abs(dif) === Math.abs(mejor) && dif < mejor)) mejor = dif;
  }
  if (mejor === null) return null;
  return mejor === 0 ? 'MD' : mejor > 0 ? `MD+${mejor}` : `MD${mejor}`;
}

/** Carga media por jugador en un partido: media de RPE × minutos de los que tienen RPE. */
export function cargaMediaPartido(partido) {
  const filas = (partido.rpe || []).filter((r) => r.rpe > 0 && r.minutos > 0);
  if (filas.length === 0) return null;
  const media = (f) => filas.reduce((s, r) => s + f(r), 0) / filas.length;
  return {
    jugadores: filas.length,
    rpe: Math.round(media((r) => r.rpe) * 10) / 10,
    minutos: Math.round(media((r) => r.minutos)),
    carga: Math.round(media((r) => cargaPartido(r.rpe, r.minutos))),
  };
}

/**
 * entrenos: [{ id, fecha, hora, tipo, duracion_minutos, rpe_medio, previsto|null }]   (previsto = cargaPrevista, o null si no hay tareas)
 * partidos: los de la semana (con .rpe); fechasPartidos: fechas 'AAAA-MM-DD' de esta semana y de la anterior
 */
export function construirVistaSemana({ entrenos, partidos, fechasPartidos }) {
  const filas = [...entrenos]
    .sort((a, b) => `${a.fecha} ${a.hora || ''}`.localeCompare(`${b.fecha} ${b.hora || ''}`))
    .map((e) => {
      const real = e.duracion_minutos > 0 && e.rpe_medio > 0 ? { minutos: e.duracion_minutos, rpe: e.rpe_medio } : null;
      const cmp = e.previsto ? compararCarga(e.previsto, real) : null;
      const estado = !e.previsto ? (real ? 'solo_real' : 'sin_nada') : real ? 'comparada' : 'sin_real';
      return {
        id: e.id, tipo: e.tipo, fecha: e.fecha, hora: e.hora, md: diaRespectoPartido(e.fecha, fechasPartidos),
        previsto: e.previsto || null, real, cmp, estado,
        cargaReal: cmp ? cmp.carga.real : real ? Math.round(real.minutos * real.rpe) : null,
        veredicto: cmp ? cmp.veredicto : 'sin_datos',
      };
    });

  const comparadas = filas.filter((f) => f.estado === 'comparada');
  const prev = comparadas.reduce((s, f) => s + f.previsto.carga, 0);
  const real = comparadas.reduce((s, f) => s + f.cargaReal, 0);

  const partidosVista = (partidos || []).map((p) => ({
    id: p.id, fecha: p.fecha, estado: p.estado, equipo_local: p.equipo_local, equipo_visitante: p.equipo_visitante, media: cargaMediaPartido(p),
  }));
  const cargaSesionesReal = filas.reduce((s, f) => s + (f.cargaReal || 0), 0);
  const cargaPartidoReal = partidosVista.reduce((s, p) => s + (p.media ? p.media.carga : 0), 0);

  const escala = Math.max(1, ...filas.flatMap((f) => [f.previsto ? f.previsto.carga : 0, f.cargaReal || 0]));
  return {
    filas, partidos: partidosVista, escala,
    comparable: comparadas.length ? { sesiones: comparadas.length, previsto: prev, real, pct: prev > 0 ? (real - prev) / prev : null } : null,
    cargaRealSemana: cargaSesionesReal + cargaPartidoReal,
    lectura: lecturaSemana(filas),
  };
}

/** Frases que resumen qué ha pasado y qué conviene mirar. */
export function lecturaSemana(filas) {
  const frases = [];
  for (const f of filas) {
    const nombre = `Entreno ${f.tipo}`;
    if (f.estado === 'comparada') {
      const pct = Math.round(f.cmp.carga.pct * 100);
      const txt = `${pct > 0 ? '+' : ''}${pct} %`;
      if (f.veredicto === 'mucho_mas_dura') frases.push(`${nombre}: ${txt} de lo previsto. Muy duro: revisa lo que queda de semana.`);
      else if (f.veredicto === 'mas_dura') frases.push(`${nombre}: ${txt} de lo previsto. Algo más duro de lo que pensabas.`);
      else if (f.veredicto === 'mucho_mas_suave') frases.push(`${nombre}: ${txt} de lo previsto. Muy por debajo: ¿se hizo todo lo planificado?`);
      else if (f.veredicto === 'mas_suave') frases.push(`${nombre}: ${txt} de lo previsto. Algo más suave.`);
    } else if (f.estado === 'sin_real') {
      frases.push(`${nombre}: pendiente del RPE del preparador físico.`);
    } else if (f.estado === 'sin_nada') {
      frases.push(`${nombre}: sin tareas montadas y sin RPE.`);
    } else if (f.estado === 'solo_real') {
      frases.push(`${nombre}: tiene RPE pero no hay tareas montadas con las que compararlo.`);
    }
  }
  if (frases.length === 0 && filas.length > 0) frases.push('Todo en línea con lo previsto.');
  return frases;
}

export const COLOR_VEREDICTO = {
  sin_datos: '#9ca3af', en_linea: '#16a34a', mas_dura: '#d97706', mucho_mas_dura: '#dc2626', mas_suave: '#2563eb', mucho_mas_suave: '#1e3a8a',
};
export const ETIQUETA_VEREDICTO = {
  sin_datos: 'Sin RPE', en_linea: 'En línea', mas_dura: 'Más dura', mucho_mas_dura: 'Mucho más dura', mas_suave: 'Más suave', mucho_mas_suave: 'Mucho más suave',
};
export { TEXTO_VEREDICTO };

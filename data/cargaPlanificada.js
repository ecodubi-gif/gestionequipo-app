// Carga prevista de una sesión (lo que dicen las tareas planificadas) frente a la carga real (RPE).
//
// Carga = minutos × RPE. El RPE previsto sale del objetivo físico de cada tarea. Esos RPE esperados son
// una PROPUESTA inicial que debe validar el preparador físico; están todos aquí, en una sola tabla.
import { cargaSesion } from './carga';

export const RPE_ESPERADO = { recuperacion: 3, compensacion: 6, fuerza: 7, puesta_a_punto: 5 };
export const RPE_SIN_OBJETIVO = 5;     // tarea sin objetivo elegido
export const RPE_PREVENTIVO = 3;       // trabajo preventivo del preparador físico
export const RPE_MOVILIDAD = 2;        // movilidad dinámica
export const RPE_ESTIRAMIENTOS = 1;    // estiramientos finales
export const RPE_BLOQUE_SIN_TAREAS = 4; // rueda de perfiles o activación sin tareas montadas
export const DESVIO_EN_LINEA = 0.15;   // hasta ±15 %: la sesión salió como se había previsto
export const DESVIO_ALTO = 0.3;        // a partir de ±30 %: muy desviada

const rpeDeTarea = (t) => RPE_ESPERADO[t.objetivo] ?? RPE_SIN_OBJETIVO;
const unidades = (tareas) => (tareas || []).reduce((s, t) => s + (t.minutos || 0) * rpeDeTarea(t), 0);
const minutosDe = (tareas) => (tareas || []).reduce((s, t) => s + (t.minutos || 0), 0);

/**
 * sesion: lo que devuelve construirSesion ({ items, total })
 * pesosGrupo: cuánta gente hay en cada grupo del primer entreno (por defecto, igual en los dos)
 * Devuelve { minutos, rpe, carga, desglose: [{ clave, titulo, minutos, rpe }] }
 */
export function cargaPrevista(sesion, pesosGrupo = { recuperacion: 1, compensacion: 1 }) {
  let u = 0; // unidades = minutos × RPE de todo el equipo, en media
  const desglose = [];
  for (const it of sesion.items) {
    let ub;
    if (it.clave === 'preventivo') ub = it.minutos * RPE_PREVENTIVO;
    else if (it.clave === 'movilidad') ub = it.minutos * RPE_MOVILIDAD;
    else if (it.clave === 'estiramientos') ub = it.minutos * RPE_ESTIRAMIENTOS;
    else if (it.grupos) {
      const w = it.grupos.map((g) => pesosGrupo[g.clave] || 0);
      const suma = w.reduce((a, b) => a + b, 0) || 1;
      ub = it.grupos.reduce((s, g, i) => s + (w[i] / suma) * unidades(g.tareas), 0) + unidades(it.tareas);
    } else {
      const m = minutosDe(it.tareas);
      ub = m > 0 ? it.minutos * (unidades(it.tareas) / m) : it.minutos * (it.minutos > 0 ? RPE_BLOQUE_SIN_TAREAS : 0);
    }
    u += ub;
    desglose.push({ clave: it.clave, titulo: it.titulo, minutos: it.minutos, rpe: it.minutos > 0 ? Math.round((ub / it.minutos) * 10) / 10 : null });
  }
  const minutos = sesion.total;
  return { minutos, rpe: minutos > 0 ? Math.round((u / minutos) * 10) / 10 : null, carga: Math.round(u), desglose };
}

const porcentaje = (previsto, real) => (previsto > 0 ? (real - previsto) / previsto : null);

/**
 * previsto: lo de cargaPrevista. real: { minutos, rpe } de la sesión (pueden faltar).
 * Devuelve las tres comparaciones y un veredicto sobre la carga.
 */
export function compararCarga(previsto, real) {
  const minutosReal = real && real.minutos > 0 ? real.minutos : null;
  const rpeReal = real && real.rpe > 0 ? real.rpe : null;
  const cargaReal = minutosReal && rpeReal ? cargaSesion(minutosReal, rpeReal) : null;
  const fila = (p, r) => ({ previsto: p, real: r, pct: r != null ? porcentaje(p, r) : null });
  const res = {
    minutos: fila(previsto.minutos, minutosReal),
    rpe: fila(previsto.rpe, rpeReal),
    carga: fila(previsto.carga, cargaReal),
    veredicto: 'sin_datos',
  };
  if (cargaReal != null && res.carga.pct != null) {
    const a = Math.abs(res.carga.pct);
    res.veredicto = a <= DESVIO_EN_LINEA ? 'en_linea' : res.carga.pct > 0 ? (a >= DESVIO_ALTO ? 'mucho_mas_dura' : 'mas_dura') : (a >= DESVIO_ALTO ? 'mucho_mas_suave' : 'mas_suave');
  }
  return res;
}

export const TEXTO_VEREDICTO = {
  sin_datos: 'Todavía no hay RPE de esta sesión para compararla.',
  en_linea: 'La carga real ha salido como se había previsto.',
  mas_dura: 'La sesión ha sido más dura de lo previsto.',
  mucho_mas_dura: 'La sesión ha sido mucho más dura de lo previsto: conviene revisar las siguientes.',
  mas_suave: 'La sesión ha sido más suave de lo previsto.',
  mucho_mas_suave: 'La sesión ha sido mucho más suave de lo previsto.',
};

export const formatoPct = (pct) => (pct == null ? '' : `${pct > 0 ? '+' : ''}${Math.round(pct * 100)} %`);

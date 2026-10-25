// Seguimiento del entreno en el campo: la sesión como una lista de pasos (cada tarea y cada bloque), con lo que
// se va haciendo (series hechas, tiempo real, notas). Funciones puras, para poder probarlas.
import { segundosDe, formatoDuracion } from './tareas';
import { textoSeries } from './planSesion';

// Convierte la sesión (construirSesion) en pasos en orden. Las tareas son un paso cada una;
// los bloques sin tareas (preventivo, movilidad, estiramientos…) son un paso con su tiempo.
export function pasosDeSesion(sesion) {
  const pasos = [];
  for (const it of (sesion && sesion.items) || []) {
    const tareasDelBloque = [
      ...(it.tareas || []).map((t) => ({ t, grupo: null })),
      ...(it.grupos || []).flatMap((g) => (g.tareas || []).map((t) => ({ t, grupo: g.titulo }))),
    ];
    const bloqueConTareas = it.clave === 'parte_central' || it.clave === 'cierre_tactico';
    if (tareasDelBloque.length > 0) {
      tareasDelBloque.forEach(({ t, grupo }) => {
        const series = Math.max(1, t.series || 1);
        pasos.push({
          id: `t${t.id}`, tipo: 'tarea', bloque: it.titulo, bloqueClave: it.clave, grupo, titulo: t.nombre || 'Tarea', tarea: t,
          series, segundos: Math.max(5, segundosDe(t) || 60), pausa: t.pausa_seg || 0, minutos: t.minutos || 0,
          previstoSeg: series * Math.max(5, segundosDe(t) || 60) + (series - 1) * (t.pausa_seg || 0),
        });
      });
      // Si el bloque tiene un texto además de las tareas (p. ej. la rueda), también se puede seguir.
      if ((it.texto || (it.postas && it.postas.length > 0)) && !bloqueConTareas) pasos.push(pasoDeBloque(it, `${it.clave}-texto`));
    } else if (bloqueConTareas) {
      // Parte central o cierre sin tareas: no hay nada que seguir.
      continue;
    } else {
      pasos.push(pasoDeBloque(it, it.clave));
    }
  }
  return pasos;
}

function pasoDeBloque(it, id) {
  return {
    id: `b-${id}`, tipo: 'bloque', bloque: it.titulo, bloqueClave: it.clave, grupo: null, titulo: it.titulo, bloqueDatos: it,
    series: 1, segundos: Math.max(30, (it.minutos || 1) * 60), pausa: 0, minutos: it.minutos || 0,
    previstoSeg: Math.max(30, (it.minutos || 1) * 60),
  };
}

export const estadoVacio = () => ({ pasos: {}, actual: 0 });

const del = (estado, id) => (estado.pasos && estado.pasos[id]) || { series_hechas: 0, seg_reales: 0, hecha: false, nota: '' };

export const datosPaso = del;

function con(estado, id, cambios) {
  return { ...estado, pasos: { ...estado.pasos, [id]: { ...del(estado, id), ...cambios } } };
}

// Marca o desmarca una serie concreta (1…n). Las series se cuentan como "hechas hasta aquí".
export function ponerSeries(estado, paso, n) {
  const hechas = Math.max(0, Math.min(paso.series, n));
  return con(estado, paso.id, { series_hechas: hechas, hecha: hechas >= paso.series });
}

export function sumarSerie(estado, paso) {
  return ponerSeries(estado, paso, del(estado, paso.id).series_hechas + 1);
}

export function sumarSegundos(estado, id, seg) {
  return con(estado, id, { seg_reales: Math.max(0, Math.round(del(estado, id).seg_reales + seg)) });
}

export function marcarHecho(estado, paso, hecha = true) {
  return con(estado, paso.id, { hecha, series_hechas: hecha ? paso.series : Math.min(del(estado, paso.id).series_hechas, paso.series - 1) });
}

export const ponerNota = (estado, id, nota) => con(estado, id, { nota: String(nota || '').slice(0, 300) });

// Limpia lo guardado: solo pasos que existen y valores razonables.
export function normalizarEstado(guardado, pasos) {
  const ids = new Set(pasos.map((p) => p.id));
  const salida = estadoVacio();
  const g = guardado && typeof guardado === 'object' ? guardado : {};
  for (const [id, v] of Object.entries(g.pasos || {})) {
    if (!ids.has(id) || !v) continue;
    const paso = pasos.find((p) => p.id === id);
    salida.pasos[id] = {
      series_hechas: Math.max(0, Math.min(paso.series, Number(v.series_hechas) || 0)),
      seg_reales: Math.max(0, Math.min(6 * 3600, Math.round(Number(v.seg_reales) || 0))),
      hecha: Boolean(v.hecha),
      nota: String(v.nota || '').slice(0, 300),
    };
  }
  salida.actual = Math.max(0, Math.min(pasos.length - 1, Number(g.actual) || 0));
  return salida;
}

// Resumen: cuántos pasos hechos y cuánto tiempo previsto frente al real.
export function resumenSeguimiento(pasos, estado) {
  const hechos = pasos.filter((p) => del(estado, p.id).hecha).length;
  const previstoSeg = pasos.reduce((s, p) => s + p.previstoSeg, 0);
  const realSeg = pasos.reduce((s, p) => s + del(estado, p.id).seg_reales, 0);
  const previstoHechoSeg = pasos.filter((p) => del(estado, p.id).hecha).reduce((s, p) => s + p.previstoSeg, 0);
  return { total: pasos.length, hechos, previstoSeg, realSeg, previstoHechoSeg, completo: pasos.length > 0 && hechos === pasos.length };
}

export const mmss = (seg) => {
  const s = Math.max(0, Math.round(seg));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

// Texto para compartir (WhatsApp): qué se ha hecho y cuánto ha durado cada cosa.
export function textoSeguimiento({ titulo, pasos, estado }) {
  const r = resumenSeguimiento(pasos, estado);
  const lineas = [`🏃 ${titulo}`, `Hecho: ${r.hechos} de ${r.total} · previsto ${mmss(r.previstoSeg)} · real ${mmss(r.realSeg)}`, ''];
  let bloque = '';
  for (const p of pasos) {
    if (p.bloque !== bloque) { bloque = p.bloque; lineas.push(`▪️ ${bloque}`); }
    const d = del(estado, p.id);
    const marca = d.hecha ? '✅' : d.series_hechas > 0 ? '🟡' : '⬜';
    const series = p.tipo === 'tarea' ? ` · ${d.series_hechas}/${p.series} series` : '';
    const real = d.seg_reales > 0 ? ` · ${mmss(d.seg_reales)}` : '';
    lineas.push(`${marca} ${p.grupo ? `[${p.grupo}] ` : ''}${p.titulo}${series}${real}`);
    if (d.nota) lineas.push(`   📝 ${d.nota}`);
  }
  return lineas.join('\n');
}

// "4 × 3:00 · pausa 45 s"
export const textoTrabajo = (p) => `${p.series} × ${formatoDuracion(p.segundos)}${p.pausa ? ` · pausa ${p.pausa} s` : ''}`;
export { textoSeries };

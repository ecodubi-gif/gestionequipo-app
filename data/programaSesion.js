// Programa de preventivo y movilidad de UNA sesión. La plantilla del tipo de entreno es la sugerencia; si el cuerpo técnico
// la cambia en una sesión (otros ejercicios, quitar o poner), lo suyo se guarda en esa sesión (entrenamiento.bloques) y manda
// sobre la sugerencia. Funciones puras, para poder probarlas.

import { postasDe, MAX_POSTAS } from './planSesion';

export const CLAVE_PROG = { preventivo: 'preventivo_prog', movilidad: 'movilidad_prog', rueda: 'rueda_prog' };
export const MAX_ITEMS = { preventivo: 8, movilidad: 10, rueda: MAX_POSTAS };

// La rueda físico-técnica: cada posta dura `posta` minutos y entre postas hay `rotacion` minutos. Lo normal es 3' + 1',
// pero se puede cambiar en cada sesión. Si no hay postas, la rueda dura lo de siempre (15').
export const RUEDA_DEFECTO = { posta: 3, rotacion: 1, total: 15 };
export const LIMITES_RUEDA = { postaMin: 1, postaMax: 10, rotMin: 0, rotMax: 5 };
const entero = (v, min, max, defecto) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && v !== null && v !== '' && v !== undefined ? Math.min(max, Math.max(min, n)) : defecto;
};
export function tiemposRueda(entrenamiento) {
  const b = (entrenamiento && entrenamiento.bloques) || {};
  return {
    posta: entero(b.rueda_posta_min, LIMITES_RUEDA.postaMin, LIMITES_RUEDA.postaMax, RUEDA_DEFECTO.posta),
    rotacion: entero(b.rueda_rot_min, LIMITES_RUEDA.rotMin, LIMITES_RUEDA.rotMax, RUEDA_DEFECTO.rotacion),
  };
}
// Duración total: n postas + (n - 1) rotaciones.
export const minutosRueda = (nPostas, posta, rotacion) => (nPostas > 0 ? nPostas * posta + (nPostas - 1) * rotacion : RUEDA_DEFECTO.total);

// Campos de cada elemento (clave, etiqueta, obligatorio, multilínea).
export const CAMPOS_PROG = {
  preventivo: [
    { clave: 'zona', etiqueta: 'Zona de trabajo', obligatorio: true },
    { clave: 'ejercicio', etiqueta: 'Ejercicio', multilinea: true, obligatorio: true },
    { clave: 'series', etiqueta: 'Series' },
    { clave: 'detalle', etiqueta: 'Repeticiones o tiempo' },
  ],
  movilidad: [
    { clave: 'tiempo', etiqueta: 'Tiempo', obligatorio: true },
    { clave: 'zona', etiqueta: 'Zona de trabajo', obligatorio: true },
    { clave: 'descripcion', etiqueta: 'Ejercicio', multilinea: true, obligatorio: true },
  ],
  rueda: [
    { clave: 'titulo', etiqueta: 'Nombre de la posta', obligatorio: true },
    { clave: 'fisico', etiqueta: 'Trabajo físico (material)', multilinea: true, obligatorio: true },
    { clave: 'tecnico', etiqueta: 'Recurso técnico-táctico (con balón)', multilinea: true },
  ],
};

const LARGO = { zona: 160, ejercicio: 1500, series: 40, detalle: 160, tiempo: 20, descripcion: 1500, titulo: 160, fisico: 1500, tecnico: 1500 };

export const itemVacio = (tipo) => Object.fromEntries(CAMPOS_PROG[tipo].map((c) => [c.clave, '']));

// Deja una lista lista para guardar: solo los campos del tipo, recortados, sin elementos incompletos y con el máximo respetado.
export function limpiarPrograma(tipo, lista) {
  const campos = CAMPOS_PROG[tipo];
  return (Array.isArray(lista) ? lista : [])
    .map((it) => Object.fromEntries(campos.map((c) => [c.clave, String((it && it[c.clave]) == null ? '' : it[c.clave]).trim().slice(0, LARGO[c.clave])])))
    .filter((it) => campos.every((c) => !c.obligatorio || it[c.clave] !== ''))
    .slice(0, MAX_ITEMS[tipo]);
}

// Lo que se hace en esta sesión: lo guardado en la sesión si lo hay; si no, la sugerencia de la plantilla.
export function programaDe(entrenamiento, plantilla) {
  const b = (entrenamiento && entrenamiento.bloques) || {};
  const propioPrev = Array.isArray(b[CLAVE_PROG.preventivo]);
  const propioMov = Array.isArray(b[CLAVE_PROG.movilidad]);
  const propioRueda = Array.isArray(b[CLAVE_PROG.rueda]);
  return {
    preventivo: propioPrev ? b[CLAVE_PROG.preventivo] : (plantilla && plantilla.preventivo) || [],
    movilidad: propioMov ? b[CLAVE_PROG.movilidad] : (plantilla && plantilla.movilidad) || [],
    rueda: propioRueda ? b[CLAVE_PROG.rueda] : postasDe(plantilla),
    propioPrev,
    propioMov,
    propioRueda,
    hayPlantilla: Boolean(plantilla),
  };
}

export const programaPropio = (entrenamiento, tipo) => Array.isArray(((entrenamiento && entrenamiento.bloques) || {})[CLAVE_PROG[tipo]]);

export function reemplazar(tipo, lista, i, valores) {
  return limpiarPrograma(tipo, lista.map((it, k) => (k === i ? { ...it, ...valores } : it)));
}

export const quitar = (lista, i) => lista.filter((_, k) => k !== i);

export function anadir(tipo, lista, valores) {
  if (lista.length >= MAX_ITEMS[tipo]) return lista;
  return limpiarPrograma(tipo, [...lista, valores]);
}

export function mover(lista, i, dir) {
  const j = i + dir;
  if (j < 0 || j >= lista.length) return lista;
  const copia = lista.slice();
  [copia[i], copia[j]] = [copia[j], copia[i]];
  return copia;
}

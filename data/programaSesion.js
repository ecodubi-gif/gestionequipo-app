// Programa de preventivo y movilidad de UNA sesión. La plantilla del tipo de entreno es la sugerencia; si el cuerpo técnico
// la cambia en una sesión (otros ejercicios, quitar o poner), lo suyo se guarda en esa sesión (entrenamiento.bloques) y manda
// sobre la sugerencia. Funciones puras, para poder probarlas.

import { postasDe, MAX_POSTAS } from './planSesion';
import { CAMPOS_PERFIL } from './semana';

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

// ---------- Perfil del día ----------
// La plantilla del tipo de entreno trae el perfil del día (fase del juego, puntal físico, densidad, gestión de la plantilla)
// como texto: son las orientaciones propuestas y se conservan siempre. En una sesión concreta se puede cambiar: lo guardado
// en la sesión (bloques.perfil_dia) manda sobre la plantilla; null vuelve a la plantilla.
// Además, en la sesión se pueden elegir una o varias fases del juego y, de cada una, sus aspectos.
export const CLAVE_PERFIL = 'perfil_dia';
const LARGO_PERFIL = { fase: 160, puntal: 160, densidad: 160, gestion: 1500 };

export const FASES_JUEGO = [
  { clave: 'defensiva', etiqueta: 'Defensiva' },
  { clave: 'ofensiva', etiqueta: 'Ofensiva' },
  { clave: 'trans_ad', etiqueta: 'Transición ataque-defensa' },
  { clave: 'trans_da', etiqueta: 'Transición defensa-ataque' },
];

// Aspectos que se pueden elegir de cada fase.
export const ASPECTOS_FASE = {
  defensiva: ['Bloque alto', 'Bloque medio', 'Bloque bajo', 'Presión tras pérdida', 'Presión y orientación del rival', 'Basculación y coberturas', 'Marcaje en zona', 'Marcaje al hombre', 'Líneas juntas', 'Defensa del área y de los centros', 'Defensa de la espalda'],
  ofensiva: ['Salida de balón', 'Progresión por dentro', 'Progresión por fuera', 'Juego entre líneas', 'Amplitud y profundidad', 'Superioridades y apoyos', 'Desmarques y movilidad', 'Cambios de orientación', 'Llegada y finalización', 'Centros y remates', 'Juego directo'],
  trans_ad: ['Contrapresión', 'Repliegue intensivo', 'Temporización', 'Falta táctica', 'Equilibrios defensivos', 'Cerrar el pase interior'],
  trans_da: ['Contraataque', 'Primer pase tras robo', 'Ataque en velocidad', 'Pausa y conservación', 'Ocupar espacios', 'Desmarque de ruptura', 'Apoyos al portador'],
};
const MAX_ASPECTOS = 12;
export const LARGO_ORIENTACION = 600;

const clavesFases = FASES_JUEGO.map((f) => f.clave);

export function limpiarPerfil(valores) {
  const v = valores || {};
  const base = Object.fromEntries(CAMPOS_PERFIL.map((c) => [c.clave, String(v[c.clave] == null ? '' : v[c.clave]).trim().slice(0, LARGO_PERFIL[c.clave] || 160)]));
  const fases = clavesFases.filter((k) => Array.isArray(v.fases) && v.fases.includes(k));
  const aspectos = {};
  for (const k of fases) {
    const lista = v.aspectos && Array.isArray(v.aspectos[k]) ? v.aspectos[k] : [];
    const limpios = [...new Set(lista.map((a) => String(a == null ? '' : a).trim().slice(0, 80)).filter(Boolean))].slice(0, MAX_ASPECTOS);
    if (limpios.length > 0) aspectos[k] = limpios;
  }
  // Una orientación por cada fase elegida (con una sola fase, una; con dos, dos…). El texto de la plantilla (fase) se conserva aparte.
  const orientaciones = {};
  for (const k of fases) {
    const t = String(v.orientaciones && v.orientaciones[k] != null ? v.orientaciones[k] : '').trim().slice(0, LARGO_ORIENTACION);
    if (t) orientaciones[k] = t;
  }
  return { ...base, fases, aspectos, orientaciones };
}

// Solo los cuatro textos (lo que admite la plantilla de la semana).
export const textosPerfil = (valores) => Object.fromEntries(CAMPOS_PERFIL.map((c) => [c.clave, limpiarPerfil(valores)[c.clave]]));

export function perfilDe(entrenamiento, plantilla) {
  const b = (entrenamiento && entrenamiento.bloques) || {};
  const propio = Boolean(b[CLAVE_PERFIL]) && typeof b[CLAVE_PERFIL] === 'object' && !Array.isArray(b[CLAVE_PERFIL]);
  const semana = (plantilla && plantilla.semana) || null;
  const base = propio ? b[CLAVE_PERFIL] : semana;
  return { valores: limpiarPerfil(base), propio, hayPlantilla: Boolean(semana) };
}

export const perfilVacio = (perfil) => CAMPOS_PERFIL.every((c) => !perfil.valores[c.clave]) && perfil.valores.fases.length === 0;

// Alterna una fase; al quitarla se quitan también sus aspectos.
export function alternarFase(valores, clave) {
  const v = limpiarPerfil(valores);
  const fases = v.fases.includes(clave) ? v.fases.filter((k) => k !== clave) : [...v.fases, clave];
  return limpiarPerfil({ ...v, fases });
}

export function cambiarOrientacion(valores, fase, texto) {
  // Sin limpiar: se escribe letra a letra y no se pueden recortar los espacios por el camino.
  if (!(valores.fases || []).includes(fase)) return valores;
  return { ...valores, orientaciones: { ...(valores.orientaciones || {}), [fase]: String(texto == null ? '' : texto).slice(0, LARGO_ORIENTACION) } };
}

export function alternarAspecto(valores, fase, aspecto) {
  const v = limpiarPerfil(valores);
  if (!v.fases.includes(fase)) return v;
  const actuales = v.aspectos[fase] || [];
  const nuevos = actuales.includes(aspecto) ? actuales.filter((a) => a !== aspecto) : [...actuales, aspecto];
  return limpiarPerfil({ ...v, aspectos: { ...v.aspectos, [fase]: nuevos } });
}

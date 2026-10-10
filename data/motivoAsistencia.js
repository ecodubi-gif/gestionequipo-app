// Motivo de una falta justificada. Se guarda en un solo texto:
//   "Lesión"            -> motivo sin detalle (como estaba guardado hasta ahora)
//   "Lesión: isquio"    -> lesión con el detalle de qué es
//   "Trabajo", "Asuntos personales", o cualquier texto libre
export const MOTIVOS_JUSTIFICADA = ['Lesión', 'Trabajo', 'Asuntos personales'];
export const MAX_DETALLE = 30; // "con una palabra": corto a propósito

const PREFIJO_LESION = 'Lesión: ';

// Quita espacios sobrantes y limita el largo.
export function limpiarDetalle(texto) {
  return String(texto ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_DETALLE);
}

// motivo guardado -> { base, detalle, libre }
//   base:    una de MOTIVOS_JUSTIFICADA, o null si es un texto libre
//   detalle: solo para Lesión ("isquio")
//   libre:   el texto cuando no es ninguno de los motivos predefinidos
export function parsearMotivo(motivo) {
  const m = String(motivo ?? '');
  if (m === '') return { base: null, detalle: '', libre: '' };
  if (MOTIVOS_JUSTIFICADA.includes(m)) return { base: m, detalle: '', libre: '' };
  if (m.startsWith(PREFIJO_LESION)) return { base: 'Lesión', detalle: m.slice(PREFIJO_LESION.length), libre: '' };
  return { base: null, detalle: '', libre: m };
}

// base (+ detalle, solo si es Lesión) -> texto que se guarda
export function componerMotivo(base, detalle = '') {
  const d = limpiarDetalle(detalle);
  if (base === 'Lesión' && d) return `${PREFIJO_LESION}${d}`;
  return base;
}

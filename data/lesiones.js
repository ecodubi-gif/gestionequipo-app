// Lógica de lesiones (fechas en AAAA-MM-DD).
const dias = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);

export const estaActiva = (l) => !l.fecha_alta;

export function diasDeBaja(l, hoy) {
  const fin = l.fecha_alta || hoy;
  return Math.max(0, dias(l.fecha_inicio, fin));
}

// Días que faltan para la vuelta estimada: >0 faltan, 0 hoy, <0 se ha pasado; null si no hay estimación.
export function diasParaVuelta(l, hoy) {
  return l.fecha_vuelta_estimada ? dias(hoy, l.fecha_vuelta_estimada) : null;
}

export function textoVuelta(l, hoy) {
  if (l.fecha_alta) return `Alta el ${l.fecha_alta.split('-').reverse().join('/')}`;
  const d = diasParaVuelta(l, hoy);
  if (d == null) return 'Sin fecha de vuelta';
  if (d > 1) return `Vuelta estimada en ${d} días`;
  if (d === 1) return 'Vuelta estimada mañana';
  if (d === 0) return 'Vuelta estimada hoy';
  return `Vuelta estimada pasada hace ${-d} ${d === -1 ? 'día' : 'días'}: revisar`;
}

export const activasOrdenadas = (lesiones) =>
  lesiones.filter(estaActiva).sort((a, b) => (a.fecha_vuelta_estimada || '9999').localeCompare(b.fecha_vuelta_estimada || '9999'));

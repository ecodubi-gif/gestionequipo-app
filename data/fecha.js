// El servidor devuelve las fechas en formato AAAA-MM-DD (el estándar
// de bases de datos). Aquí las pasamos al formato que se lee en
// España: DD/MM/AAAA. Es manipulación de texto simple, sin pasar por
// un objeto Date, para no arriesgarnos a líos de zona horaria.
export function formatearFechaCorta(fechaISO) {
  if (!fechaISO) return '';
  const [anio, mes, dia] = fechaISO.split('-');
  if (!anio || !mes || !dia) return fechaISO;
  return `${dia}/${mes}/${anio}`;
}

// Fecha escrita a mano en España (DD/MM/AAAA; vale también con - o ., con año de 2 cifras o todo seguido ddmmaaaa)
// → AAAA-MM-DD, o null si no es una fecha real. Una fecha ya en AAAA-MM-DD también se acepta.
export function fechaDeTexto(texto) {
  const t = String(texto == null ? '' : texto).trim();
  let d; let m; let a;
  let r = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
  if (r) { a = +r[1]; m = +r[2]; d = +r[3]; } else {
    r = /^(\d{1,2})[/\-.\s](\d{1,2})[/\-.\s](\d{2}|\d{4})$/.exec(t) || /^(\d{2})(\d{2})(\d{4})$/.exec(t);
    if (!r) return null;
    d = +r[1]; m = +r[2]; a = r[3].length === 2 ? 2000 + +r[3] : +r[3];
  }
  const f = new Date(Date.UTC(a, m - 1, d));
  if (a < 2000 || a > 2100 || f.getUTCFullYear() !== a || f.getUTCMonth() !== m - 1 || f.getUTCDate() !== d) return null;
  return `${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
export const textoDeFecha = (iso) => formatearFechaCorta(iso || '');

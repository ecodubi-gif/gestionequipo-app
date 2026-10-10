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

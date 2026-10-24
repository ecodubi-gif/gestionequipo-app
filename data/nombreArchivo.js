// "el PDF del árbitro" → "pdf-del-arbitro-2026-10-24" (nombre del archivo que se descarga o se comparte).
export function nombreArchivo(texto, hoy = new Date()) {
  const base = String(texto || 'documento')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/^(el|la|los|las)\s+/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'documento';
  const fecha = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  return `${base}-${fecha}`;
}

// El "lugar" de un entrenamiento se guarda como texto: "Estadio Juan Benjumea · césped natural · Campo entero"
// o "Otro campo · Medio campo". Estas dos funciones lo componen y lo vuelven a separar para poder editarlo.

export const TIPOS_CAMPO = ['Campo entero', 'Medio campo'];
export const SUPERFICIES = ['césped natural', 'césped artificial'];

export function componerLugar({ superficie, nombreCampo, tipoCampo }, campoCasa) {
  const sitio = superficie === 'otro' ? String(nombreCampo || '').trim() : `${campoCasa} · ${superficie}`;
  return `${sitio} · ${tipoCampo}`;
}

export function parsearLugar(lugar, campoCasa) {
  const partes = String(lugar || '').split(' · ').map((p) => p.trim()).filter(Boolean);
  let tipoCampo = 'Campo entero';
  if (partes.length && TIPOS_CAMPO.includes(partes[partes.length - 1])) tipoCampo = partes.pop();
  if (partes[0] === campoCasa && SUPERFICIES.includes(partes[1])) return { superficie: partes[1], nombreCampo: '', tipoCampo };
  if (partes[0] === campoCasa && partes.length === 1) return { superficie: 'césped natural', nombreCampo: '', tipoCampo };
  return { superficie: 'otro', nombreCampo: partes.join(' · '), tipoCampo };
}

// Fecha y hora guardadas ("2026-10-18", "11:30:00") → ISO para los selectores.
export function aFechaHoraISO(fecha, hora) {
  const [y, m, d] = String(fecha || '').slice(0, 10).split('-').map(Number);
  const [h, mi] = String(hora || '00:00').split(':').map(Number);
  if (!y || !m || !d) return new Date().toISOString();
  return new Date(y, m - 1, d, h || 0, mi || 0).toISOString();
}

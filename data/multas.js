// Saldo de multas: lo que suman las multas menos lo pagado.
export const euros = (n) => `${(Math.round((Number(n) || 0) * 100) / 100).toFixed(2).replace('.', ',')} €`;

// Acepta "5", "5,50" o "5.5". Devuelve null si no es un importe válido (> 0).
export function leerImporte(texto) {
  const t = String(texto || '').trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  const n = Number(t);
  return n > 0 && n <= 10000 ? n : null;
}

export const totalPendiente = (saldos) => Math.round(saldos.reduce((s, x) => s + Math.max(0, x.saldo), 0) * 100) / 100;

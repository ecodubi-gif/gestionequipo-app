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

// Tarifa del club: cada multa se pone por concepto y el importe sale solo. El cuerpo técnico paga el doble.
export const TARIFAS = {
  amarilla: { etiqueta: 'Tarjeta amarilla', importe: 1.5 },
  roja: { etiqueta: 'Tarjeta roja', importe: 3 },
  retraso: { etiqueta: 'Retraso', importe: 1 },
  falta: { etiqueta: 'Falta', importe: 1.5 },
  indisciplina: { etiqueta: 'Indisciplina', importe: 5 },
  material: { etiqueta: 'No recoger material', importe: 1 },
  vestimenta: { etiqueta: 'Vestimenta', importe: 1 },
};
export const CONCEPTOS_MULTA = Object.keys(TARIFAS);
export const FACTOR_CUERPO_TECNICO = 2;

// Cuerpo técnico (multan y pagan lo mismo que un jugador, pero el doble).
export const CUERPO_TECNICO = [
  { miembro: 'delegado', nombre: 'José Luis Palacios San Román', cargo: 'Delegado' },
  { miembro: 'entrenador', nombre: 'Rolando Marcelo Bustos', cargo: 'Entrenador' },
  { miembro: 'segundo_entrenador', nombre: 'Eduardo José Rodríguez Gallego', cargo: '2º entrenador' },
];
export const nombreMiembro = (m) => CUERPO_TECNICO.find((x) => x.miembro === m)?.nombre || m;

export const ROLES_MULTAR = ['delegado', 'entrenador', 'segundo_entrenador'];

// Importe de un concepto: la tarifa, o el doble si es del cuerpo técnico.
export function importeMulta(tipo, esCuerpoTecnico) {
  const t = TARIFAS[tipo];
  if (!t) return null;
  return Math.round(t.importe * (esCuerpoTecnico ? FACTOR_CUERPO_TECNICO : 1) * 100) / 100;
}

// Quién recibe la multa: un jugador { jugador_id } o un miembro del cuerpo técnico { miembro }. Clave única de la fila.
export const clavePersona = (x) => (x.miembro ? `m:${x.miembro}` : `j:${x.jugador_id}`);

// Comprueba una multa nueva. Devuelve { error } o { cuerpo } listo para mandar al servidor (el importe lo calcula el servidor).
export function validarMulta({ persona, tipo, fecha }, fechaAISO) {
  if (!persona) return { error: 'Elige a quién se la pones.' };
  if (!TARIFAS[tipo]) return { error: 'Elige el concepto de la multa.' };
  const cuerpo = persona.miembro ? { miembro: persona.miembro, tipo } : { jugador_id: persona.jugador_id, tipo };
  if (String(fecha || '').trim()) {
    const f = fechaAISO ? fechaAISO(fecha) : null;
    if (!f) return { error: 'Escribe la fecha como 27/11/2026 o déjala en blanco para poner hoy.' };
    cuerpo.fecha = f;
  }
  return { cuerpo };
}

// Lo que suman las multas de asistencia (pasar lista) frente a las que lleva el apartado de multas (tarjetas y conceptos).
export const multasDeAsistencia = (saldo) => Math.round(((Number(saldo.multas) || 0) - (Number(saldo.multas_manuales) || 0)) * 100) / 100;

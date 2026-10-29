// Quién está hoy en el entreno según el pase de lista. Sin lista pasada (sin filas) no se filtra a nadie.
export const ESTADOS_PRESENTE = ['presente', 'retraso'];

// asistencias: [{ jugador: { id }, estado }] (lo que devuelve la API). Devuelve la lista de ids presentes o null si aún no se pasó lista.
export function presentesDe(asistencias) {
  const filas = asistencias || [];
  if (filas.length === 0) return null;
  return filas.filter((a) => ESTADOS_PRESENTE.includes(a.estado) && a.jugador).map((a) => a.jugador.id);
}

// Jugadores asignados a una tarea [{ jugador_id, rol }] que hoy siguen en el entreno.
export const soloPresentes = (asignados, presentes) => ((asignados || []).filter((a) => presentes === null || presentes === undefined || presentes.includes(a.jugador_id)));

// Las tareas con solo los jugadores presentes (para enseñarlas o contarlas en el entreno).
export const tareasConPresentes = (tareas, presentes) => (tareas || []).map((t) => ({ ...t, jugadores: soloPresentes(t.jugadores, presentes) }));

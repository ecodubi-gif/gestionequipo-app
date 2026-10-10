// Partido anterior a un entreno: cuál es y cuánta gente va a cada grupo del Entreno 1.
// Lo usan el panel del entreno, la sesión completa y la vista de la semana, para que den los mismos números.
import { MINUTOS_CORTE } from './planSesion';

// Un entreno cuenta como "el de después del partido" si es el primero tras el partido y no han pasado más de estos días.
export const DIAS_MAX_DESPUES_DEL_PARTIDO = 5;

// El servidor manda las fechas de los partidos en UTC; las pasamos al día local (AAAA-MM-DD).
export function diaLocal(iso) {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function diasEntre(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

export function detectarPartidoPrevio(entrenamiento, entrenamientos, partidos) {
  const finalizados = partidos
    .filter((p) => p.estado === 'finalizado')
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  for (const partido of finalizados) {
    const diaPartido = diaLocal(partido.fecha);
    if (entrenamiento.fecha <= diaPartido) continue; // el entreno es anterior (o del mismo día)
    const hayOtroEntre = entrenamientos.some(
      (e) => e.id !== entrenamiento.id && e.fecha > diaPartido && e.fecha < entrenamiento.fecha
    );
    if (hayOtroEntre) return null;
    if (diasEntre(diaPartido, entrenamiento.fecha) > DIAS_MAX_DESPUES_DEL_PARTIDO) return null;
    return partido;
  }
  return null;
}

const esPortero = (j) => (j.posicion || '').toLowerCase().startsWith('port');

/**
 * Cuánta gente de campo va a cada grupo del Entreno 1: { recuperacion, compensacion }, o null si no hay datos
 * del partido anterior (entonces la carga prevista cuenta los dos grupos por igual).
 * jugadores: los activos. minutosPartido: { [jugadorId]: minutos }. Los porteros no cuentan.
 */
export function pesosGrupos(jugadores, minutosPartido) {
  if (!minutosPartido) return null;
  let recuperacion = 0;
  let compensacion = 0;
  for (const j of jugadores || []) {
    if (esPortero(j)) continue;
    if ((minutosPartido[j.id] || 0) >= MINUTOS_CORTE) recuperacion += 1;
    else compensacion += 1;
  }
  if (recuperacion + compensacion === 0) return null;
  return { recuperacion, compensacion };
}

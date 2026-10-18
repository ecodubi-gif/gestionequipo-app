// Carga del partido anterior a un entreno (convocatoria + minutos jugados), con las llamadas a la API.
import { obtenerConvocatoriaApi, listarEventosApi, listarMinutosManualesApi } from './apiClient';
import { calcularMinutosJugados } from './minutos';
import { detectarPartidoPrevio } from './partidoPrevio';

/** { partido, convocatoria, minutos, sinMinutoFinal } o null si no hay partido anterior que cuente. */
export async function cargarPartidoPrevio(entrenamiento, entrenamientos, partidos) {
  const previo = detectarPartidoPrevio(entrenamiento, entrenamientos, partidos);
  if (!previo) return null;
  const [conv, evs, manuales] = await Promise.all([obtenerConvocatoriaApi(previo.id), listarEventosApi(previo.id), listarMinutosManualesApi(previo.id)]);
  const maxMinuto = evs.reduce((m, e) => Math.max(m, e.minuto || 0), 0);
  const sinMinutoFinal = previo.minuto_final == null;
  const minutoFinal = previo.minuto_final ?? Math.max(maxMinuto, 1);
  return { partido: previo, convocatoria: conv, minutos: calcularMinutosJugados(conv, evs, minutoFinal, manuales), sinMinutoFinal };
}

/** Minutos jugados por jugador: { [id]: minutos } (o null si no hay partido anterior). */
export const minutosPorJugador = (postPartido) =>
  postPartido ? Object.fromEntries(postPartido.minutos.map((m) => [m.id, m.minutosJugados])) : null;

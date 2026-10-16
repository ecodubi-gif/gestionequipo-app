// Carga del equipo semana a semana (para la gráfica de 6 semanas).
// Carga de una semana = suma de la carga de sus entrenos (duración × RPE medio)
//   + la carga media por jugador de los partidos (RPE × minutos, promediada entre quienes jugaron).
// Es una cifra del equipo, orientativa. La de cada jugador está en la pantalla de RPE.
import { cargaSesion, cargaPartido } from './carga';

export const FACTOR_SUBIDA_BRUSCA = 1.3;   // más de 1,3 veces la media de las 3 semanas anteriores
export const SEMANAS_REFERENCIA = 3;

export function cargaEquipoSemana(semana) {
  if (!semana) return 0;
  let total = 0;
  for (const e of semana.entrenamientos || []) total += cargaSesion(e.duracion_minutos, e.rpe_medio) || 0;
  for (const p of semana.partidos || []) {
    const cargas = (p.rpe || []).map((r) => cargaPartido(r.rpe, r.minutos)).filter((c) => c > 0);
    if (cargas.length) total += Math.round(cargas.reduce((s, c) => s + c, 0) / cargas.length);
  }
  return total;
}

// semanas: de la más antigua a la más reciente. Devuelve una barra por semana.
export function serieCarga(semanas) {
  const cargas = (semanas || []).map(cargaEquipoSemana);
  return (semanas || []).map((s, i) => {
    const previas = cargas.slice(Math.max(0, i - SEMANAS_REFERENCIA), i).filter((c) => c > 0);
    const media = previas.length >= 2 ? previas.reduce((a, b) => a + b, 0) / previas.length : null;
    const carga = cargas[i];
    const ratio = media && carga > 0 ? Math.round((carga / media) * 100) / 100 : null;
    return { lunes: s.lunes, carga, ratio, subidaBrusca: ratio != null && ratio > FACTOR_SUBIDA_BRUSCA };
  });
}

export function avisoSubida(serie) {
  const ultima = serie[serie.length - 1];
  if (!ultima || !ultima.subidaBrusca) return null;
  return `Esta semana la carga es ${Math.round((ultima.ratio - 1) * 100)} % mayor que la media de las anteriores. Es un dato orientativo, no una orden.`;
}

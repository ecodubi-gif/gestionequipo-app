// Carga de entrenamiento (método RPE) y riesgo de lesión (ratio agudo:crónico, ACWR).
//
// Carga de una sesión   = duración (min) × RPE medio del equipo   (igual para todos los que asistieron)
// Carga de un partido   = RPE del jugador × minutos que jugó      (individual)
// Carga semanal de un jugador = suma de sus cargas de la semana (lunes a domingo)
// Ratio ACWR            = carga de la semana actual / media de sus cargas en las últimas 4 semanas completas

export const SEMANAS_CRONICAS = 4;        // semanas anteriores que entran en la media
export const MIN_SEMANAS_CRONICAS = 2;    // mínimo de semanas anteriores para dar un semáforo fiable
export const RANGO_SEGURO = [0.8, 1.3];   // dentro de este rango: zona segura
export const UMBRAL_RIESGO = 1.5;         // por encima: pico de carga

export const cargaSesion = (duracionMinutos, rpeMedio) =>
  duracionMinutos > 0 && rpeMedio > 0 ? Math.round(duracionMinutos * rpeMedio) : null;

export const cargaPartido = (rpe, minutos) => (rpe > 0 && minutos > 0 ? Math.round(rpe * minutos) : 0);

// Una semana tiene la forma:
// { lunes, entrenamientos: [{ id, duracion_minutos, rpe_medio, asistentes: [jugadorId] }],
//   partidos: [{ id, estado, rpe: [{ jugador_id, rpe, minutos }] }] }

// "Completa" = hay entrenos, todos con su carga puesta, y los partidos terminados con su RPE.
// Una semana sin partido puede estar completa.
export function semanaCompleta(semana) {
  if (!semana || semana.entrenamientos.length === 0) return false;
  if (!semana.entrenamientos.every((e) => cargaSesion(e.duracion_minutos, e.rpe_medio) != null)) return false;
  return semana.partidos.filter((p) => p.estado === 'finalizado').every((p) => p.rpe.length > 0);
}

export function cargaJugadorSemana(semana, jugadorId) {
  let total = 0;
  for (const e of semana.entrenamientos) {
    const carga = cargaSesion(e.duracion_minutos, e.rpe_medio);
    if (carga != null && e.asistentes.includes(jugadorId)) total += carga;
  }
  for (const p of semana.partidos) {
    const r = p.rpe.find((x) => x.jugador_id === jugadorId);
    if (r) total += cargaPartido(r.rpe, r.minutos);
  }
  return total;
}

// semanas: de la más antigua a la más reciente. indiceActual: la que se está viendo.
export function riesgoJugador(semanas, indiceActual, jugadorId) {
  const actual = semanas[indiceActual];
  if (!semanaCompleta(actual)) return { zona: 'semana_incompleta', ratio: null, semanasUsadas: 0, carga: cargaJugadorSemana(actual, jugadorId) };

  const previas = semanas.slice(0, indiceActual).filter(semanaCompleta).slice(-SEMANAS_CRONICAS);
  const carga = cargaJugadorSemana(actual, jugadorId);
  if (previas.length < MIN_SEMANAS_CRONICAS) return { zona: 'sin_datos', ratio: null, semanasUsadas: previas.length, carga };

  const cronica = previas.reduce((s, sem) => s + cargaJugadorSemana(sem, jugadorId), 0) / previas.length;
  if (cronica <= 0) return { zona: 'sin_datos', ratio: null, semanasUsadas: previas.length, carga };

  const bruto = carga / cronica;
  let zona = 'atencion'; // por debajo de 0.8 también: una bajada brusca de carga es un riesgo conocido
  if (bruto >= RANGO_SEGURO[0] && bruto <= RANGO_SEGURO[1]) zona = 'segura';
  else if (bruto > UMBRAL_RIESGO) zona = 'riesgo';
  return { zona, ratio: Math.round(bruto * 100) / 100, semanasUsadas: previas.length, carga };
}

// Fatiga media del equipo en la semana: media de la carga de los jugadores que tuvieron alguna.
export function fatigaMediaEquipo(semana, jugadorIds) {
  const cargas = jugadorIds.map((id) => cargaJugadorSemana(semana, id)).filter((c) => c > 0);
  return cargas.length ? Math.round(cargas.reduce((a, b) => a + b, 0) / cargas.length) : 0;
}

export const ZONAS = {
  segura: { texto: 'Zona segura', color: '#16a34a', fondo: '#dcfce7' },
  atencion: { texto: 'Atención', color: '#ca8a04', fondo: '#fef9c3' },
  riesgo: { texto: 'Riesgo alto', color: '#dc2626', fondo: '#fee2e2' },
  sin_datos: { texto: 'Faltan semanas', color: '#6b7280', fondo: '#f3f4f6' },
  semana_incompleta: { texto: 'Semana incompleta', color: '#6b7280', fondo: '#f3f4f6' },
};

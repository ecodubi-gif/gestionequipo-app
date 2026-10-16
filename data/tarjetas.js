// Tarjetas acumuladas por jugador a partir de los eventos de todos los partidos (los registra el delegado en directo).
// Solo cuentan las de nuestros jugadores (las del rival no llevan jugador_id) y se ignoran los partidos de prueba.
export const CICLO_POR_DEFECTO = 5; // amarillas que cumplen ciclo y suponen un partido de sanción; revisa el reglamento de tu competición
export const CICLOS_POSIBLES = [3, 4, 5];

export const esPartidoDePrueba = (p) => /^PRUEBA/i.test(String(p.equipo_local || '')) || /^PRUEBA/i.test(String(p.equipo_visitante || ''));

// partidos: [{ id, fecha, equipo_local, equipo_visitante, es_local, ... }]; eventosPorPartido: { [partidoId]: [evento] }
export function acumularTarjetas(partidos, eventosPorPartido, ciclo = CICLO_POR_DEFECTO) {
  const por = new Map();
  const rival = (p) => (p.es_local ? p.equipo_visitante : p.equipo_local);
  const ordenados = partidos.filter((p) => !esPartidoDePrueba(p)).slice().sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
  for (const p of ordenados) {
    for (const e of eventosPorPartido[p.id] || []) {
      if ((e.tipo !== 'amarilla' && e.tipo !== 'roja') || e.jugador_id == null) continue;
      const f = por.get(e.jugador_id) || { jugador_id: e.jugador_id, amarillas: 0, rojas: 0, detalle: [] };
      if (e.tipo === 'amarilla') f.amarillas++; else f.rojas++;
      f.detalle.push({ partido_id: p.id, fecha: p.fecha, rival: rival(p), tipo: e.tipo, minuto: e.minuto ?? null });
      por.set(e.jugador_id, f);
    }
  }
  return [...por.values()].map((f) => {
    const enCiclo = f.amarillas % ciclo; // amarillas del ciclo actual
    return { ...f, ciclosCumplidos: Math.floor(f.amarillas / ciclo), enCiclo, apercibido: enCiclo === ciclo - 1 };
  }).sort((a, b) => (b.apercibido - a.apercibido) || (b.amarillas + b.rojas * 2) - (a.amarillas + a.rojas * 2) || a.jugador_id - b.jugador_id);
}

export const textoCiclo = (f, ciclo) => (f.apercibido ? `⚠️ Apercibido: la próxima amarilla cumple ciclo (${ciclo})` : `${f.enCiclo}/${ciclo} en este ciclo${f.ciclosCumplidos ? ` · ${f.ciclosCumplidos} ciclo(s) cumplido(s)` : ''}`);

// Resumen para mandar por WhatsApp (solo jugadores con tarjetas).
export function textoTarjetas(filas, jugadoresPorId, ciclo) {
  if (!filas.length) return 'Sin tarjetas registradas.';
  const nom = (id) => { const j = jugadoresPorId[id]; return j ? `${j.dorsal != null && j.dorsal !== '' ? `${j.dorsal} ` : ''}${j.apodo || j.nombre}` : `Jugador ${id}`; };
  return ['🟨 Tarjetas acumuladas', ...filas.map((f) => `${f.apercibido ? '⚠️ ' : ''}${nom(f.jugador_id)}: ${f.amarillas}🟨${f.rojas ? ` ${f.rojas}🟥` : ''}${f.apercibido ? ` (a una del ciclo de ${ciclo})` : ''}`)].join('\n');
}

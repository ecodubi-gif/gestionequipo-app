// Tarjetas acumuladas por jugador a partir de los eventos de todos los partidos (los registra el delegado en directo).
// Solo cuentan las de nuestros jugadores (las del rival no llevan jugador_id) y se ignoran los partidos de prueba.
export const CICLO_POR_DEFECTO = 5; // amarillas que cumplen ciclo y suponen un partido de sanción; revisa el reglamento de tu competición
export const CICLOS_POSIBLES = [3, 4, 5];

export const esPartidoDePrueba = (p) => /^PRUEBA/i.test(String(p.equipo_local || '')) || /^PRUEBA/i.test(String(p.equipo_visitante || ''));

// partidos: [{ id, fecha, equipo_local, equipo_visitante, es_local, ... }]; eventosPorPartido: { [partidoId]: [evento] }
// ajustes: [{ jugador_id, tipo: 'amarillas'|'rojas'|'sancion', cantidad, hasta }] — tarjetas anteriores a la app o correcciones de acta.
export function acumularTarjetas(partidos, eventosPorPartido, ciclo = CICLO_POR_DEFECTO, ajustes = []) {
  const por = new Map();
  for (const a of ajustes) {
    if ((a.tipo !== 'amarillas' && a.tipo !== 'rojas') || !a.cantidad) continue;
    const f = por.get(a.jugador_id) || { jugador_id: a.jugador_id, amarillas: 0, rojas: 0, detalle: [] };
    if (a.tipo === 'amarillas') f.amarillas += a.cantidad; else f.rojas += a.cantidad;
    f.detalle.push({ partido_id: null, fecha: null, rival: 'ajuste manual', tipo: a.tipo === 'rojas' ? 'roja' : 'amarilla', minuto: null, cantidad: a.cantidad });
    por.set(a.jugador_id, f);
  }
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

const dia = (f) => String(f || '').slice(0, 10);

// Quién llega apercibido o sancionado a un partido (el próximo, normalmente).
// Sancionado: completó un ciclo de amarillas o vio una roja en el último partido jugado antes de este, o tiene una sanción manual con fecha que cubre el partido.
// Devuelve { [jugador_id]: { sancionado: bool, motivo: string, apercibido: bool, amarillas } }. La sanción real la fija el Comité: es un aviso.
export function estadoParaPartido(objetivo, partidos, eventosPorPartido, ajustes = [], ciclo = CICLO_POR_DEFECTO) {
  const previos = partidos
    .filter((p) => !esPartidoDePrueba(p) && p.id !== objetivo.id && (p.estado === 'finalizado' || p.estado === 'en_curso') && dia(p.fecha) < dia(objetivo.fecha))
    .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
  const ultimo = previos[previos.length - 1];
  const cuenta = new Map();
  for (const a of ajustes) if (a.tipo === 'amarillas' && a.cantidad) cuenta.set(a.jugador_id, (cuenta.get(a.jugador_id) || 0) + a.cantidad);
  const sanciones = new Map();
  const marca = (id, motivo) => { if (!sanciones.has(id)) sanciones.set(id, motivo); };
  for (const p of previos) {
    for (const e of eventosPorPartido[p.id] || []) {
      if (e.jugador_id == null) continue;
      if (e.tipo === 'amarilla') {
        const antes = cuenta.get(e.jugador_id) || 0; cuenta.set(e.jugador_id, antes + 1);
        if (p === ultimo && Math.floor((antes + 1) / ciclo) > Math.floor(antes / ciclo)) marca(e.jugador_id, `completó ciclo de ${ciclo} amarillas`);
      } else if (e.tipo === 'roja' && p === ultimo) marca(e.jugador_id, 'roja en el último partido (revisa los partidos de sanción)');
    }
  }
  for (const a of ajustes) if (a.tipo === 'sancion' && a.hasta && dia(objetivo.fecha) <= dia(a.hasta)) marca(a.jugador_id, `sanción hasta el ${dia(a.hasta).split('-').reverse().join('/')}${a.nota ? ` (${a.nota})` : ''}`);
  const salida = {};
  for (const [id, n] of cuenta) salida[id] = { sancionado: false, motivo: '', apercibido: n % ciclo === ciclo - 1, amarillas: n };
  for (const [id, motivo] of sanciones) salida[id] = { ...(salida[id] || { apercibido: false, amarillas: 0 }), sancionado: true, motivo, apercibido: false };
  return salida;
}

// '27/11/2026', '27-11-26' o '2026-11-27' → '2026-11-27'; null si no es una fecha válida.
export function fechaISO(texto) {
  const t = String(texto || '').trim();
  let a; let m; let d;
  let r = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (r) { [, a, m, d] = r; } else {
    r = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/);
    if (!r) return null;
    [, d, m, a] = r; if (a.length === 2) a = `20${a}`;
  }
  const A = Number(a); const M = Number(m); const D = Number(d);
  const f = new Date(Date.UTC(A, M - 1, D));
  if (f.getUTCFullYear() !== A || f.getUTCMonth() !== M - 1 || f.getUTCDate() !== D) return null;
  return `${String(A).padStart(4, '0')}-${String(M).padStart(2, '0')}-${String(D).padStart(2, '0')}`;
}

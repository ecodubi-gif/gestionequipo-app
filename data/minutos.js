// Quién está en el campo y cuántos minutos juega cada uno, a partir de la convocatoria y de los eventos del partido.
// Lo usan el registro del partido, el informe y el panel del entreno, para que den siempre los mismos números.
// Un jugador puede salir y volver a entrar las veces que haga falta (como permiten estas ligas); solo la roja
// le deja fuera del partido para siempre.

function nombreCompleto(jugador) {
  if (!jugador) return '';
  return `${jugador.nombre} ${jugador.apellidos || ''}`.trim();
}

// Los eventos que cambian quién juega, en orden cronológico (a igual minuto, por orden de creación).
function eventosDeJuego(eventos) {
  return (eventos || [])
    .filter((e) => e.tipo === 'cambio' || (e.tipo === 'roja' && e.jugador_id))
    .map((e, i) => ({ e, i }))
    .sort((a, b) => (a.e.minuto - b.e.minuto) || ((a.e.id ?? 0) - (b.e.id ?? 0)) || (a.i - b.i))
    .map((x) => x.e);
}

// Recorre el partido y devuelve, por jugador, los tramos jugados [{desde, hasta}] (hasta null = sigue en el campo),
// quién está ahora en el campo y quién está expulsado.
function recorrer(convocatoria, eventos) {
  const tramos = new Map();
  const enCampo = new Set();
  const expulsados = new Set();
  const entrar = (id, minuto) => {
    if (id == null || enCampo.has(id) || expulsados.has(id)) return;
    enCampo.add(id);
    if (!tramos.has(id)) tramos.set(id, []);
    tramos.get(id).push({ desde: minuto, hasta: null });
  };
  const salir = (id, minuto) => {
    if (id == null || !enCampo.has(id)) return;
    enCampo.delete(id);
    const t = tramos.get(id);
    t[t.length - 1].hasta = minuto;
  };
  convocatoria.filter((c) => c.titular).forEach((c) => entrar(c.jugador.id, 0));
  eventosDeJuego(eventos).forEach((e) => {
    if (e.tipo === 'cambio') {
      salir(e.jugador_sale_id, e.minuto);
      entrar(e.jugador_entra_id, e.minuto);
    } else {
      salir(e.jugador_id, e.minuto);
      expulsados.add(e.jugador_id);
    }
  });
  return { tramos, enCampo, expulsados };
}

export function jugadoresEnCampo(convocatoria, eventos) {
  const { enCampo } = recorrer(convocatoria, eventos);
  return convocatoria.filter((c) => enCampo.has(c.jugador.id)).map((c) => c.jugador);
}

// Pueden entrar todos los convocados que ahora no están en el campo, aunque ya hayan jugado, salvo los expulsados.
export function jugadoresEnBanquillo(convocatoria, eventos) {
  const { enCampo, expulsados } = recorrer(convocatoria, eventos);
  return convocatoria.filter((c) => !enCampo.has(c.jugador.id) && !expulsados.has(c.jugador.id)).map((c) => c.jugador);
}

export function calcularMinutosJugados(convocatoria, eventos, minutoFinal) {
  const { tramos } = recorrer(convocatoria, eventos);
  return convocatoria.map((c) => {
    const t = tramos.get(c.jugador.id);
    if (!t) {
      return { id: c.jugador.id, nombre: nombreCompleto(c.jugador), titular: Boolean(c.titular), jugo: false, minutosJugados: 0 };
    }
    const total = t.reduce((suma, x) => suma + Math.max(0, Math.min(x.hasta ?? minutoFinal, minutoFinal) - x.desde), 0);
    return { id: c.jugador.id, nombre: nombreCompleto(c.jugador), titular: Boolean(c.titular), jugo: true, minutosJugados: total };
  });
}

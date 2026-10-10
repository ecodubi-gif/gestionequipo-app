// Cálculo de minutos jugados de cada jugador de la convocatoria en un
// partido. Lo usan el informe del partido y el panel del entreno, para
// que los dos den siempre los mismos números.

function nombreCompleto(jugador) {
  if (!jugador) return '';
  return `${jugador.nombre} ${jugador.apellidos || ''}`.trim();
}

export function calcularMinutosJugados(convocatoria, eventos, minutoFinal) {
  return convocatoria.map((c) => {
    const cambioSalida = eventos.find((e) => e.tipo === 'cambio' && e.jugador_sale_id === c.jugador.id);
    const cambioEntrada = eventos.find((e) => e.tipo === 'cambio' && e.jugador_entra_id === c.jugador.id);
    const expulsion = eventos.find((e) => e.tipo === 'roja' && e.jugador_id === c.jugador.id);

    if (!c.titular && !cambioEntrada) {
      return { id: c.jugador.id, nombre: nombreCompleto(c.jugador), titular: false, jugo: false, minutosJugados: 0 };
    }

    const inicio = c.titular ? 1 : cambioEntrada.minuto;
    let fin = minutoFinal;
    if (cambioSalida) fin = Math.min(fin, cambioSalida.minuto);
    if (expulsion) fin = Math.min(fin, expulsion.minuto);

    return {
      id: c.jugador.id,
      nombre: nombreCompleto(c.jugador),
      titular: c.titular,
      jugo: true,
      minutosJugados: Math.max(0, fin - (c.titular ? 0 : inicio)),
    };
  });
}

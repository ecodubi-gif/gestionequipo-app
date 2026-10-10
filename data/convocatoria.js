// Cambios de una convocatoria respecto a la que ya estaba guardada: para que, ante una baja de última
// hora, se vea de un vistazo qué se está tocando (y qué hay que volver a enviar a jugadores y árbitro).

// original:  { [jugadorId]: 'titular' | 'suplente' }   solo los convocados que había guardados
// seleccion: { [jugadorId]: 'no' | 'suplente' | 'titular' }   lo que hay ahora en pantalla
export function diferenciasConvocatoria(original, seleccion, capitanOriginal, capitanActual) {
  const ahora = (id) => seleccion[id] || 'no';
  const idsOriginal = Object.keys(original).map(Number);
  const idsAhora = Object.keys(seleccion).map(Number).filter((id) => ahora(id) !== 'no');

  const bajas = idsOriginal.filter((id) => ahora(id) === 'no');
  const altas = idsAhora.filter((id) => !(id in original));
  const aTitular = idsAhora.filter((id) => original[id] === 'suplente' && ahora(id) === 'titular');
  const aSuplente = idsAhora.filter((id) => original[id] === 'titular' && ahora(id) === 'suplente');
  const capitanCambia = (capitanOriginal ?? null) !== (capitanActual ?? null);

  return {
    bajas, altas, aTitular, aSuplente,
    capitan: capitanCambia ? { antes: capitanOriginal ?? null, ahora: capitanActual ?? null } : null,
    hayCambios: bajas.length + altas.length + aTitular.length + aSuplente.length > 0 || capitanCambia,
  };
}

// Frases para enseñar al usuario. nombrePorId: (id) => 'Nombre Apellidos'
export function resumenCambios(dif, nombrePorId) {
  const lineas = [];
  dif.bajas.forEach((id) => lineas.push(`Baja: ${nombrePorId(id)}`));
  dif.altas.forEach((id) => lineas.push(`Entra: ${nombrePorId(id)}`));
  dif.aTitular.forEach((id) => lineas.push(`Pasa a titular: ${nombrePorId(id)}`));
  dif.aSuplente.forEach((id) => lineas.push(`Pasa a suplente: ${nombrePorId(id)}`));
  if (dif.capitan) {
    const antes = dif.capitan.antes ? nombrePorId(dif.capitan.antes) : 'nadie';
    const ahora = dif.capitan.ahora ? nombrePorId(dif.capitan.ahora) : 'sin capitán';
    lineas.push(`Capitán: ${antes} → ${ahora}`);
  }
  return lineas;
}

export const titularesDe = (seleccion) => Object.values(seleccion).filter((v) => v === 'titular').length;
export const suplentesDe = (seleccion) => Object.values(seleccion).filter((v) => v === 'suplente').length;

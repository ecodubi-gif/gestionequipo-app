// Penaltis de un partido. Un penalti se guarda como un tiro (así cuenta en tiros, tiros a puerta, goles y marcador)
// con la marca penalti = true. Funciones puras, para poder probarlas.

export const esPenalti = (e) => Boolean(e) && e.tipo === 'tiro' && (e.penalti === true || e.penalti === 1 || e.penalti === '1');

// Resultado de un penalti: gol, parada del portero o fuera (incluye el poste).
export const RESULTADOS_PENALTI = ['gol', 'parada', 'fuera'];
export const ETIQUETA_RESULTADO_PENALTI = { gol: 'Gol', parada: 'Parado', fuera: 'Fuera / poste' };

// Penaltis lanzados por un lado ('local' | 'visitante'): { lanzados, marcados, parados, fallados }.
export function resumenPenaltis(eventos, lado) {
  const mios = (eventos || []).filter((e) => esPenalti(e) && e.equipo === lado);
  const marcados = mios.filter((e) => e.resultado === 'gol').length;
  const parados = mios.filter((e) => e.resultado === 'parada').length;
  return { lanzados: mios.length, marcados, parados, fallados: mios.length - marcados - parados };
}

// "1/2" (marcados/lanzados) o "0" si no hubo ninguno: para la tabla de estadísticas.
export const textoPenaltis = (r) => (r.lanzados === 0 ? '0' : `${r.marcados}/${r.lanzados}`);

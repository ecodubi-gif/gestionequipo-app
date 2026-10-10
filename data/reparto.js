// Reparto automático de jugadores en una tarea: propone quién va con cada rol según quién está disponible,
// la posición, el grupo (Recuperación / Compensación del primer entreno) y el riesgo de carga.
// Es una PROPUESTA: el entrenador la ajusta tocando a cada jugador.
import { rolSugerido, contarRoles } from './tareas';
import { MINUTOS_CORTE } from './planSesion';

const esPortero = (j) => (j.posicion || '').toLowerCase().startsWith('port');
const ROLES_CAMPO = ['ataque', 'defensa', 'comodin'];
const porDorsal = (a, b) => (a.dorsal ?? 999) - (b.dorsal ?? 999);

// ¿Esta tarea es de un grupo del primer entreno? (Entreno 1, parte central o cierre, objetivo Recuperación/Compensación)
export function grupoDeTarea({ tipo, bloque, objetivo }) {
  return tipo === 1 && ['parte_central', 'cierre_tactico'].includes(bloque) && ['recuperacion', 'compensacion'].includes(objetivo) ? objetivo : null;
}

// ¿Este jugador de campo es del grupo? Recuperación = MINUTOS_CORTE o más en el partido anterior; el resto, Compensación.
// Sin datos del partido no se puede decidir: entran todos.
export function esDelGrupo(jugador, grupo, minutosPartido) {
  if (!grupo || !minutosPartido) return true;
  const recuperacion = (minutosPartido[jugador.id] || 0) >= MINUTOS_CORTE;
  return grupo === 'recuperacion' ? recuperacion : !recuperacion;
}

/**
 * jugadores:  los que pueden entrar hoy (presentes y sin readaptación aparte)
 * conteo:     { ataque, defensa, comodin, portero } que quiere el entrenador; si todo es 0, entran todos por su posición
 * grupo:      'recuperacion' | 'compensacion' | null
 * riesgoDe:   (id) => 'riesgo' | 'atencion' | null
 * Devuelve { asignaciones: {id: rol}, sinSitio: [jugador], faltan: {rol: n}, fueraDeGrupo: n }
 */
export function proponerReparto({ jugadores, conteo = {}, grupo = null, minutosPartido = null, riesgoDe = () => null }) {
  const objetivo = { ataque: 0, defensa: 0, comodin: 0, portero: 0, ...conteo };
  const hayObjetivo = Object.values(objetivo).some((n) => n > 0);

  const porteros = jugadores.filter(esPortero).sort(porDorsal);
  const deCampo = jugadores.filter((j) => !esPortero(j));
  const delGrupo = deCampo.filter((j) => esDelGrupo(j, grupo, minutosPartido)).sort(porDorsal);
  const fueraDeGrupo = deCampo.length - delGrupo.length;

  const asignaciones = {};

  if (!hayObjetivo) {
    // Sin formato elegido: todos los del grupo según su posición (y los porteros, si la tarea no es de un grupo).
    delGrupo.forEach((j) => { const r = rolSugerido(j.posicion); if (r && r !== 'portero') asignaciones[j.id] = r; });
    if (!grupo) porteros.forEach((j) => { asignaciones[j.id] = 'portero'; });
    return { asignaciones, sinSitio: [], faltan: {}, fueraDeGrupo };
  }

  // Porteros: los que pidas, si los hay.
  const porteroDe = porteros.slice(0, objetivo.portero);
  porteroDe.forEach((j) => { asignaciones[j.id] = 'portero'; });

  // Jugadores de campo: primero los que no tienen aviso de carga (los de riesgo van a comodín, el rol menos exigente).
  const aviso = (j) => riesgoDe(j.id);
  const libres = delGrupo.filter((j) => !aviso(j));
  const conAviso = delGrupo.filter((j) => aviso(j));
  const disponibles = [...libres, ...conAviso];

  const pendientes = new Set(disponibles.map((j) => j.id));
  const porId = Object.fromEntries(disponibles.map((j) => [j.id, j]));
  const huecos = { ataque: objetivo.ataque, defensa: objetivo.defensa, comodin: objetivo.comodin };

  // 1) cada jugador a su rol natural, mientras queden huecos (los de riesgo no entran en ataque/defensa si hay otros)
  for (const rol of ['ataque', 'defensa', 'comodin']) {
    for (const j of disponibles) {
      if (huecos[rol] <= 0) break;
      if (!pendientes.has(j.id)) continue;
      if (rolSugerido(j.posicion) !== rol) continue;
      if (aviso(j) && rol !== 'comodin') continue;
      asignaciones[j.id] = rol; pendientes.delete(j.id); huecos[rol] -= 1;
    }
  }
  // 2) los huecos que queden se rellenan con quien sobre (primero los de riesgo, en comodín)
  for (const rol of ['comodin', 'ataque', 'defensa']) {
    for (const id of [...pendientes]) {
      if (huecos[rol] <= 0) break;
      const j = porId[id];
      if (aviso(j) && rol !== 'comodin') continue;
      asignaciones[id] = rol; pendientes.delete(id); huecos[rol] -= 1;
    }
  }
  // 3) lo último: si aún faltan jugadores y solo quedan los de riesgo, entran igualmente (el entrenador decide)
  for (const rol of ROLES_CAMPO) {
    for (const id of [...pendientes]) {
      if (huecos[rol] <= 0) break;
      asignaciones[id] = rol; pendientes.delete(id); huecos[rol] -= 1;
    }
  }

  const faltan = {};
  for (const rol of ROLES_CAMPO) if (huecos[rol] > 0) faltan[rol] = huecos[rol];
  if (objetivo.portero > porteroDe.length) faltan.portero = objetivo.portero - porteroDe.length;
  const sinSitio = [...pendientes].map((id) => porId[id]).sort(porDorsal);
  return { asignaciones, sinSitio, faltan, fueraDeGrupo };
}

// Texto corto para decirle al entrenador qué ha pasado con la propuesta.
export function resumenReparto(r, conteoInicial = {}) {
  const lineas = [];
  const c = contarRoles(r.asignaciones);
  lineas.push(`Propuesta: ${c.ataque} ataque · ${c.defensa} defensa · ${c.comodin} comodines${c.portero ? ` · ${c.portero} porteros` : ''}.`);
  const nombresRol = { ataque: 'ataque', defensa: 'defensa', comodin: 'comodines', portero: 'porteros' };
  const faltan = Object.entries(r.faltan || {}).map(([rol, n]) => `${n} de ${nombresRol[rol]}`);
  if (faltan.length) lineas.push(`No hay jugadores suficientes: faltan ${faltan.join(', ')}.`);
  if (r.sinSitio && r.sinSitio.length) lineas.push(`${r.sinSitio.length} jugador(es) disponibles se quedan sin sitio en esta tarea (pueden rotar).`);
  if (r.fueraDeGrupo) lineas.push(`${r.fueraDeGrupo} jugador(es) quedan fuera por ser del otro grupo.`);
  return lineas;
}

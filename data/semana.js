// Plantilla de semana: para cada tipo de entreno (1, 2, 3) hay un perfil del día (fase del juego, puntal
// físico, densidad de espacio, gestión del grupo) y una lista de tareas propuestas. Se pueden cargar en una
// sesión (quedan como tareas normales, editables) y se puede guardar una sesión como nueva plantilla.
import { segundosDe } from './tareas';

export const MAX_TAREAS_PLANTILLA = 12; // el servidor no admite más

export const CAMPOS_PERFIL = [
  { clave: 'fase', etiqueta: 'Fase del juego' },
  { clave: 'puntal', etiqueta: 'Puntal físico' },
  { clave: 'densidad', etiqueta: 'Densidad espacial' },
  { clave: 'gestion', etiqueta: 'Gestión de la plantilla', multilinea: true },
];

const CAMPOS_TAREA = [
  'bloque', 'nombre', 'objetivo', 'referencia', 'n_ataque', 'n_defensa', 'n_comodines', 'n_porteros',
  'largo', 'ancho', 'series', 'pausa_seg', 'descripcion',
];

// Lo que se manda al servidor para crear una tarea a partir de una de la plantilla (sin jugadores:
// los asigna el entrenador, o el reparto automático, según quién esté disponible ese día).
export function tareaDesdePlantilla(t) {
  const datos = { jugadores: [], duracion_seg: segundosDe(t) };
  for (const c of CAMPOS_TAREA) if (t[c] !== undefined) datos[c] = t[c];
  datos.duracion_min = Math.max(1, Math.round(datos.duracion_seg / 60)); // compatibilidad con servidores sin segundos
  return datos;
}

// Tareas de la plantilla que se pueden añadir a una sesión: las que no estén ya (mismo bloque y mismo nombre).
export function tareasPorCargar(semana, existentes) {
  const ya = new Set((existentes || []).map((t) => `${t.bloque}|${(t.nombre || '').trim().toLowerCase()}`));
  const todas = (semana && semana.tareas) || [];
  const nuevas = todas.filter((t) => !ya.has(`${t.bloque}|${(t.nombre || '').trim().toLowerCase()}`));
  return { nuevas, repetidas: todas.length - nuevas.length };
}

// Las tareas de una sesión convertidas en las de una plantilla (se quitan los ids y los jugadores).
export function tareasParaPlantilla(tareas) {
  return (tareas || []).map((t) => {
    const seg = segundosDe(t);
    const r = { duracion_seg: Math.min(3600, Math.max(5, seg || 360)) };
    for (const c of CAMPOS_TAREA) r[c] = t[c] === undefined ? null : t[c];
    if (!r.referencia) r.referencia = 'sin_referencia';
    for (const n of ['n_ataque', 'n_defensa', 'n_comodines', 'n_porteros']) r[n] = r[n] || 0;
    r.pausa_seg = r.pausa_seg || 0;
    return r;
  });
}

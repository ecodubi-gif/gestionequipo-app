// Biblioteca de tareas: tareas guardadas (sin jugadores) para reutilizarlas en cualquier sesión.
import { tareaDesdePlantilla, tareasParaPlantilla } from './semana';

const sinTildes = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Filtra por texto (en el nombre y la descripción, sin importar mayúsculas ni tildes), objetivo y bloque.
export function filtrarBiblioteca(items, { texto = '', objetivo = null, bloque = null } = {}) {
  const q = sinTildes(texto).trim();
  return (items || [])
    .filter((t) => (!objetivo || t.objetivo === objetivo) && (!bloque || t.bloque === bloque))
    .filter((t) => !q || sinTildes(`${t.nombre} ${t.descripcion || ''}`).includes(q))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

// Lo que se manda al servidor para crear en una sesión una tarea de la biblioteca (sin jugadores).
export function tareaDesdeBiblioteca(item, bloque) {
  return tareaDesdePlantilla({ ...item, bloque: bloque || item.bloque });
}

// Una tarea (de un formulario o de una sesión) convertida en una de la biblioteca.
export function bibliotecaDesdeTarea(tarea) {
  return tareasParaPlantilla([tarea])[0];
}

export function buscarPorNombre(items, nombre) {
  const n = sinTildes(nombre).trim();
  return (items || []).find((t) => sinTildes(t.nombre).trim() === n) || null;
}

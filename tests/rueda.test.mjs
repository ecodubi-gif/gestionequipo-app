import assert from 'node:assert/strict';
import { BLOQUES_ENTRENADOR, bloqueDeTarea, postasDe } from '../data/planSesion';
import { construirSesion } from '../data/sesion';
import { cargaPrevista } from '../data/cargaPlanificada';

assert.deepEqual(BLOQUES_ENTRENADOR.map((b) => b.clave), ['rueda_perfiles', 'parte_central', 'cierre_tactico']);
assert.equal(BLOQUES_ENTRENADOR[0].duracion, 15);
assert.equal(bloqueDeTarea({ bloque: 'activacion' }), 'rueda_perfiles');
assert.equal(bloqueDeTarea({ bloque: 'parte_central' }), 'parte_central');

const postas = [1, 2, 3, 4].map((n) => ({ titulo: `P${n}`, fisico: 'f', tecnico: 't' }));
const plantilla = { numero: 2, preventivo: [], movilidad: [], semana: { postas, estiramientos: 'Isquios · cuádriceps' } };
assert.equal(postasDe(plantilla).length, 4);
assert.deepEqual(postasDe(null), []);
assert.deepEqual(postasDe({ semana: null }), []);

const tarea = (bloque, nombre) => ({ id: nombre, bloque, nombre, series: 1, duracion_seg: 300, pausa_seg: 0, objetivo: 'fuerza' });
const { items, total } = construirSesion({ entrenamiento: { bloques: {} }, plantilla, tareas: [tarea('activacion', 'vieja'), tarea('rueda_perfiles', 'nueva')], tipo: 2 });
assert.deepEqual(items.map((i) => i.clave), ['preventivo', 'movilidad', 'rueda_perfiles', 'parte_central', 'cierre_tactico', 'estiramientos']);
const rueda = items.find((i) => i.clave === 'rueda_perfiles');
assert.equal(rueda.minutos, 15);
assert.equal(rueda.postas.length, 4);
assert.equal(rueda.tareas.length, 2, 'las tareas antiguas de activación pasan a la rueda');
assert.equal(items.find((i) => i.clave === 'estiramientos').texto, 'Isquios · cuádriceps');
assert.equal(total, 15 + 5 + 15 + 5);
// apagar la rueda la quita entera
const sin = construirSesion({ entrenamiento: { bloques: { rueda_perfiles_activa: false } }, plantilla, tareas: [], tipo: 2 });
assert.ok(!sin.items.some((i) => i.clave === 'rueda_perfiles'));
assert.ok(cargaPrevista({ items, total }).minutos > 0);
// estiramientos escritos a mano ganan al texto por defecto
const m = construirSesion({ entrenamiento: { bloques: { estiramientos: 'mío' } }, plantilla, tareas: [], tipo: 2 });
assert.equal(m.items.at(-1).texto, 'mío');
console.log('rueda ok');

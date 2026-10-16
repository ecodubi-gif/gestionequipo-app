import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { limpiarJugada, jugadoresDe, siguienteN, anadirElemento, moverElemento, borrarElemento, cambiarNota, alternarMarca, duplicar, asignacionVacia, asignar, ponerTexto, limpiarAsignacion, partirTexto, formasJugada, elementoEn, htmlJugada, MAX_ELEMENTOS, TIPOS } from '../data/abp';
let n = 0; const t = (_, f) => { f(); n++; };
const base = { id: 1, titulo: 'Córner', tipo: 'corner_of', consigna: 'x', elementos: [
  { id: 'p1', k: 'jugador', n: 1, x: 0.5, y: 0.5 }, { id: 'p2', k: 'jugador', n: 2, x: 0.3, y: 0.3, marca: true }, { id: 'r1', k: 'rival', x: 0.7, y: 0.4 },
  { id: 'b1', k: 'balon', x: 0.9, y: 0.05 }, { id: 'f1', k: 'flecha', estilo: 'pase', a: { x: 0.9, y: 0.05 }, b: { x: 0.5, y: 0.1 } }, { id: 'n1', k: 'nota', t: 'Rechace y corta el contraataque', x: 0.4, y: 0.7 } ] };
t('limpiar acepta lo bueno', () => { const j = limpiarJugada(base); assert.equal(j.elementos.length, 6); assert.equal(j.tipo, 'corner_of'); });
t('limpiar descarta lo malo', () => {
  assert.equal(limpiarJugada(null), null); assert.equal(limpiarJugada({ elementos: 'x' }), null);
  const j = limpiarJugada({ titulo: 'x'.repeat(200), tipo: 'raro', elementos: [{ id: 'a', k: 'jugador', n: 0, x: 0, y: 0 }, { id: 'b', k: 'jugador', n: 31, x: 0, y: 0 }, { id: 'c', k: 'jugador', n: 3, x: 9, y: -4 }, { id: 'c', k: 'rival', x: 0, y: 0 }, { id: 'd', k: 'flecha', estilo: 'rara', a: {}, b: {} }, { k: 'rival' }, { id: 'e', k: 'nota', t: 'y'.repeat(500), x: 0.2, y: 0.2 }, { id: 'f', k: 'otra' }] });
  assert.equal(j.titulo.length, 80); assert.equal(j.tipo, 'otro'); assert.equal(j.elementos.length, 2);
  assert.deepEqual([j.elementos[0].x, j.elementos[0].y], [1, 0]); assert.equal(j.elementos[1].t.length, 120);
});
t('límite de elementos', () => { const j = limpiarJugada({ elementos: Array.from({ length: 200 }, (_, i) => ({ id: `r${i}`, k: 'rival', x: 0.5, y: 0.5 })) }); assert.equal(j.elementos.length, MAX_ELEMENTOS); let m = limpiarJugada({ elementos: [] }); for (let i = 0; i < 100; i++) m = anadirElemento(m, 'rival'); assert.equal(m.elementos.length, MAX_ELEMENTOS); });
t('numeración', () => { assert.equal(siguienteN(base), 3); const j = borrarElemento(base, 'p1'); assert.equal(siguienteN(j), 1); const k = anadirElemento(base, 'jugador', { x: 0.1, y: 0.1 }); assert.equal(jugadoresDe(k).map((e) => e.n).join(), '1,2,3'); assert.equal(k.elementos.at(-1).id, 'p3'); });
t('añadir de cada tipo, ids únicos', () => {
  let j = base; for (const k of ['jugador', 'rival', 'balon', 'nota', 'flecha']) j = anadirElemento(j, k, { t: 'Hola', estilo: 'carrera', a: { x: 0, y: 0 }, b: { x: 1, y: 1 } });
  assert.equal(new Set(j.elementos.map((e) => e.id)).size, j.elementos.length); assert.equal(j.elementos.at(-1).estilo, 'carrera'); assert.equal(anadirElemento(base, 'raro'), base);
});
t('no muta', () => { const c = JSON.stringify(base); moverElemento(base, 'p1', 0.1, 0.2); anadirElemento(base, 'rival'); borrarElemento(base, 'r1'); assert.equal(JSON.stringify(base), c); });
t('mover limita y no mueve flechas', () => { const j = moverElemento(base, 'p1', 3, -2); assert.deepEqual([j.elementos[0].x, j.elementos[0].y], [1, 0]); const k = moverElemento(base, 'f1', 0, 0); assert.deepEqual(k.elementos[4], base.elementos[4]); });
t('notas, marca y duplicar', () => { assert.equal(cambiarNota(base, 'n1', 'z'.repeat(300)).elementos[5].t.length, 120); assert.equal(alternarMarca(base, 'p2').elementos[1].marca, undefined); assert.equal(alternarMarca(base, 'p1').elementos[0].marca, true); const d = duplicar(base); assert.equal(d.id, null); assert.match(d.titulo, /copia/); d.elementos[0].x = 0; assert.equal(base.elementos[0].x, 0.5); });
t('asignar: un jugador, un puesto', () => { let a = asignar(asignacionVacia(), 'p1', 10); a = asignar(a, 'p2', 10); assert.deepEqual(a.asig, { p2: 10 }); a = asignar(a, 'p2', null); assert.deepEqual(a.asig, {}); assert.equal(ponerTexto(a, 'p2', 'x'.repeat(100)).textos.p2.length, 60); });
t('limpiar asignación', () => { const a = { asig: { p1: 10, p2: 11, p9: 12, r1: 13, p1x: 10 }, textos: { p2: ' ', p1: 'Pepe', zz: 'a' } }; const l = limpiarAsignacion(a, base, [10, 11]); assert.deepEqual(l, { asig: { p1: 10, p2: 11 }, textos: { p1: 'Pepe' } }); assert.deepEqual(limpiarAsignacion(null, base, []), { asig: {}, textos: {} }); });
t('partir texto', () => { assert.deepEqual(partirTexto('Rechace y corta el contraataque', 16), ['Rechace y corta', 'el contraataque']); assert.deepEqual(partirTexto('', 10), ['']); assert.deepEqual(partirTexto('Supercalifragilistico', 5), ['Supercalifragilistico']); });
t('formas: las del dibujo y el tamaño', () => { const r = formasJugada(base, { ancho: 585 }); assert.equal(r.alto, 364); assert.ok(r.formas.length > 20); assert.ok(r.formas.every((f) => ['rect', 'circle', 'line', 'poly', 'text'].includes(f.k))); const g = formasJugada(base, { ancho: 300 }); assert.equal(g.alto, 187); });
t('formas: nombre y marca', () => { const r = formasJugada(base, { asignacion: { asig: { p1: 10 }, textos: { p2: 'el 9 rival' } }, nombres: { 10: 'Pepe' } }); const ts = r.formas.filter((f) => f.k === 'text').map((f) => f.t); assert.ok(ts.includes('Pepe') && ts.includes('Marca: el 9 rival')); assert.ok(formasJugada(base).formas.some((f) => f.t === 'Marca a: …')); });
t('seleccionar y tocar', () => {
  assert.equal(elementoEn(base, 0.5 * 585, 0.5 * 364, 585), 'p1'); assert.equal(elementoEn(base, 0.3 * 585 + 5, 0.3 * 364, 585), 'p2');
  assert.equal(elementoEn(base, 0.7 * 585, 0.4 * 364, 585), 'r1'); assert.equal(elementoEn(base, 0.4 * 585, 0.7 * 364, 585), 'n1');
  assert.equal(elementoEn(base, 0.7 * 585, 0.075 * 364, 585), 'f1'); // sobre la flecha
  assert.equal(elementoEn(base, 5, 350, 585), null);
});
t('html: escapa y lista', () => {
  const j = { ...base, titulo: 'A<b>', elementos: base.elementos };
  const h = htmlJugada(j, { asig: { p1: 10 }, textos: { p2: 'Rival <9>' } }, { 10: { dorsal: 7, nombre: 'Pep&e' } }, { equipo: 'Herrera', rival: 'X' }, true);
  assert.ok(h.includes('A&lt;b&gt;') && h.includes('Pep&amp;e') && h.includes('Rival &lt;9&gt;') && h.includes('page-break-before') && h.includes('sin asignar') && h.includes('<svg'));
  assert.ok(!h.includes('Pep&e') && !h.includes('A<b>'));
});
t('las 9 jugadas de partida son válidas', () => {
  const semilla = JSON.parse(readFileSync(new URL('./abp_semilla.json', import.meta.url), 'utf8'));
  assert.equal(semilla.length, 9);
  for (const s of semilla) { const j = limpiarJugada(s); assert.ok(j, s.titulo); assert.equal(j.elementos.length, s.elementos.length, s.titulo); assert.ok(TIPOS[s.tipo], s.titulo); assert.ok(jugadoresDe(j).length >= 10, s.titulo); const f = formasJugada(j, { ancho: 585 }); assert.ok(f.formas.length > 30); }
  assert.equal(semilla.filter((s) => s.elementos.some((e) => e.marca)).length, 2);
});
console.log(`abp: ${n} pruebas OK`);

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ES_DEFENSIVA, FILAS_MARCAJES, claveMarcaje, moverAsignado, conPosiciones, numeroRival, limpiarJugada, jugadoresDe, siguienteN, anadirElemento, moverElemento, borrarElemento, cambiarNota, alternarMarca, duplicar, asignacionVacia, asignar, ponerTexto, limpiarAsignacion, partirTexto, formasJugada, elementoEn, htmlJugada, MAX_ELEMENTOS, TIPOS } from '../data/abp';
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
t('asignar: un jugador, un puesto', () => { let a = asignar(asignacionVacia(), 'p1', 10); a = asignar(a, 'p2', 10); assert.deepEqual(a.asig, { p2: 10 }); a = asignar(a, 'p2', null); assert.deepEqual(a.asig, {}); assert.equal(ponerTexto(a, 'p2', 'ab1c2d3').textos.p2, '12'); });
t('limpiar asignación', () => { const a = { asig: { p1: 10, p2: 11, p9: 12, r1: 13, p1x: 10 }, textos: { p2: ' ', p1: '9', zz: '4' } }; const l = limpiarAsignacion(a, base, [10, 11]); assert.deepEqual(l, { asig: { p1: 10, p2: 11 }, textos: { p1: '9' }, pos: {} }); assert.deepEqual(limpiarAsignacion(null, base, []), { asig: {}, textos: {}, pos: {} }); });
t('partir texto', () => { assert.deepEqual(partirTexto('Rechace y corta el contraataque', 16), ['Rechace y corta', 'el contraataque']); assert.deepEqual(partirTexto('', 10), ['']); assert.deepEqual(partirTexto('Supercalifragilistico', 5), ['Supercalifragilistico']); });
t('formas: las del dibujo y el tamaño', () => { const r = formasJugada(base, { ancho: 585 }); assert.equal(r.alto, 364); assert.ok(r.formas.length > 20); assert.ok(r.formas.every((f) => ['rect', 'circle', 'line', 'poly', 'text'].includes(f.k))); const g = formasJugada(base, { ancho: 300 }); assert.equal(g.alto, 187); });
t('formas: dorsal, nombre y marca', () => {
  const r = formasJugada(base, { asignacion: { asig: { p1: 10, p2: 11 }, textos: { p2: '9' }, pos: {} }, nombres: { 10: 'Pepe', 11: 'Luis' }, dorsales: { 10: 7, 11: 14 } });
  const ts = r.formas.filter((f) => f.k === 'text').map((f) => f.t);
  assert.ok(ts.includes('Pepe') && ts.includes('7') && ts.includes('14') && ts.includes('14 marca a 9')); assert.ok(!ts.includes('1'));
  assert.ok(formasJugada(base).formas.some((f) => f.t === '2 marca a …'));
});
t('posiciones propias del partido', () => {
  let a = moverAsignado(asignacionVacia(), 'p1', 0.2, 2); assert.deepEqual(a.pos.p1, { x: 0.2, y: 1 });
  const j = conPosiciones(base, a); assert.equal(j.elementos[0].x, 0.2); assert.equal(base.elementos[0].x, 0.5); assert.equal(conPosiciones(base, asignacionVacia()), base);
  assert.equal(elementoEn(base, 0.2 * 585, 1 * 364, 585, a), 'p1'); assert.equal(elementoEn(base, 0.5 * 585, 0.5 * 364, 585, a), null);
  assert.deepEqual(limpiarAsignacion({ asig: {}, textos: {}, pos: { p1: { x: 0.3, y: 0.4 }, zz: { x: 0, y: 0 }, p2: { x: 'a', y: 1 } } }, base, []).pos, { p1: { x: 0.3, y: 0.4 } });
  const h = htmlJugada(base, { asig: { p1: 10 }, textos: {}, pos: { p1: { x: 0.9, y: 0.9 } } }, { 10: { dorsal: 7, nombre: 'Pepe' } }, {}); assert.ok(h.includes('Pepe'));
});
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
  assert.equal(semilla.filter((s) => s.elementos.some((e) => e.marca)).length, 0);
  for (const s of semilla.filter((x) => x.tipo === 'corner_of' || x.tipo === 'falta_of')) assert.equal(s.elementos.filter((e) => e.k === 'jugador').length, 10, s.titulo);
  assert.deepEqual(semilla.filter((s) => s.elementos.some((e) => e.k === 'marcajes')).map((s) => s.tipo).sort(), ['corner_def', 'falta_def']);
});
t('rivales con número y marca a cualquier jugador', () => {
  let j = anadirElemento(base, 'rival', { x: 0.2, y: 0.2, n: 9 }); assert.equal(j.elementos.at(-1).n, 9);
  j = numeroRival(j, 'r1', 7); assert.equal(j.elementos.find((e) => e.id === 'r1').n, 7); assert.equal(numeroRival(j, 'r1', null).elementos.find((e) => e.id === 'r1').n, undefined);
  assert.equal(numeroRival(j, 'r1', 99).elementos.find((e) => e.id === 'r1').n, 30); assert.deepEqual(numeroRival(j, 'p1', 5), j);
  assert.equal(limpiarJugada({ elementos: [{ id: 'r', k: 'rival', n: 9, x: 0, y: 0 }, { id: 's', k: 'rival', n: 99, x: 0, y: 0 }] }).elementos.map((e) => e.n).join(), '9,');
  const f = formasJugada(j, { asignacion: { asig: {}, textos: { p1: '9' } } }).formas.filter((x) => x.k === 'text').map((x) => x.t);
  assert.ok(f.includes('1 marca a 9') && f.includes('7'));
  assert.ok(htmlJugada(j, { asig: {}, textos: { p1: '9' } }, {}, {}).includes('marca a <b>9</b>'));
});
t('defensivas: todos con su recuadro; ofensivas solo los marcados; candado', () => {
  const cuenta = (j, b = {}) => formasJugada(j, { bloqueados: b }).formas.filter((f) => f.k === 'text' && / marca a /.test(f.t)).length;
  assert.equal(cuenta({ ...base, tipo: 'corner_of' }), 1); assert.equal(cuenta({ ...base, tipo: 'corner_def' }), 1); assert.equal(cuenta({ ...base, tipo: 'barrera' }), 1); assert.equal(cuenta({ ...base, tipo: 'falta_def' }), 1);
  assert.ok(ES_DEFENSIVA('corner_def') && ES_DEFENSIVA('falta_def') && !ES_DEFENSIVA('barrera') && !ES_DEFENSIVA('falta_of'));
  assert.ok(formasJugada(base, { bloqueados: { p1: true } }).formas.some((f) => f.t === '🔒')); assert.ok(!formasJugada(base).formas.some((f) => f.t === '🔒'));
});
t('panel de marcajes: círculo con nuestro número y recuadro amarillo con el del rival, 5 filas editables', () => {
  let j = limpiarJugada({ id: 1, titulo: 'D', tipo: 'corner_def', elementos: [{ id: 'p1', k: 'jugador', n: 1, x: 0.5, y: 0.2 }] });
  j = anadirElemento(j, 'marcajes', { x: 0.1, y: 0.5 }); j = anadirElemento(j, 'marcajes', { x: 0.3, y: 0.5 });
  assert.equal(j.elementos.filter((e) => e.k === 'marcajes').length, 1); const id = j.elementos.find((e) => e.k === 'marcajes').id;
  assert.equal(limpiarJugada(j).elementos.filter((e) => e.k === 'marcajes').length, 1);
  const vacio = formasJugada(j); const caja = (f) => f.formas.filter((x) => x.k === 'rect' && x.stroke === '#facc15').length;
  assert.equal(caja(vacio), FILAS_MARCAJES);
  let a = asignacionVacia(); a = ponerTexto(a, claveMarcaje(id, 'n', 1), '16'); a = ponerTexto(a, claveMarcaje(id, 'r', 1), '9'); a = ponerTexto(a, claveMarcaje(id, 'n', 5), 'x7');
  a = limpiarAsignacion(a, j, []); assert.equal(a.textos[claveMarcaje(id, 'n', 1)], '16'); assert.equal(a.textos[claveMarcaje(id, 'r', 1)], '9'); assert.equal(a.textos[claveMarcaje(id, 'n', 5)], '7');
  const f = formasJugada(j, { asignacion: a }); assert.ok(f.formas.some((x) => x.t === '16') && f.formas.some((x) => x.t === '9'));
  assert.ok(!f.formas.some((x) => / marca a /.test(x.t || '')));
  assert.equal(elementoEn(j, 0.1 * 585, 0.5 * 364 * 1, 585), id);
  const h = htmlJugada(j, a, {}, {}); assert.ok(h.includes('<b>16</b> marca al <b>9</b> rival'));
  assert.equal(moverElemento(j, id, 0.2, 0.4).elementos.find((e) => e.id === id).x, 0.2);
});
console.log(`abp: ${n} pruebas OK`);

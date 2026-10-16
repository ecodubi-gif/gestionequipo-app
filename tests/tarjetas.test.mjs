import assert from 'node:assert/strict';
import { fechaISO, estadoParaPartido, acumularTarjetas, esPartidoDePrueba, textoCiclo, textoTarjetas } from '../data/tarjetas';
let n = 0; const t = (_, f) => { f(); n++; };
const P = [
  { id: 1, fecha: '2026-09-20', equipo_local: 'Herrera', equipo_visitante: 'A', es_local: 1 },
  { id: 2, fecha: '2026-09-27', equipo_local: 'B', equipo_visitante: 'Herrera', es_local: 0 },
  { id: 3, fecha: '2026-10-04', equipo_local: 'PRUEBA Herrera', equipo_visitante: 'PRUEBA Rival', es_local: 1 },
];
const ev = (tipo, jugador_id, extra = {}) => ({ tipo, jugador_id, equipo: 'local', minuto: 10, ...extra });
const E = { 1: [ev('amarilla', 7), ev('amarilla', 7, { minuto: 40 }), ev('amarilla', null, { equipo: 'visitante' }), ev('falta', 7), ev('roja', 9)], 2: [ev('amarilla', 7), ev('amarilla', 7), ev('amarilla', 8)], 3: [ev('amarilla', 8), ev('roja', 7)] };
t('prueba', () => { assert.ok(esPartidoDePrueba(P[2])); assert.ok(!esPartidoDePrueba(P[0])); });
t('acumula por jugador e ignora rival, otros eventos y partidos de prueba', () => {
  const r = acumularTarjetas(P, E, 5); const por = Object.fromEntries(r.map((f) => [f.jugador_id, f]));
  assert.equal(por[7].amarillas, 4); assert.equal(por[7].rojas, 0); assert.equal(por[8].amarillas, 1); assert.equal(por[9].rojas, 1); assert.equal(r.length, 3);
  assert.deepEqual(por[7].detalle.map((d) => d.rival), ['A', 'A', 'B', 'B']);
});
t('apercibido a una del ciclo y ciclos cumplidos', () => {
  const r = acumularTarjetas(P, E, 5)[0]; assert.equal(r.jugador_id, 7); assert.ok(r.apercibido); assert.match(textoCiclo(r, 5), /Apercibido/);
  const q = acumularTarjetas(P, { 1: Array.from({ length: 6 }, () => ev('amarilla', 4)) }, 5)[0]; assert.equal(q.ciclosCumplidos, 1); assert.equal(q.enCiclo, 1); assert.ok(!q.apercibido); assert.match(textoCiclo(q, 5), /1 ciclo/);
  assert.ok(acumularTarjetas(P, { 1: [ev('amarilla', 4), ev('amarilla', 4)] }, 3)[0].apercibido);
});
t('texto', () => { const f = acumularTarjetas(P, E, 5); const s = textoTarjetas(f, { 7: { dorsal: 10, apodo: 'Pepe' } }, 5); assert.ok(s.includes('⚠️ 10 Pepe: 4🟨') && s.includes('Jugador 9')); assert.equal(textoTarjetas([], {}, 5), 'Sin tarjetas registradas.'); });
t('sin eventos', () => { assert.deepEqual(acumularTarjetas([], {}), []); assert.deepEqual(acumularTarjetas(P, {}), []); });
const F = (id, fecha, estado = 'finalizado') => ({ id, fecha, estado, equipo_local: 'H', equipo_visitante: 'X', es_local: 1 });
t('ajustes suman amarillas y rojas', () => {
  const r = acumularTarjetas(P, E, 5, [{ jugador_id: 7, tipo: 'amarillas', cantidad: 1 }, { jugador_id: 20, tipo: 'rojas', cantidad: 2 }, { jugador_id: 7, tipo: 'sancion', hasta: '2026-12-01' }]);
  const por = Object.fromEntries(r.map((f) => [f.jugador_id, f])); assert.equal(por[7].amarillas, 5); assert.ok(!por[7].apercibido); assert.equal(por[20].rojas, 2); assert.equal(por[7].ciclosCumplidos, 1);
});
t('sancionado por ciclo completado en el último partido', () => {
  const ps = [F(1, '2026-09-20'), F(2, '2026-09-27'), F(3, '2026-10-04', 'pendiente')];
  const evs = { 1: [ev('amarilla', 7), ev('amarilla', 7)], 2: [ev('amarilla', 7), ev('amarilla', 7), ev('amarilla', 7)] };
  const r = estadoParaPartido(ps[2], ps, evs, [], 5); assert.ok(r[7].sancionado); assert.match(r[7].motivo, /ciclo/);
  const r2 = estadoParaPartido(ps[2], ps, { 1: [ev('amarilla', 7)], 2: [ev('amarilla', 7)] }, [{ jugador_id: 7, tipo: 'amarillas', cantidad: 2 }], 5); assert.ok(r2[7].apercibido && !r2[7].sancionado);
  assert.equal(r[8], undefined);
});
t('el ciclo completado hace dos partidos ya está cumplido', () => {
  const ps = [F(1, '2026-09-20'), F(2, '2026-09-27'), F(3, '2026-10-04'), F(4, '2026-10-11', 'pendiente')];
  const e = { 1: Array.from({ length: 5 }, () => ev('amarilla', 7)) };
  assert.ok(!(estadoParaPartido(ps[3], ps, e, [], 5)[7] || {}).sancionado);
  assert.ok(estadoParaPartido(F(2, '2026-09-27', 'pendiente'), [ps[0], F(2, '2026-09-27', 'pendiente')], e, [], 5)[7].sancionado);
});
t('roja en el último partido y sanción manual con fecha', () => {
  const ps = [F(1, '2026-09-20'), F(2, '2026-09-27', 'pendiente')];
  const r = estadoParaPartido(ps[1], ps, { 1: [ev('roja', 9)] }, [{ jugador_id: 4, tipo: 'sancion', hasta: '2026-09-27', nota: 'acta' }, { jugador_id: 5, tipo: 'sancion', hasta: '2026-09-26' }]);
  assert.ok(r[9].sancionado && /roja/.test(r[9].motivo)); assert.ok(r[4].sancionado && /27\/09\/2026 \(acta\)/.test(r[4].motivo)); assert.equal(r[5], undefined);
});
t('partidos de prueba y posteriores no cuentan', () => {
  const ps = [{ ...F(1, '2026-09-20'), equipo_local: 'PRUEBA H' }, F(2, '2026-10-20'), F(3, '2026-09-27', 'pendiente')];
  assert.deepEqual(estadoParaPartido(ps[2], ps, { 1: [ev('roja', 9)], 2: [ev('roja', 8)] }), {});
});
t('fechas', () => { assert.equal(fechaISO('27/11/2026'), '2026-11-27'); assert.equal(fechaISO('2026-1-5'), '2026-01-05'); assert.equal(fechaISO('5-1-27'), '2027-01-05'); assert.equal(fechaISO('31/02/2026'), null); assert.equal(fechaISO('mañana'), null); assert.equal(fechaISO(''), null); });
console.log(`tarjetas: ${n} pruebas OK`);

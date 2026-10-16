import assert from 'node:assert/strict';
import { acumularTarjetas, esPartidoDePrueba, textoCiclo, textoTarjetas } from '../data/tarjetas';
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
console.log(`tarjetas: ${n} pruebas OK`);

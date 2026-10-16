import assert from 'node:assert/strict';
import { SISTEMAS, sistemaValido, lineasDe, huecosDeSistema, etiquetasSistema, gruposSistema, rellenarHuecos, momentoInicial, copiaComoNuevo, suplentesDe, cambiarSistema, asignar, intercambiar, moverHueco, cambiosEntre, frasesDeCambios, limpiarMomentos, htmlMomento } from '../data/alineacion';
let n = 0; const t = (_, f) => { f(); n++; };
t('los 15 sistemas suman 11 con el portero', () => { assert.equal(SISTEMAS.length, 15); for (const s of SISTEMAS) { assert.ok(sistemaValido(s), s); assert.equal(huecosDeSistema(s).length, 11, s); assert.equal(etiquetasSistema(s).length, 11, s); assert.equal(gruposSistema(s).length, 11, s); } });
t('sistemas inválidos', () => { for (const s of ['', '4-4', '4-4-3', '9', '4-4-2-1-1-1', '0-5-5']) assert.ok(!sistemaValido(s), s); });
t('portero abajo y centrado; ataque arriba', () => { const h = huecosDeSistema('4-3-3'); assert.deepEqual([h[0].x, h[0].y], [0.5, 0.92]); assert.ok(h[10].y < h[5].y && h[5].y < h[1].y); assert.ok(h.every((p) => p.x >= 0.1 && p.x <= 0.9 && p.y > 0 && p.y < 1)); });
t('etiquetas', () => {
  assert.deepEqual(etiquetasSistema('4-3-3'), ['POR', 'LI', 'DFC', 'DFC', 'LD', 'MI', 'MC', 'MD', 'EI', 'DC', 'ED']);
  assert.deepEqual(etiquetasSistema('3-4-3').slice(0, 4), ['POR', 'DFC', 'DFC', 'DFC']);
  assert.equal(etiquetasSistema('4-2-1-3')[7], 'MP');
  assert.deepEqual(etiquetasSistema('4-2-1-3').slice(5, 7), ['MCD', 'MCD']);
});
t('mediapuntas', () => { assert.deepEqual(etiquetasSistema('4-2-2-2').slice(5, 9), ['MCD', 'MCD', 'MP', 'MP']); assert.deepEqual(etiquetasSistema('3-3-2-2').slice(7, 9), ['MP', 'MP']); assert.deepEqual(etiquetasSistema('4-2-4').slice(5, 7), ['MC', 'MC']); });
const titulares = [
  { id: 1, posicion: 'Portero' }, { id: 2, posicion: 'Lateral Derecho' }, { id: 3, posicion: 'Central Derecho' }, { id: 4, posicion: 'Central Izquierdo' }, { id: 5, posicion: 'Lateral Izquierdo' },
  { id: 6, posicion: 'Medio Centro' }, { id: 7, posicion: 'Interior Derecho' }, { id: 8, posicion: 'Interior Izquierdo' },
  { id: 9, posicion: 'Delantero Centro' }, { id: 10, posicion: 'Extremo Derecho' }, { id: 11, posicion: 'Extremo Izquierdo' },
];
t('relleno por posición', () => { const h = rellenarHuecos('4-3-3', titulares); assert.equal(h[0].jugador_id, 1); assert.ok([2, 3, 4, 5].includes(h[1].jugador_id)); assert.ok([9, 10, 11].includes(h[10].jugador_id)); assert.equal(new Set(h.map((x) => x.jugador_id)).size, 11); });
t('relleno con jugadores sin posición o de más', () => { const h = rellenarHuecos('4-4-2'.replace('4-4-2', '4-3-3'), [...titulares.map((j) => ({ id: j.id })), { id: 99 }]); assert.equal(h.filter((x) => x.jugador_id != null).length, 11); assert.ok(!h.some((x) => x.jugador_id === 99)); });
const m0 = momentoInicial('4-3-3', titulares, 'a');
const conv = [...titulares, { id: 12 }, { id: 13 }];
t('suplentes', () => assert.deepEqual(suplentesDe(m0, conv).map((j) => j.id), [12, 13]));
t('asignar desde el banquillo manda al titular al banquillo', () => { const m = asignar(m0, 1, 12); assert.equal(m.huecos[1].jugador_id, 12); assert.ok(suplentesDe(m, conv).some((j) => j.id === m0.huecos[1].jugador_id)); assert.equal(m0.huecos[1].jugador_id !== 12, true, 'no muta'); });
t('asignar a alguien que ya está en el campo intercambia', () => { const a = m0.huecos[1].jugador_id; const b = m0.huecos[2].jugador_id; const m = asignar(m0, 1, b); assert.equal(m.huecos[1].jugador_id, b); assert.equal(m.huecos[2].jugador_id, a); });
t('intercambiar', () => { const m = intercambiar(m0, 1, 2); assert.equal(m.huecos[1].jugador_id, m0.huecos[2].jugador_id); assert.equal(intercambiar(m0, 3, 3), m0); });
t('mover limita al campo', () => { const m = moverHueco(m0, 3, 2, -1); assert.deepEqual([m.huecos[3].x, m.huecos[3].y], [0.96, 0.04]); });
t('cambiar de sistema conserva a los 11 y al portero', () => { const m = cambiarSistema(m0, '3-4-3'); assert.equal(m.sistema, '3-4-3'); assert.equal(m.huecos[0].jugador_id, 1); assert.equal(new Set(m.huecos.map((h) => h.jugador_id)).size, 11); });
t('cambiar de sistema: los defensas siguen atrás', () => { const m = cambiarSistema(m0, '3-3-4'); const ys = m.huecos.map((h) => h.y); const defensa = m0.huecos.slice(1, 5).map((h) => h.jugador_id); const enNuevos = m.huecos.filter((h) => defensa.includes(h.jugador_id)); assert.ok(enNuevos.filter((h) => h.y > 0.7).length >= 3); assert.ok(Math.max(...ys) <= 0.92); });
t('copia nueva', () => { const c = copiaComoNuevo(m0, 'Cambio 60', '60', 'b'); assert.equal(c.id, 'b'); assert.equal(c.minuto, 60); c.huecos[0].x = 0; assert.equal(m0.huecos[0].x, 0.5); assert.equal(copiaComoNuevo(m0, 'x', '', 'c').minuto, null); });
t('cambios: entra, sale y se mueve', () => {
  let m = copiaComoNuevo(m0, 'Cambio', 60, 'c');
  const sale = m.huecos[10].jugador_id; m = asignar(m, 10, 12);
  m = intercambiar(m, 5, 6);
  const c = cambiosEntre(m0, m);
  assert.deepEqual(c.entran, [12]); assert.deepEqual(c.salen, [sale]);
  assert.equal(c.mueven.length, 2);
  const f = frasesDeCambios(m0, m, (id) => `J${id}`);
  assert.ok(f.includes('Entra J12 de ED') && f.includes(`Sale J${sale}`));
  assert.deepEqual(cambiosEntre(null, m), { entran: [], salen: [], mueven: [], sistema: null });
});
t('cambio de sistema se anota', () => { const m = cambiarSistema(copiaComoNuevo(m0, 'x', 50), '3-4-3'); assert.equal(cambiosEntre(m0, m).sistema.a, '3-4-3'); assert.match(frasesDeCambios(m0, m, String)[0], /4-3-3 → 3-4-3/); });
t('limpiar', () => {
  assert.deepEqual(limpiarMomentos(null), []); assert.deepEqual(limpiarMomentos({ momentos: 'x' }), []);
  const ok = limpiarMomentos({ momentos: [m0, { sistema: '4-4', huecos: [] }, { ...m0, huecos: m0.huecos.slice(1) }] });
  assert.equal(ok.length, 1); assert.equal(ok[0].huecos.length, 11);
  const sucio = limpiarMomentos({ momentos: [{ ...m0, minuto: 900, etiqueta: 'x'.repeat(100), huecos: m0.huecos.map((h) => ({ ...h, x: 5, y: -2, jugador_id: 'a' })) }] })[0];
  assert.equal(sucio.minuto, 130); assert.equal(sucio.etiqueta.length, 40); assert.ok(sucio.huecos.every((h) => h.x === 1 && h.y === 0 && h.jugador_id === null));
});
t('html: marca entradas y escapa texto', () => {
  const m = asignar(copiaComoNuevo(m0, 'Cambio <60>', 60, 'c'), 10, 12);
  const js = Object.fromEntries(conv.map((j) => [j.id, { dorsal: j.id, nombre: j.id === 12 ? 'Pep<e>' : 'J' + j.id }]));
  const h = htmlMomento(m, m0, js, { equipo: 'Herrera', rival: 'Rival' }, true);
  assert.ok(h.includes('#16a34a') && h.includes('Entra Pep&lt;e&gt;') && h.includes('Cambio &lt;60&gt;') && h.includes('page-break-before'));
  assert.ok(!h.includes('Pep<e>'));
  assert.ok(htmlMomento(m0, null, js).includes('11 inicial'));
});
t('sistemas de la lámina: etiquetas con sentido y laterales a los lados', () => {
  for (const s of ['4-4-2', '4-2-3-1', '5-4-1', '5-2-1-2', '5-3-2']) { const h = huecosDeSistema(s); const e = etiquetasSistema(s); assert.equal(new Set(h.map((p) => `${p.x},${p.y}`)).size, 11, s); assert.equal(e[0], 'POR'); }
  const h = huecosDeSistema('4-4-2'); assert.ok(h[1].x < h[2].x && h[2].x < h[3].x && h[3].x < h[4].x);
  assert.equal(etiquetasSistema('5-2-1-2').join(), 'POR,CAI,DFC,DFC,DFC,CAD,MCD,MCD,MP,DC,DC');
});
console.log(`alineacion: ${n} pruebas OK`);

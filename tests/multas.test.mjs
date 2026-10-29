import assert from 'node:assert/strict';
import { validarMulta, multasDeAsistencia, CONCEPTOS_MULTA, ROLES_MULTAR, leerImporte, TARIFAS, importeMulta, clavePersona, CUERPO_TECNICO } from '../data/multas';
import { fechaISO } from '../data/tarjetas';
let n = 0; const t = (_, f) => { f(); n++; };
t('tarifa del club', () => {
  assert.deepEqual(Object.fromEntries(CONCEPTOS_MULTA.map((c) => [c, TARIFAS[c].importe])), { amarilla: 1.5, roja: 3, retraso: 1, falta: 1.5, indisciplina: 5, material: 1, vestimenta: 1 });
});
t('cuerpo técnico paga el doble', () => { assert.equal(importeMulta('amarilla', false), 1.5); assert.equal(importeMulta('amarilla', true), 3); assert.equal(importeMulta('indisciplina', true), 10); assert.equal(importeMulta('nada', false), null); });
t('multa a un jugador', () => assert.deepEqual(validarMulta({ persona: { jugador_id: 3 }, tipo: 'retraso' }, fechaISO).cuerpo, { jugador_id: 3, tipo: 'retraso' }));
t('multa al cuerpo técnico', () => assert.deepEqual(validarMulta({ persona: { miembro: 'delegado' }, tipo: 'roja' }, fechaISO).cuerpo, { miembro: 'delegado', tipo: 'roja' }));
t('con fecha', () => assert.equal(validarMulta({ persona: { jugador_id: 3 }, tipo: 'falta', fecha: '27/11/2026' }, fechaISO).cuerpo.fecha, '2026-11-27'));
t('sin fecha no la manda', () => assert.equal('fecha' in validarMulta({ persona: { jugador_id: 3 }, tipo: 'falta', fecha: '  ' }, fechaISO).cuerpo, false));
t('fecha mal escrita', () => assert.match(validarMulta({ persona: { jugador_id: 3 }, tipo: 'falta', fecha: '31/02/2026' }, fechaISO).error, /fecha/));
t('sin persona o sin concepto', () => { assert.match(validarMulta({ tipo: 'falta' }, fechaISO).error, /quién/); assert.match(validarMulta({ persona: { jugador_id: 1 }, tipo: 'otro' }, fechaISO).error, /concepto/); });
t('claves', () => { assert.equal(clavePersona({ jugador_id: 4 }), 'j:4'); assert.equal(clavePersona({ miembro: 'entrenador', jugador_id: 0 }), 'm:entrenador'); });
t('importe de pagos', () => { assert.equal(leerImporte('5'), 5); assert.equal(leerImporte('5.5'), 5.5); assert.equal(leerImporte('0'), null); assert.equal(leerImporte('2,555'), null); });
t('multas de asistencia = total - lo demás', () => { assert.equal(multasDeAsistencia({ multas: 17.5, multas_manuales: 2.5 }), 15); assert.equal(multasDeAsistencia({ multas: 4 }), 4); });
t('roles y cuerpo técnico', () => { assert.deepEqual(ROLES_MULTAR, ['delegado', 'entrenador', 'segundo_entrenador']); assert.deepEqual(CUERPO_TECNICO.map((m) => m.miembro), ROLES_MULTAR); });
console.log('multas:', n, 'pruebas OK');

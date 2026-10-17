import assert from 'node:assert/strict';
import { fechaDeTexto, textoDeFecha, formatearFechaCorta } from '../data/fecha';
assert.equal(fechaDeTexto('18/10/2026'), '2026-10-18'); assert.equal(fechaDeTexto('8-3-26'), '2026-03-08'); assert.equal(fechaDeTexto('18102026'), '2026-10-18');
assert.equal(fechaDeTexto('2026-10-18'), '2026-10-18'); assert.equal(fechaDeTexto('31/02/2026'), null); assert.equal(fechaDeTexto('hola'), null); assert.equal(fechaDeTexto(''), null);
assert.equal(textoDeFecha('2026-10-18'), '18/10/2026'); assert.equal(textoDeFecha(null), ''); assert.equal(formatearFechaCorta('2026-01-05'), '05/01/2026');
console.log('fecha: 4 pruebas OK');

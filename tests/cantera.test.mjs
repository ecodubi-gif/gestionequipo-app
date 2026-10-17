import assert from 'node:assert/strict';
import { CATEGORIAS_CANTERA, categoriaCanteraValida, normalizarCantera, etiquetaCantera, esDeCantera, resumenCantera } from '../data/cantera';
let n = 0; const t = (d, f) => { f(); n += 1; };
t('categorías', () => { assert.deepEqual(CATEGORIAS_CANTERA, ['infantil', 'cadete', 'juvenil', 'filial']); });
t('validación', () => { assert.ok(categoriaCanteraValida(null)); assert.ok(categoriaCanteraValida('filial')); assert.ok(!categoriaCanteraValida('alevín')); });
t('normalizar y etiqueta', () => { assert.equal(normalizarCantera('Juvenil'), 'juvenil'); assert.equal(normalizarCantera('x'), null); assert.equal(etiquetaCantera('cadete'), '🌱 Cantera · Cadete'); assert.equal(etiquetaCantera(null), ''); });
t('esDeCantera y resumen', () => { assert.ok(esDeCantera({ cantera: 'infantil' })); assert.ok(!esDeCantera({})); const r = resumenCantera([{ cantera: 'filial' }, { cantera: 'filial' }, { cantera: 'cadete' }, {}]); assert.equal(r.total, 3); assert.equal(r.filial, 2); assert.equal(r.juvenil, 0); });
console.log(`cantera: ${n} pruebas OK`);

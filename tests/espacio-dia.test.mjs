import assert from 'node:assert/strict';
import fs from 'node:fs';
import { OBJETIVOS, OBJETIVOS_DEL_DIA, avisoDelDia, calcularDimensiones } from '../data/tareas';
assert.deepEqual(OBJETIVOS_DEL_DIA, {1:['recuperacion','compensacion'],2:['fuerza'],3:['puesta_a_punto']});
assert.equal(avisoDelDia({tipo:2,objetivo:'fuerza'}), null);
assert.equal(avisoDelDia({tipo:1,objetivo:'recuperacion'}), null);
assert.equal(avisoDelDia({tipo:1,objetivo:'compensacion'}), null);
assert.equal(avisoDelDia({tipo:3,objetivo:'puesta_a_punto'}), null);
assert.equal(avisoDelDia({tipo:null,objetivo:'fuerza'}), null);
assert.equal(avisoDelDia({tipo:2,objetivo:null}), null);
assert.match(avisoDelDia({tipo:2,objetivo:'recuperacion'}), /Entreno 2 lo habitual es Fuerza.*Recuperación.*Fuerza 35-75/);
assert.match(avisoDelDia({tipo:1,objetivo:'fuerza'}), /Recuperación o Compensación.*Recuperación 100-150 · Compensación 80-120/);
assert.equal(OBJETIVOS.puesta_a_punto.corto, 'Velocidad');
const d = calcularDimensiones({objetivo:'puesta_a_punto', referencia:'sin_referencia', jugadoresCampo:10, apP:130});
assert.ok(d.largo > d.ancho && d.apPReal >= 120 && d.apPReal <= 140, JSON.stringify(d));
const sem = JSON.parse(fs.readFileSync(new URL('./biblioteca_semilla.json', import.meta.url),'utf8'));
for (const t of sem) { const n=t.n_ataque+t.n_defensa+t.n_comodines; if(!t.largo||!n) continue; const a=Math.round(t.largo*t.ancho/n); const r=OBJETIVOS[t.objetivo]?.apP; console.log(t.objetivo.padEnd(15), String(a).padStart(4), r?`${r[0]}-${r[1]}`:'', a<r[0]?'POR DEBAJO':a>r[1]?'POR ENCIMA':'ok', t.nombre.slice(0,40)); }
console.log('av ok');

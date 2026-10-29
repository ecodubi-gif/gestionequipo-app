import assert from 'node:assert/strict';
import { presentesDe, soloPresentes, tareasConPresentes } from '../data/disponibles';
let n = 0; const t = (_, f) => { f(); n++; };
const lista = [{ jugador: { id: 1 }, estado: 'presente' }, { jugador: { id: 2 }, estado: 'retraso' }, { jugador: { id: 3 }, estado: 'falta_justificada' }, { jugador: { id: 4 }, estado: 'falta_injustificada' }];
t('sin lista nadie se filtra', () => { assert.equal(presentesDe([]), null); assert.equal(presentesDe(null), null); assert.equal(soloPresentes([{ jugador_id: 9 }], null).length, 1); });
t('presentes y con retraso están; las faltas no', () => assert.deepEqual(presentesDe(lista), [1, 2]));
t('solo se quedan los presentes en la tarea', () => assert.deepEqual(soloPresentes([{ jugador_id: 1, rol: 'ataque' }, { jugador_id: 3, rol: 'defensa' }, { jugador_id: 2, rol: 'portero' }], [1, 2]).map((a) => a.jugador_id), [1, 2]));
t('tareas', () => { const r = tareasConPresentes([{ id: 1, jugadores: [{ jugador_id: 1 }, { jugador_id: 4 }] }, { id: 2 }], [1]); assert.equal(r[0].jugadores.length, 1); assert.deepEqual(r[1].jugadores, []); });
console.log('disponibles:', n, 'pruebas OK');

import assert from 'node:assert/strict';
import { urlJugador, tokenDeBusqueda, textoEnlace, alertasBienestar, resumenBienestar, previoDeAviso, contarAvisos, textoAviso, textoGrupoConvocatoria, nombreDiaISO, textoRecordatorioEntreno } from '../data/jugadorPublico';
let n = 0; const t = (_, f) => { f(); n++; };
const tok = 'a'.repeat(40);
t('url', () => { assert.equal(urlJugador('https://app.ecodubi.com/', tok), `https://app.ecodubi.com/?j=${tok}`); });
t('token de la url', () => {
  assert.equal(tokenDeBusqueda(`?j=${tok}`), tok);
  assert.equal(tokenDeBusqueda(`?x=1&j=${tok}&y=2`), tok);
  for (const m of ['', '?j=corto', '?j=', null, '?j=' + 'a/'.repeat(20)]) assert.equal(tokenDeBusqueda(m), null, String(m));
});
t('texto', () => assert.match(textoEnlace('Pepe', 'https://x/?j=1'), /Pepe.*\n https?:|Pepe[\s\S]*https:\/\/x/));
t('alertas', () => {
  assert.deepEqual(alertasBienestar({ sueno: 4, cansancio: 2, dolor: 1, animo: 5 }), []);
  assert.deepEqual(alertasBienestar({ sueno: 2, cansancio: 4, dolor: 4, animo: 2 }), ['durmió mal', 'muy cansado', 'mucho dolor o agujetas', 'ánimo bajo']);
  assert.deepEqual(alertasBienestar({ sueno: 3, cansancio: 3, dolor: 3, animo: 3, molestias: ' gemelo ' }), ['molestias: gemelo']);
  assert.deepEqual(alertasBienestar({ sueno: 3, cansancio: 3, dolor: 3, animo: 3, molestias: '  ' }), []);
});
t('resumen: último por jugador y alertas primero', () => {
  const r = resumenBienestar([
    { jugador_id: 1, fecha: '2026-10-10', sueno: 1, cansancio: 5, dolor: 5, animo: 1 },
    { jugador_id: 1, fecha: '2026-10-14', sueno: 4, cansancio: 2, dolor: 1, animo: 5 },
    { jugador_id: 2, fecha: '2026-10-13', sueno: 2, cansancio: 3, dolor: 3, animo: 3 },
    { jugador_id: 3, fecha: '2026-10-14', sueno: 4, cansancio: 2, dolor: 1, animo: 5 },
  ]);
  assert.deepEqual(r.map((x) => x.jugador_id), [2, 1, 3]);
  assert.equal(r.find((x) => x.jugador_id === 1).fecha, '2026-10-14');
  assert.deepEqual(resumenBienestar(null), []);
});
t('previo', () => {
  assert.deepEqual(previoDeAviso({ respuesta: 'no_voy', motivo: 'examen' }), { estado: 'falta_justificada', multa: 0, motivo: 'examen' });
  assert.deepEqual(previoDeAviso({ respuesta: 'no_voy' }), { estado: 'falta_justificada', multa: 0, motivo: '' });
  assert.deepEqual(previoDeAviso({ respuesta: 'voy' }), { estado: 'presente', multa: 0, motivo: '' });
  assert.equal(previoDeAviso({ respuesta: 'duda' }), null);
  assert.equal(previoDeAviso(undefined), null);
});
t('contar', () => assert.deepEqual(contarAvisos({ 1: { respuesta: 'voy' }, 2: { respuesta: 'no_voy' }, 3: { respuesta: 'duda' } }, [1, 2, 3, 4, 5]), { voy: 1, no_voy: 1, duda: 1, sin: 2 }));
t('retraso en el previo', () => {
  assert.deepEqual(previoDeAviso({ respuesta: null, retraso_minutos: 30 }), { estado: 'retraso', multa: 5, motivo: 'Avisó: 30 min' });
  assert.deepEqual(previoDeAviso({ respuesta: 'voy', retraso_minutos: 15 }), { estado: 'retraso', multa: 5, motivo: 'Avisó: 15 min' });
  assert.equal(previoDeAviso({ respuesta: 'no_voy', motivo: 'x', retraso_minutos: 15 }).estado, 'falta_justificada');
});
t('texto del aviso', () => {
  assert.equal(textoAviso({ respuesta: 'no_voy', motivo: 'examen' }), 'No voy (examen)');
  assert.equal(textoAviso({ respuesta: null, retraso_minutos: 30 }), 'llega 30 min tarde');
  assert.equal(textoAviso({ respuesta: 'voy', retraso_minutos: 15 }), 'Voy · llega 15 min tarde');
  assert.equal(textoAviso(undefined), '');
});
t('contar con solo retraso', () => assert.deepEqual(contarAvisos({ 1: { respuesta: null, retraso_minutos: 15 } }, [1]), { voy: 0, no_voy: 0, duda: 0, sin: 1 }));
t('día', () => assert.equal(nombreDiaISO('2026-10-18'), 'domingo'));
t('texto del grupo', () => {
  const g = textoGrupoConvocatoria({ fecha: '2026-10-18', es_local: 0, equipo_local: 'Rival FC', equipo_visitante: 'Herrera', hora_citacion: '11:00:00', lugar_citacion: 'el bar' });
  assert.match(g, /domingo 18\/10 vs Rival FC/);
  assert.match(g, /Concentración: 11:00 en el bar/);
  assert.ok(!/https?:/.test(g), 'sin enlaces');
  const l = textoGrupoConvocatoria({ fecha: '2026-10-18', es_local: 1, equipo_local: 'Herrera', equipo_visitante: 'Otro', hora_citacion: null, lugar_citacion: null });
  assert.match(l, /vs Otro/); assert.ok(!/Concentración/.test(l));
});
t('recordatorio de entreno', () => {
  const js = [{ id: 1, nombre: 'Pedro', apodo: 'Pepe' }, { id: 2, nombre: 'Luis' }, { id: 3, nombre: 'Ana' }, { id: 4, nombre: 'Jose' }];
  const r = textoRecordatorioEntreno({ fecha: '2026-10-20', hora: '20:30:00', lugar: 'Juan Benjumea' }, js, { 1: { respuesta: 'voy' }, 3: { respuesta: 'duda' } });
  assert.match(r, /martes 20\/10 \(20:30 en Juan Benjumea\)/); assert.match(r, /Faltan por confirmar: Luis, Jose\./); assert.match(r, /Con dudas: Ana\./); assert.ok(!/Pepe/.test(r)); assert.ok(!/http/.test(r));
  assert.equal(textoRecordatorioEntreno({ fecha: '2026-10-20' }, js, { 1: { respuesta: 'voy' }, 2: { respuesta: 'no_voy' }, 3: { respuesta: 'voy' }, 4: { respuesta: 'voy' } }), '');
  assert.ok(!/Con dudas/.test(textoRecordatorioEntreno({ fecha: '2026-10-20' }, js, {})));
});
console.log(`jugadorPublico: ${n} pruebas OK`);

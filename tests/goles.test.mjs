import { resumenGoles, tramoDe, FRASE_GOLES } from './goles.mjs';
let n = 0; const t = (c, m) => { if (!c) { console.log('FALLO', m); process.exitCode = 1; } else n++; };
t(tramoDe(1) === 0 && tramoDe(15) === 0 && tramoDe(16) === 1 && tramoDe(45) === 2 && tramoDe(46) === 3 && tramoDe(90) === 5 && tramoDe(97) === 5 && tramoDe(0) === -1, 'tramos');
const P = [
  { goles: [{ min: 4, a: 'f', jugador: 'A' }, { min: 80, a: 'c' }, { min: 89, a: 'f', jugador: 'A' }] },
  { goles: [{ min: 20, a: 'c' }, { min: 70, a: 'f', jugador: 'B' }, { min: 85, a: 'c' }] },
  { goles: [] },
];
const r = resumenGoles(P);
t(r.partidos === 3 && r.gf === 3 && r.gc === 3 && r.sinGoles === 1, 'totales');
t(r.primero === 1 && r.recibePrimero === 1, 'primero');
t(r.tramos[5].f === 1 && r.tramos[5].c === 2 && r.tramos[0].f === 1 && r.tramos[1].c === 1 && r.tramos[4].f === 1, 'tramos contados');
t(r.fuerteAFavor.length === 3 || r.fuerteAFavor.includes("76-90'"), 'fuerte a favor ' + r.fuerteAFavor);
t(r.debilEnContra.join() === "76-90'", 'débil en contra');
t(r.primeraParteF === 1 && r.segundaParteF === 2 && r.primeraParteC === 1 && r.segundaParteC === 2, 'partes');
t(r.goleadores[0].nombre === 'A' && r.goleadores[0].goles === 2, 'goleadores');
t(resumenGoles(null).partidos === 0 && FRASE_GOLES(resumenGoles([])) === '', 'vacío');
t(/encaja más en 76-90/.test(FRASE_GOLES(r)), 'frase');
console.log(n + ' ok');

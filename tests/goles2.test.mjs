import { leerFicha, clavesEquipo, claveGoles, codificarPartido, partidosDeDatos, resumenGoles } from './goles.mjs';
let n = 0; const t = (c, m) => { if (!c) { console.log('FALLO', m); process.exitCode = 1; } else n++; };
t(JSON.stringify(clavesEquipo('U.D. MORÓN C.F.')) === '["moron"]' && clavesEquipo('C.D. Utrera B').join() === 'utrera,b', 'claves');
const ficha = "Écija Balompié vs P.D. Rociera Goles del Écija Balompié: 1-0: Pytu (4'); 2-0: Valentín (7'); 3-0: Adri Delgado (14'); 4-1: Villa (60'); 5-1: Álvaro Castro (82'); 6-1: Álvaro Castro (89') Goles del P.D. Rociera: 3-1: Manu (22') Amonestó a Jesús (30') Alineaciones 1-1: X (5')";
const f = leerFicha(ficha, 'P.D. ROCIERA');
t(f && f.gf === 1 && f.gc === 6 && f.rival.includes('cija') && f.goles[3].min === 22 && f.goles[3].a === 'f', 'rociera ' + JSON.stringify(f && [f.gf, f.gc]));
const g = leerFicha(ficha, 'Écija Balompié'); t(g.gf === 6 && g.gc === 1, 'ecija');
t(leerFicha('nada de goles', 'X') === null, 'sin etiquetas');
const solo = leerFicha("Goles del Morón: 1-0: A (3')", 'U.D. Morón C.F.'); t(solo.gf === 1 && solo.gc === 0 && solo.rival === '', 'solo mi equipo');
const s = codificarPartido(5, 'Utrera B', f.goles); t(s.length <= 600 && JSON.parse(s).j === 5, 'codifica');
const largo = Array.from({ length: 20 }, (_, i) => ({ min: i + 1, a: 'f', jugador: 'Nombre Muy Largo Apellido' }));
t(codificarPartido(7, 'Rival con nombre largo largo largo', largo).length <= 600, 'siempre ≤600');
const datos = { [claveGoles(5)]: s, [claveGoles(1)]: codificarPartido(1, 'DH B', [{ min: 20, a: 'c', jugador: 'Z' }]), dibujo: '4-4-2', goles_x: 'roto' };
const ps = partidosDeDatos(datos); t(ps.length === 2 && ps[0].jornada === 1 && ps[1].gf === 1 && ps[1].gc === 6, 'partidosDeDatos');
t(resumenGoles(ps).partidos === 2, 'resumen de datos');
t(partidosDeDatos({ goles_03: '{roto' }).length === 0, 'valor roto ignorado');
console.log(n + ' ok');
{
  const { codificarPartido: cod, partidosDeDatos: pd, resumenGoles: rs } = await import('./goles.mjs');
  const x = { goles_03: cod(3, 'Demo', [{ min: 16, a: 'f', jugador: 'Fernando', tipo: 'propia' }, { min: 18, a: 'f', jugador: 'Josué' }]) };
  const r = rs(pd(x));
  console.log(r.goleadores.map((g) => g.nombre).join() === 'Josué' && JSON.parse(x.goles_03).g[0][2] === 'Fernando (pp)' ? 'pp ok' : 'FALLO pp');
}

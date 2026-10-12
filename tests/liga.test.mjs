import fs from 'fs';
import { parsearClasificacion, fichaRival, partidosDe, proximoPartido, normEquipo, totales } from './liga.mjs';
let ok = 0, mal = 0;
const t = (n, c) => { if (c) ok++; else { mal++; console.log('MAL:', n); } };
const tabla = ` Equipos	Partidos Casa	Partidos Fuera	Goles	Últimos	Sanción
Ordenar por 	 Pts	J	G	E	P	J	G	E	P	F	C	 	Puntos
 	1	ECIJA BALOMPIE, S.A.D.  	10	3	2	1	0	2	1	0	1	12	5	 P G G E G 	0 
 	8	DOS HERMANAS CLUB DE FÚTBOL 1971  	7	3	1	0	2	2	1	1	0	7	5	 G G P E P 	0 
 	18	C.D. DE FÚTBOL HERRERA  	4	3	1	1	1	2	0	0	2	7	15	 P P G P E 	0 `;
let r = parsearClasificacion(tabla);
t('3 filas', r.filas.length === 3);
t('solo avisa de que faltan puestos (la muestra salta del 1 al 8 y al 18)', r.avisos.length === 1 && r.avisos[0].includes('puestos'));
t('nombre con 1971', r.filas[1].equipo === 'DOS HERMANAS CLUB DE FÚTBOL 1971' && r.filas[1].pts === 7);
const h = r.filas[2];
t('herrera: casa 3 1 1 1, fuera 2 0 0 2', h.casa.j === 3 && h.casa.g === 1 && h.fuera.p === 2 && h.f === 7 && h.c === 15);
t('últimos en orden cronológico (el reciente al final)', h.ultimos.join('') === 'EPGPP');
t('totales', JSON.stringify(totales(h)) === '{"j":5,"g":1,"e":1,"p":3}');
t('texto vacío avisa', parsearClasificacion('hola').avisos.length === 1);
t('puntos que no cuadran avisan', parsearClasificacion(' \t1\tX  \t99\t1\t1\t0\t0\t0\t0\t0\t0\t1\t0\t G \t0 ').avisos.length === 1);
t('línea rota avisa', parsearClasificacion('1 EQUIPO 3 4').avisos[0].includes('No he entendido'));
t('sin últimos (inicio de liga)', parsearClasificacion(' \t1\tX  \t0\t0\t0\t0\t0\t0\t0\t0\t0\t0\t0\t \t0 ').filas[0]?.ultimos.length === 0);

// La clasificación real del Herrera y su calendario
const cal = JSON.parse(fs.readFileSync('./calendario.json', 'utf8'));
t('306 partidos', cal.length === 306);
t('34 partidos del Herrera', partidosDe(cal, 'C.D. DE FÚTBOL HERRERA').length === 34);
t('17 en casa', partidosDe(cal, 'C.D. DE FÚTBOL HERRERA').filter((p) => p.esLocal).length === 17);
const p = proximoPartido(cal, 'C.D. DE FÚTBOL HERRERA', '2026-10-12');
t('el 12-10 el próximo es Morón fuera (J6)', p && p.jornada === 6 && p.rival === 'U.D. MORON C.F.' && !p.esLocal);
t('el mismo día del partido cuenta', proximoPartido(cal, 'C.D. DE FÚTBOL HERRERA', '2026-10-18').jornada === 6);
t('tras la última no hay próximo', proximoPartido(cal, 'C.D. DE FÚTBOL HERRERA', '2027-06-01') === null);
t('nombres sin tildes ni espacios', normEquipo(' Fútbol  club ') === 'FUTBOL CLUB');

const real = fs.readFileSync('./clasificacion.txt', 'utf8');
r = parsearClasificacion(real);
t('18 equipos reales', r.filas.length === 18 && r.avisos.length === 0);
const fm = fichaRival({ filas: r.filas, anterior: null, calendario: cal, hoy: '2026-10-12' });
t('ficha: rival Morón, puesto 7, juega en casa → sede "casa"', fm.rival.pos === 7 && fm.sede === 'casa' && fm.rendimientoSede.j === 2);
t('ficha: diferencia de puntos 7-4 = 3', fm.diferenciaPuntos === 3);
t('ficha: goles por partido Morón (11 y 9 en 5)', fm.golesPorPartido.f === 2.2 && fm.golesPorPartido.c === 1.8);
const ant = r.filas.map((f) => ({ ...f, pos: f.equipo.includes('MORON') ? 9 : f.pos }));
t('cambio de puesto: sube 2', fichaRival({ filas: r.filas, anterior: ant, calendario: cal, hoy: '2026-10-12' }).cambioPuesto === 2);
const fi = fichaRival({ filas: r.filas, anterior: null, calendario: cal, hoy: '2026-09-13' });
t('en la jornada 1 (en casa) la sede del rival es fuera', fi.proximo.esLocal && fi.sede === 'fuera');
console.log(`liga: ${ok} ok, ${mal} mal`);

import { lineasFormacion, puntosFormacion, SECCIONES, limpiarInforme, estaVacio, resumenInforme, progreso, jugadoresPorTipo, informeVacio } from './scouting.mjs';
let ok = 0, mal = 0;
const t = (n, c) => { if (c) ok++; else { mal++; console.log('FALLA', n); } };

const ids = SECCIONES.flatMap((s) => s.campos.map((c) => c.id));
t('ids únicos', new Set(ids).size === ids.length);
t('ids válidos para el servidor', ids.every((i) => /^[a-z0-9_]{1,40}$/.test(i)));
t('opciones en los campos de opciones', SECCIONES.every((s) => s.campos.every((c) => c.tipo !== 'opciones' || (c.opciones && c.opciones.length >= 2))));
t('vacío', estaVacio(informeVacio()) && estaVacio(null) && estaVacio({ datos: { dibujo: '  ' }, jugadores: [{ nombre: ' ' }] }));

const l = limpiarInforme({ datos: { dibujo: ' 1-4-4-2 ', inventado: 'x', def_altura: '', tr_ref: 'Rápido' }, jugadores: [{ nombre: ' Juan ', dorsal: '1O9x', tipo: 'raro', nota: ' zurdo ' }, { nombre: '' }] });
t('limpia: solo campos conocidos y con texto', JSON.stringify(Object.keys(l.datos).sort()) === JSON.stringify(['dibujo', 'tr_ref']));
t('limpia: recorta', l.datos.dibujo === '1-4-4-2');
t('limpia: jugador', l.jugadores.length === 1 && l.jugadores[0].nombre === 'Juan' && l.jugadores[0].dorsal === '19' && l.jugadores[0].tipo === 'clave' && l.jugadores[0].nota === 'zurdo');
t('máximo de jugadores', limpiarInforme({ jugadores: Array.from({ length: 30 }, (_, i) => ({ nombre: 'J' + i, tipo: 'clave' })) }).jugadores.length === 20);
t('texto largo recortado', limpiarInforme({ datos: { dibujo: 'a'.repeat(900) } }).datos.dibujo.length === 600);

const r = resumenInforme({ datos: { dibujo: '1-4-3-3', def_altura: 'Bloque bajo', met_abp: '3 de 11' } });
t('resumen: secciones con respuesta', r.length === 2 && r[0].id === 'sistema' && r[0].lineas.length === 2 && r[1].id === 'tendencias');
t('progreso', progreso({ datos: { dibujo: 'x', tr_ref: 'y' } }).hechos === 2 && progreso({}).total === ids.length);
t('por tipo', jugadoresPorTipo({ jugadores: [{ nombre: 'A', tipo: 'apercibido' }, { nombre: 'B', tipo: 'clave' }] }, 'apercibido').length === 1);
t('formación 1-4-4-2', JSON.stringify(lineasFormacion('1-4-4-2')) === '[4,4,2]');
t('formación 4-3-3', JSON.stringify(lineasFormacion('4-3-3')) === '[4,3,3]');
t('formación con espacios y 5 líneas', JSON.stringify(lineasFormacion('1 - 4 - 2 - 3 - 1')) === '[4,2,3,1]');
t('formación no válida', lineasFormacion('4-4-4') === null && lineasFormacion('hola') === null && lineasFormacion('') === null && lineasFormacion('11') === null);
const pf = puntosFormacion([4, 4, 2]);
t('puntos: 11 jugadores dentro del campo', pf.length === 11 && pf.every((p) => p.x > 0 && p.x < 1 && p.y > 0 && p.y < 1));
t('puntos: portero abajo y delanteros arriba', pf[0].y > pf[1].y && pf[10].y < pf[1].y);
t('puntos: sin formación', puntosFormacion(null).length === 0);
t('un campo con formacion', SECCIONES[0].campos.filter((c) => c.formacion).length === 3);
console.log(`scouting: ${ok} ok, ${mal} mal`);

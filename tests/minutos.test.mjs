import { calcularMinutosJugados, jugadoresEnCampo, jugadoresEnBanquillo } from './minutos.mjs';
let ok = 0, mal = 0;
const t = (n, c) => { if (c) ok++; else { mal++; console.log('MAL:', n); } };
const J = (id) => ({ id, nombre: 'J' + id, apellidos: '' });
const conv = [1, 2, 3].map((i) => ({ jugador: J(i), titular: true })).concat([4, 5].map((i) => ({ jugador: J(i), titular: false })));
const ids = (l) => l.map((j) => j.id).sort().join(',');
const cambio = (id, minuto, sale, entra) => ({ id, tipo: 'cambio', minuto, jugador_sale_id: sale, jugador_entra_id: entra });
const min = (r, id) => r.find((x) => x.id === id).minutosJugados;

t('inicio: campo 1,2,3', ids(jugadoresEnCampo(conv, [])) === '1,2,3');
t('inicio: banquillo 4,5', ids(jugadoresEnBanquillo(conv, [])) === '4,5');

// Un titular sale y vuelve a entrar
const ev = [cambio(1, 30, 1, 4), cambio(2, 60, 4, 1)];
t('titular que salió queda en el banquillo', ids(jugadoresEnBanquillo(conv, [ev[0]])) === '1,5');
t('puede volver: campo 1,2,3', ids(jugadoresEnCampo(conv, ev)) === '1,2,3');
t('el suplente que salió vuelve al banquillo', ids(jugadoresEnBanquillo(conv, ev)) === '4,5');
let r = calcularMinutosJugados(conv, ev, 90);
t('titular: 30 + 30 = 60', min(r, 1) === 60);
t('suplente: 30', min(r, 4) === 30);
t('el que no juega 0 y jugo false', min(r, 5) === 0 && r.find((x) => x.id === 5).jugo === false);

// Suplente entra, sale y vuelve
const ev2 = [cambio(1, 45, 2, 4), cambio(2, 70, 4, 5), cambio(3, 80, 5, 4)];
r = calcularMinutosJugados(conv, ev2, 90);
t('suplente 45-70 + 80-90 = 35', min(r, 4) === 35);
t('otro suplente 70-80 = 10', min(r, 5) === 10);
t('titular sustituido: 45', min(r, 2) === 45);

// Expulsado: no vuelve y sus minutos acaban en la roja
const ev3 = [{ id: 1, tipo: 'roja', minuto: 50, jugador_id: 3 }, cambio(2, 60, 1, 3)];
t('expulsado no está en el banquillo', !ids(jugadoresEnBanquillo(conv, ev3)).split(',').includes('3'));
t('expulsado no vuelve al campo', !ids(jugadoresEnCampo(conv, ev3)).split(',').includes('3'));
r = calcularMinutosJugados(conv, ev3, 90);
t('expulsado: 50', min(r, 3) === 50);

// Eventos creados desordenados se ordenan por minuto
const ev4 = [cambio(2, 60, 4, 1), cambio(1, 30, 1, 4)];
t('orden por minuto', min(calcularMinutosJugados(conv, ev4, 90), 1) === 60);
// Minuto final por debajo de un cambio
t('partido cortado a los 20', min(calcularMinutosJugados(conv, ev, 20), 1) === 20 && min(calcularMinutosJugados(conv, ev, 20), 4) === 0);
// Minutos puestos a mano: mandan sobre los cambios, 0 = no jugó, vacío = automático
const rm = calcularMinutosJugados(conv, ev, 90, { 1: 74, 4: 16, 5: 0, 2: null });
t('manual: 74', min(rm, 1) === 74 && rm.find((x) => x.id === 1).manual === true);
t('manual: suplente 16', min(rm, 4) === 16 && rm.find((x) => x.id === 4).jugo === true);
t('manual 0 = no jugó', rm.find((x) => x.id === 5).jugo === false && min(rm, 5) === 0);
t('null = automático', min(rm, 2) === 90 && !rm.find((x) => x.id === 2).manual);
console.log(`minutos: ${ok} ok, ${mal} mal`);

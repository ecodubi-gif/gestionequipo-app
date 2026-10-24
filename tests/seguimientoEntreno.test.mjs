import { pasosDeSesion, estadoVacio, ponerSeries, sumarSerie, sumarSegundos, marcarHecho, ponerNota, normalizarEstado, resumenSeguimiento, textoSeguimiento, mmss, datosPaso } from './seguimientoEntreno.mjs';
let ok = 0, mal = 0;
const t = (n, c) => { if (c) ok++; else { mal++; console.log('MAL:', n); } };
const tarea = (id, nombre, series, seg, pausa) => ({ id, nombre, series, duracion_seg: seg, pausa_seg: pausa, minutos: Math.round((series * seg + (series - 1) * pausa) / 60) });
const sesion = { items: [
  { clave: 'preventivo', titulo: 'Preventivo', minutos: 15, estaciones: [] },
  { clave: 'rueda_perfiles', titulo: 'Rueda', minutos: 15, tareas: [], texto: null },
  { clave: 'parte_central', titulo: 'Parte central', minutos: 20, tareas: [tarea(1, 'Rondo 4x2', 4, 180, 45), tarea(2, 'Juego 6x6', 3, 240, 60)] },
  { clave: 'cierre_tactico', titulo: 'Cierre', minutos: 0, tareas: [] },
  { clave: 'estiramientos', titulo: 'Estiramientos', minutos: 5, texto: 'a · b · c' },
] };
const pasos = pasosDeSesion(sesion);
t('pasos: preventivo, 2 tareas, rueda y estiramientos', pasos.map((p) => p.id).join(',') === 'b-preventivo,b-rueda_perfiles,t1,t2,b-estiramientos');
t('tarea: series y segundos', pasos[2].series === 4 && pasos[2].segundos === 180 && pasos[2].pausa === 45);
t('cierre sin tareas no sale', !pasos.some((p) => p.bloqueClave === 'cierre_tactico'));
let e = estadoVacio();
e = sumarSerie(e, pasos[2]); e = sumarSerie(e, pasos[2]);
t('2 series', datosPaso(e, 't1').series_hechas === 2 && !datosPaso(e, 't1').hecha);
e = ponerSeries(e, pasos[2], 9);
t('series se limitan al máximo y marcan hecha', datosPaso(e, 't1').series_hechas === 4 && datosPaso(e, 't1').hecha);
e = sumarSegundos(e, 't1', 725.4); e = sumarSegundos(e, 't1', -9999);
t('segundos no bajan de 0', datosPaso(e, 't1').seg_reales === 0);
e = sumarSegundos(e, 't1', 725.4);
e = marcarHecho(e, pasos[3]); e = ponerNota(e, 't2', 'Faltó un jugador');
const r = resumenSeguimiento(pasos, e);
t('resumen', r.total === 5 && r.hechos === 2 && r.realSeg === 725 && !r.completo);
e = marcarHecho(e, pasos[3], false);
t('desmarcar quita la hecha', !datosPaso(e, 't2').hecha);
const n = normalizarEstado({ pasos: { t1: { series_hechas: 99, seg_reales: -5, hecha: 1, nota: 'x' }, fantasma: { hecha: true } }, actual: 99 }, pasos);
t('normalizar', n.pasos.t1.series_hechas === 4 && n.pasos.t1.seg_reales === 0 && !n.pasos.fantasma && n.actual === 4);
t('mmss', mmss(185) === '3:05' && mmss(-3) === '0:00');
const txt = textoSeguimiento({ titulo: 'Entreno 24/10', pasos, estado: e });
t('previsto en segundos', pasos[2].previstoSeg === 4 * 180 + 3 * 45 && pasos[0].previstoSeg === 900 && r.previstoSeg === 900 + 900 + 4 * 180 + 3 * 45 + 3 * 240 + 2 * 60 + 300);
t('texto compartible', txt.includes('✅') && txt.includes('Rondo 4x2') && txt.includes('4/4 series') && txt.includes('📝 Faltó un jugador'));
console.log('seguimiento:', ok, 'ok', mal, 'mal');

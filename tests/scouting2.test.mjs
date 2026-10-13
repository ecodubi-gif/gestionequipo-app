import { limpiarInforme, progreso, cambiosEntre } from './scouting.mjs';
let n=0; const t=(c,m)=>{ if(!c){console.log('FALLO',m);process.exitCode=1;} else n++; };
const a={datos:{dibujo:'4-4-2'},jugadores:[]};
const b={datos:{dibujo:'4-4-2',goles_05:'{"j":5}',goles_xx:'no'},jugadores:[]};
t(limpiarInforme(b).datos.goles_05 && !limpiarInforme(b).datos.goles_xx,'clave goles');
t(progreso(b).hechos===1,'no cuenta goles');
t(cambiosEntre(a,b).some(c=>/Goles/.test(c.etiqueta)),'cambio goles');
t(cambiosEntre(b,b).length===0,'sin cambios');
console.log(n+' ok');

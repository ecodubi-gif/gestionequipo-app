import fs from 'fs';
import { tareaDesdePlantilla, tareasPorCargar, tareasParaPlantilla, MAX_TAREAS_PLANTILLA } from './semana.mjs';
import { calcularDimensiones, jugadoresDeCampo, OBJETIVOS } from './tareas.mjs';
let ok=0,mal=0; const t=(n,c)=>{ if(c)ok++; else {mal++;console.log('FALLA',n)} };
const S=JSON.parse(fs.readFileSync('semana.json','utf8'));
const BLOQ=['rueda_perfiles','activacion','parte_central','cierre_tactico'], REF=['porterias','miniporterias','sin_referencia'];
for (const [n,s] of Object.entries(S)) {
  t(`E${n} tiene perfil`, s.fase&&s.puntal&&s.densidad&&s.gestion);
  t(`E${n} <=12 tareas`, s.tareas.length<=MAX_TAREAS_PLANTILLA);
  t(`E${n} un tarea por bloque al menos`, BLOQ.every(b=>s.tareas.some(x=>x.bloque===b)));
  for (const x of s.tareas) {
    t(`${n} ${x.nombre} válida`, BLOQ.includes(x.bloque)&&REF.includes(x.referencia)&&OBJETIVOS[x.objetivo]&&x.duracion_seg>=5&&x.duracion_seg<=3600&&x.series>=1&&x.series<=20&&x.pausa_seg>=0&&x.pausa_seg<=600&&x.largo>=5&&x.ancho>=5&&x.n_porteros<=4);
    const p=tareaDesdePlantilla(x);
    t(`${n} ${x.nombre} crear`, Array.isArray(p.jugadores)&&p.jugadores.length===0&&p.duracion_seg===x.duracion_seg&&p.duracion_min>=1);
  }
}
// valores concretos de la matriz
const m1=S['1'].tareas, m2=S['2'].tareas, m3=S['3'].tareas;
const ap=(x)=>Math.round(x.largo*x.ancho/(x.n_ataque+x.n_defensa+x.n_comodines));
t('E1 8v8 = 150 m²/jug', ap(m1[2])===150);
t('E1 3v3+2P compensación = 83 m² (sin porteros)', ap(m1[3])===83);
t('E1 conservación 6v6+2 = 54', ap(m1[1])===54);
t('E1 central dividida: recuperación + compensación', m1.filter(x=>x.bloque==='parte_central').map(x=>x.objetivo).sort().join()==='compensacion,recuperacion');
t('E2 rondos 3v1 = 16', ap(m2[1])===16);
t('E3 pareja 15x10 = 75', ap(m3[1])===75);
t('E3 cierre 10v10 50x40 = 100', ap(m3[3])===100);
t('E3 cierre continuo 30 min', m3[3].series*m3[3].duracion_seg/60===30);
// cargar / repetidas
const ya=[{bloque:'parte_central',nombre:'  conservación amplia 8V8 '}];
const r=tareasPorCargar(S['1'],ya); t('repetida se salta (mayúsculas y espacios)', r.repetidas===1&&r.nuevas.length===m1.length-1);
t('misma tarea en otro bloque no es repetida', tareasPorCargar(S['1'],[{bloque:'cierre_tactico',nombre:'Conservación amplia 8v8'}]).repetidas===0);
t('sin plantilla', tareasPorCargar(null,[]).nuevas.length===0);
// guardar sesión como plantilla
const sesion=[{id:9,entrenamiento_id:3,bloque:'parte_central',nombre:'X',objetivo:'fuerza',referencia:null,n_ataque:3,n_defensa:3,n_comodines:null,n_porteros:0,largo:20,ancho:15,series:4,duracion_min:2,pausa_seg:null,descripcion:null,jugadores:[{jugador_id:1,rol:'ataque'}]}];
const q=tareasParaPlantilla(sesion)[0];
t('sin id ni jugadores', !('id' in q)&&!('jugadores' in q)&&!('entrenamiento_id' in q));
t('minutos antiguos → segundos', q.duracion_seg===120);
t('nulos normalizados', q.referencia==='sin_referencia'&&q.n_comodines===0&&q.pausa_seg===0);
t('segundos mínimos 5', tareasParaPlantilla([{...sesion[0],duracion_seg:2}])[0].duracion_seg===5);
t('ida y vuelta', tareaDesdePlantilla(q).duracion_seg===120);
console.log(`${ok} OK, ${mal} fallos`);

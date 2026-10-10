import { bloqueConGrupos, repartirTareasPorGrupo, jugadoresPorGrupo } from './planSesion.mjs';
import { construirSesion, htmlSesion } from './sesion.mjs';
let ok=0,mal=0; const t=(n,c)=>{ if(c){ok++}else{mal++;console.log('FALLA',n)} };
t('tipo1 central',bloqueConGrupos(1,'parte_central')); t('tipo1 cierre',bloqueConGrupos(1,'cierre_tactico'));
t('tipo1 activ no',!bloqueConGrupos(1,'activacion')); t('tipo2 no',!bloqueConGrupos(2,'parte_central')); t('tipo3 no',!bloqueConGrupos(3,'cierre_tactico'));
const r=repartirTareasPorGrupo([{id:1,objetivo:'recuperacion'},{id:2,objetivo:'compensacion'},{id:3,objetivo:null},{id:4,objetivo:'fuerza'}]);
t('rep',r.recuperacion.length===1&&r.compensacion.length===1&&r.otras.length===2);
t('rep vacio',repartirTareasPorGrupo(null).otras.length===0);
const js=[{id:1,posicion:'Portero'},{id:2,posicion:'Medio Centro'},{id:3,posicion:'Central Derecho'},{id:4,posicion:'Delantero Centro'},{id:5,posicion:'Extremo Izquierdo'}];
const g=jugadoresPorGrupo(js,{1:90,2:90,3:60,4:30},[1,2,3,4]);
t('porteros fuera',![...g.recuperacion,...g.compensacion].some(j=>j.id===1));
t('60 exacto a recuperación',g.recuperacion.map(j=>j.id).join()==='2,3');
t('<60 compensación',g.compensacion.map(j=>j.id).join()==='4,5');
t('no convocado',g.noConvocados.map(j=>j.id).join()==='5');
t('sin partido',jugadoresPorGrupo(js,null,[])===null);
const ent={fecha:'2026-10-06',hora:'19:00',bloques:{}};
const tar=[{id:1,bloque:'parte_central',objetivo:'recuperacion',series:3,duracion_min:6,pausa_seg:60,jugadores:[]},
 {id:2,bloque:'parte_central',objetivo:'compensacion',series:4,duracion_min:8,pausa_seg:90,jugadores:[]},
 {id:3,bloque:'parte_central',objetivo:null,series:1,duracion_min:5,pausa_seg:0,jugadores:[]},
 {id:4,bloque:'cierre_tactico',objetivo:'compensacion',series:2,duracion_min:10,pausa_seg:60,jugadores:[]}];
const s1=construirSesion({entrenamiento:ent,plantilla:null,tareas:tar,tipo:1});
const pc=s1.items.find(i=>i.clave==='parte_central'), ct=s1.items.find(i=>i.clave==='cierre_tactico');
// rec: 3*6+2*1=20 ; comp: 4*8+3*1.5=36.5→ round(36.5)=37 (Math.round) ; otras 5
t('grupos existen',pc.grupos.length===2);
t('min rec',pc.grupos[0].minutos===20); t('min comp',pc.grupos[1].minutos===37);
t('bloque = max + otras',pc.minutos===37+5);
t('otras en tareas',pc.tareas.length===1&&pc.tareas[0].id===3);
t('cierre',ct.minutos===21&&ct.grupos[0].tareas.length===0);
const s2=construirSesion({entrenamiento:ent,plantilla:null,tareas:tar,tipo:2});
const pc2=s2.items.find(i=>i.clave==='parte_central');
t('tipo2 sin grupos',pc2.grupos===null&&pc2.tareas.length===3&&pc2.minutos===20+37+5);
const sOld=construirSesion({entrenamiento:ent,plantilla:null,tareas:tar});
t('sin tipo = como antes',sOld.items.find(i=>i.clave==='parte_central').grupos===null);
const h=htmlSesion({entrenamiento:ent,tipo:1,sesion:s1,jugadoresPorId:{},trabajoAparte:[],asistentes:null,lugar:''});
t('html grupos',h.includes('Recuperación')&&h.includes('Compensación')&&h.includes('grupo-cab'));
const h2=htmlSesion({entrenamiento:ent,tipo:2,sesion:s2,jugadoresPorId:{},trabajoAparte:[],asistentes:null,lugar:''});
t('html tipo2 sin grupos',!h2.includes('class="grupo"'));
console.log(`${ok} OK, ${mal} fallos`);

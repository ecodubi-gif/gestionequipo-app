import { cargaPrevista, compararCarga, RPE_ESPERADO, TEXTO_VEREDICTO, formatoPct } from './cargaPlanificada.mjs';
import { construirSesion } from './sesion.mjs';
let ok=0,mal=0; const t=(n,c)=>{ if(c)ok++; else {mal++;console.log('FALLA',n)} };
const plantilla={preventivo:[{},{},{},{}],movilidad:[{}]};
const ent={fecha:'2026-10-06',hora:'19:00',bloques:{}};
const T=(id,bloque,objetivo,series,seg,pausa)=>({id,bloque,objetivo,series,duracion_seg:seg,pausa_seg:pausa,jugadores:[]});
// sesión simple (Entreno 2): central 4x4' fuerza pausa 90 → 4*240+3*90=1230s → 20.5→ round 21 min ; cierre 3x7' fuerza pausa 120 → 1260+240=1500s=25'
let s=construirSesion({entrenamiento:ent,plantilla,tareas:[T(1,'parte_central','fuerza',4,240,90),T(2,'cierre_tactico','fuerza',3,420,120)],tipo:2});
let p=cargaPrevista(s);
t('el último bloque son los estiramientos, 5 minutos', s.items[s.items.length-1].clave==='estiramientos'&&s.items[s.items.length-1].minutos===5&&s.items[s.items.length-1].titulo==='Estiramientos');
t('estiramientos con rpe 1 en el desglose', p.desglose[p.desglose.length-1].clave==='estiramientos'&&p.desglose[p.desglose.length-1].rpe===1);
t('todo entreno acaba en estiramientos aunque no haya tareas', construirSesion({entrenamiento:ent,plantilla:null,tareas:[],tipo:1}).items.slice(-1)[0].clave==='estiramientos');
t('minutos = total de la sesión', p.minutos===s.total);
// preventivo 15*3 + movilidad 5*2 + (rueda 7 + activación 8 sin tareas)*4 + 21*7 + 25*7 + estiramientos 5*1
const esperado=15*3+5*2+7*4+8*4+21*7+25*7+5*1;
t('carga cuenta cada bloque', p.carga===esperado);
t('rpe = carga / minutos', Math.abs(p.rpe-Math.round(esperado/s.total*10)/10)<0.051);
t('desglose por bloque', p.desglose.length===7&&p.desglose[0].clave==='preventivo'&&p.desglose[0].rpe===3);
// objetivo distinto cambia el rpe
const s2=construirSesion({entrenamiento:ent,plantilla,tareas:[T(1,'parte_central','recuperacion',4,240,90),T(2,'cierre_tactico','recuperacion',3,420,120)],tipo:2});
t('recuperación pesa menos que fuerza', cargaPrevista(s2).carga<p.carga);
// tarea sin objetivo = 5
const s3=construirSesion({entrenamiento:ent,plantilla,tareas:[T(1,'parte_central',null,4,240,90)],tipo:2});
t('sin objetivo usa RPE 5', cargaPrevista(s3).desglose.find(d=>d.clave==='parte_central').rpe===5);
// entreno 1 dividido: grupos con pesos
const g=[T(1,'parte_central','recuperacion',2,600,120),T(2,'parte_central','compensacion',4,180,90)];
const s4=construirSesion({entrenamiento:ent,plantilla,tareas:g,tipo:1});
const igual=cargaPrevista(s4);
const masRec=cargaPrevista(s4,{recuperacion:3,compensacion:1});
t('más gente en recuperación baja la carga media', masRec.carga<igual.carga);
t('pesos 0/1 = solo compensación', cargaPrevista(s4,{recuperacion:0,compensacion:1}).carga>igual.carga);
// bloque con tareas pero duración fija (rueda 7')
const s5=construirSesion({entrenamiento:ent,plantilla,tareas:[T(1,'rueda_perfiles','fuerza',5,100,20)],tipo:2});
t('rueda con tarea usa su objetivo', cargaPrevista(s5).desglose.find(d=>d.clave==='rueda_perfiles').rpe===7);
// sin plantilla ni tareas
const s6=construirSesion({entrenamiento:ent,plantilla,tareas:[],tipo:2});
t('sesión vacía no rompe', cargaPrevista(s6).carga>0);
// comparación
const prev={minutos:90,rpe:6,carga:540};
let c=compararCarga(prev,{minutos:90,rpe:6});
t('en línea', c.veredicto==='en_linea'&&c.carga.real===540&&c.carga.pct===0);
c=compararCarga(prev,{minutos:90,rpe:7}); // 630: +16.7%
t('algo más dura', c.veredicto==='mas_dura');
c=compararCarga(prev,{minutos:100,rpe:7.5}); // 750: +38.9%
t('mucho más dura', c.veredicto==='mucho_mas_dura');
c=compararCarga(prev,{minutos:90,rpe:5}); // 450 -16.7%
t('algo más suave', c.veredicto==='mas_suave');
c=compararCarga(prev,{minutos:60,rpe:4}); // 240 -55%
t('mucho más suave', c.veredicto==='mucho_mas_suave');
c=compararCarga(prev,null); t('sin real', c.veredicto==='sin_datos'&&c.carga.real===null&&c.minutos.real===null);
c=compararCarga(prev,{minutos:90,rpe:null}); t('solo minutos', c.veredicto==='sin_datos'&&c.minutos.real===90&&c.minutos.pct===0);
c=compararCarga(prev,{minutos:90,rpe:6.9}); t('límite 15%: 621/540=+15%', c.veredicto==='en_linea');
t('todos los veredictos tienen texto', ['sin_datos','en_linea','mas_dura','mucho_mas_dura','mas_suave','mucho_mas_suave'].every(k=>TEXTO_VEREDICTO[k]));
t('formato pct', formatoPct(0.167)==='+17 %'&&formatoPct(-0.5)==='-50 %'&&formatoPct(null)==='');
console.log(`${ok} OK, ${mal} fallos`);

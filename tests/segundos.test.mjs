import { segundosDe, formatoDuracion, relacionTrabajoPausa, totalesTarea, trabajoInicial, avisosTrabajo, ESCALA_DURACION, OBJETIVOS } from './tareas.mjs';
import { minutosTarea } from './sesion.mjs';
let ok=0,mal=0; const t=(n,c)=>{ if(c)ok++; else {mal++;console.log('FALLA',n)} };
t('seg nuevo',segundosDe({duracion_seg:45,duracion_min:1})===45);
t('seg antiguo',segundosDe({duracion_min:6})===360);
t('seg vacío',segundosDe({})===0);
t('fmt 45',formatoDuracion(45)==="45''"); t('fmt 4',formatoDuracion(240)==="4'"); t('fmt 1:30',formatoDuracion(90)==="1'30''"); t('fmt 0',formatoDuracion(0)==='?');
t('10 min / 2 min = 5:1',relacionTrabajoPausa(600,120)==='5:1');
t("10'' / 50'' = 1:5",relacionTrabajoPausa(10,50)==='1:5');
t("100''/20'' = 5:1",relacionTrabajoPausa(100,20)==='5:1');
t('3 min / 1.5 = 2:1',relacionTrabajoPausa(180,90)==='2:1');
t('4/4 min = 1:1',relacionTrabajoPausa(240,240)==='1:1');
t('sin pausa',relacionTrabajoPausa(240,0)==='sin pausa');
const a=totalesTarea(4,45,45); t('4x45 + 3x45',a.juegoSeg===180&&a.totalSeg===315);
t('minutosTarea 6x10s pausa 90',minutosTarea({series:6,duracion_seg:10,pausa_seg:90})===Math.round((60+450)/60));
t('minutosTarea antigua',minutosTarea({series:3,duracion_min:6,pausa_seg:90})===Math.round((1080+180)/60));
t('minutosTarea 2x10 pausa 2',minutosTarea({series:2,duracion_seg:600,pausa_seg:120})===22);
t('escala creciente',ESCALA_DURACION.every((v,i,l)=>i===0||v>l[i-1]));
t('escala incluye 8,10,45,100',[8,10,45,100].every(v=>ESCALA_DURACION.includes(v)));
t('escala máx 3600',ESCALA_DURACION[ESCALA_DURACION.length-1]===3600);
for (const [k,o] of Object.entries(OBJETIVOS)) {
  const w=o.trabajo; const ini=trabajoInicial(k);
  t(k+' inicial dentro',avisosTrabajo(k,ini.series,ini.duracion_seg,ini.pausa_seg).length===0);
  t(k+' apP inicial en rango',o.apP[0]<o.apPInicial&&o.apPInicial<o.apP[1]);
  t(k+' segundos ordenados',w.segundos[0]<=w.segundos[2]&&w.segundos[2]<=w.segundos[1]);
}
t('fuerza aviso larga',avisosTrabajo('fuerza',4,600,90).length===1);
t('puesta: 8 x 10 pausa 50 sin avisos',avisosTrabajo('puesta_a_punto',8,10,50).length===0);
console.log(`${ok} OK, ${mal} fallos`);

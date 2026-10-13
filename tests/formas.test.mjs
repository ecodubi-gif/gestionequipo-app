import * as P from './pizarra.mjs';
import * as F from './formas.mjs';
let ok=0,mal=0; const t=(n,c)=>{ if(c)ok++; else {mal++;console.log('FALLA',n)} };
const tarea={largo:40,ancho:30,referencia:'porterias',n_ataque:4,n_defensa:4,n_comodines:1,n_porteros:2};
const campo={id:1,nombre:'C',largo:105,ancho:68};
let d=P.nuevoDibujo({tarea,campo});
for (const tp of Object.keys(P.ELEMENTOS)) d=P.anadirElemento(d,tp,0.2+Math.random()*0.5,0.2+Math.random()*0.5).dibujo;
for (const tp of Object.keys(P.FLECHAS)) d=P.anadirFlecha(d,tp,{u:0.1,v:0.1},{u:0.8,v:0.6}).dibujo;
const r=F.formasTarea({tarea,dibujo:d,campo,modo:'vista',anchoMax:300,altoMax:190});
const cuenta=(k)=>r.formas.filter(f=>f.k===k).length;
t('el lienzo cabe en la caja', r.ancho<=300&&r.alto<=190+1);
t('hay 11 jugadores dibujados', r.formas.filter(f=>f.k==='circle'&&Object.values(P.COLOR_JUGADOR).includes(f.fill)).length===11);
const flechas=r.formas.filter(f=>f.k==='line'&&Object.values(P.FLECHAS).some(x=>x.color===f.stroke)&&f.sw===2.4);
t('5 flechas con su color', flechas.length===5&&new Set(flechas.map(f=>f.stroke)).size===5);
t('discontinuas = balón (pase y tiro)', flechas.filter(f=>f.dash).map(f=>f.stroke).sort().join()===[P.FLECHAS.pase.color,P.FLECHAS.tiro.color].sort().join());
t('continuas = jugador', flechas.filter(f=>!f.dash).length===3);
t('5 cabezas de flecha del color de su flecha', r.formas.filter(f=>f.k==='poly'&&Object.values(P.FLECHAS).some(x=>x.color===f.fill)).length===5);
t('un cono es un triángulo naranja', r.formas.some(f=>f.k==='poly'&&f.fill==='#f97316'&&f.pts.length===3));
t('la zona de color tiene su color', r.formas.some(f=>f.k==='rect'&&f.fill===P.COLOR_ZONA_INICIAL&&f.op===0.35));
t('el texto sale', r.formas.some(f=>f.k==='text'&&f.t==='Texto'));
// todas las formas dentro del lienzo (con holgura por los elementos del borde)
const dentro=(x,y)=>x>=-12&&y>=-12&&x<=r.ancho+12&&y<=r.alto+12;
t('nada fuera del lienzo', r.formas.every(f=>f.k==='rect'?dentro(f.x,f.y)&&dentro(f.x+f.w,f.y+f.h):f.k==='circle'?dentro(f.cx,f.cy):f.k==='line'?dentro(f.x1,f.y1)&&dentro(f.x2,f.y2):f.k==='poly'?f.pts.every(p=>dentro(p[0],p[1])):dentro(f.x,f.y)));
t('sin NaN', !JSON.stringify(r.formas).includes('null')||!/NaN/.test(JSON.stringify(r.formas)));
t('sin NaN (de verdad)', r.formas.every(f=>Object.values(f).every(v=>typeof v!=='number'||Number.isFinite(v))));
// pizarra = campo entero con marcas
const pz=F.formasTarea({tarea,dibujo:d,campo,modo:'pizarra',anchoMax:340,altoMax:240});
t('pizarra: la zona 40x30 se dibuja en medio campo (y el dibujo viejo, más allá de la mitad, con el campo entero)', pz.ventana.w===105&&pz.ventana.h===68);
t('pizarra: líneas de campo de referencia', pz.formas.filter(f=>f.k==='line').length>30);
const chico={id:2,nombre:'Chico',largo:50,ancho:40};
const dc=P.nuevoDibujo({tarea,campo:chico});
const pc=F.formasTarea({tarea,dibujo:dc,campo:chico,modo:'pizarra'});
t('campo pequeño: solo línea de medio', pc.formas.filter(f=>f.k==='rect'&&f.fill==='none').length===0&&pc.formas.some(f=>f.k==='line'));
t('escala: la vista acerca más que la pizarra', r.escala>pz.escala);
// ventana de la vista incluye la zona y lo de fuera
t('la vista incluye la zona entera', r.ventana.x0<=d.zona.x&&r.ventana.x0+r.ventana.w>=d.zona.x+40);
const d0=P.nuevoDibujo({tarea,campo});
const dfuera=P.anadirElemento(d0,'porteria',-0.4,0.5).dibujo;
const rf=F.formasTarea({tarea,dibujo:dfuera,campo,modo:'vista'});
const pFuera=P.aCampo(dfuera,tarea,-0.4,0.5);
t('la vista se amplía para incluir lo que está fuera de la zona', rf.ventana.x0<=pFuera.x-1);
const dborde=P.nuevoDibujo({tarea,campo}); dborde.zona={x:0,y:0};
const rb=F.formasTarea({tarea,dibujo:dborde,campo,modo:'vista'});
t('la ventana no sale del campo', rb.ventana.x0>=0&&rb.ventana.y0>=0);
// zona que no cabe → borde rojo
const grande={...tarea,largo:120,ancho:50};
const dg=P.nuevoDibujo({tarea:grande,campo});
t('zona que no cabe: borde rojo', F.formasTarea({tarea:grande,dibujo:dg,campo,modo:'pizarra'}).formas.some(f=>f.stroke===F.COLOR_CAMPO.error));
// selección
for (const sel of [{tipo:'zona'},{tipo:'jugador',i:0},{tipo:'elemento',i:2},{tipo:'flecha',i:1}]) {
  const base=F.formasTarea({tarea,dibujo:d,campo,modo:'pizarra'}).formas.length;
  const con=F.formasTarea({tarea,dibujo:d,campo,modo:'pizarra',seleccion:sel}).formas.length;
  t('selección '+sel.tipo+' añade formas', con>base);
}
t('selección fuera de rango no rompe', F.formasTarea({tarea,dibujo:d,campo,modo:'pizarra',seleccion:{tipo:'jugador',i:99}}).formas.length===pz.formas.length);
// px ↔ metros
const m=F.pxAMetros(pz,pz.pad+10*pz.escala,pz.pad+5*pz.escala);
t('pxAMetros', Math.abs(m.x-10)<1e-9&&Math.abs(m.y-5)<1e-9);
// svg
const svg=F.svgDeFormas(r);
t('svg válido y sin NaN', svg.startsWith('<svg')&&svg.endsWith('</svg>')&&!/NaN|undefined/.test(svg));
t('svg: flecha discontinua lleva stroke-dasharray', svg.includes('stroke-dasharray="7 5"'));
const sx=F.svgDeFormas(F.formasTarea({tarea,dibujo:P.cambiarElemento(P.anadirElemento(d0,'texto',0.5,0.5).dibujo,0,{texto:'<b>&"hola"</b>'}),campo}));
t('svg escapa el texto', !sx.includes('<b>')&&sx.includes('&lt;b&gt;'));
// leyenda
const ley=F.leyendaFlechas(d);
t('leyenda: solo las flechas usadas, con su color', ley.length===5&&ley.every(l=>l.color));
t('leyenda vacía sin flechas', F.leyendaFlechas(d0).length===0);
// Ventana ampliada sobre la zona
{
  const dz=P.nuevoDibujo({tarea,campo});
  const v=F.ventanaZona({tarea,dibujo:dz,campo});
  t('ventanaZona: contiene la zona entera', v.x0<=dz.zona.x && v.y0<=dz.zona.y && v.x0+v.w>=dz.zona.x+40 && v.y0+v.h>=dz.zona.y+30);
  t('ventanaZona: dentro del campo', v.x0>=0 && v.y0>=0 && v.x0+v.w<=105 && v.y0+v.h<=68);
  t('ventanaZona: mucho más pequeña que el campo', v.w<70 && v.h<50);
  const pegada={...dz,zona:{x:0,y:0}};
  const v2=F.ventanaZona({tarea,dibujo:pegada,campo});
  t('ventanaZona: zona en la esquina no sale del campo', v2.x0===0 && v2.y0===0);
  const rz=F.formasTarea({tarea,dibujo:dz,campo,modo:'pizarra',anchoMax:358,altoMax:300,ventana:v});
  const rc=F.formasTarea({tarea,dibujo:dz,campo,modo:'pizarra',anchoMax:358,altoMax:300});
  t('con la ventana ampliada la escala es mayor', rz.escala>rc.escala*1.4);
  const pz=F.pxAMetros(rz,rz.pad+(dz.zona.x-v.x0)*rz.escala,rz.pad+(dz.zona.y-v.y0)*rz.escala);
  t('pxAMetros respeta la ventana', Math.abs(pz.x-dz.zona.x)<0.01 && Math.abs(pz.y-dz.zona.y)<0.01);
}

// ---- Medio campo o campo entero según la zona
{
  const c100 = { id: 9, nombre: 'C100', largo: 100, ancho: 60 };
  const e1 = P.campoEfectivo(c100, 50, 60);
  t('50x60 en 100x60 es medio campo', e1.medio === true && e1.largo === 50 && e1.largoTotal === 100 && e1.ancho === 60);
  t('100x60 es campo entero', P.campoEfectivo(c100, 100, 60).medio === false && P.campoEfectivo(c100, 100, 60).largo === 100);
  t('menos de 50x60 es medio campo', P.campoEfectivo(c100, 40, 30).medio === true);
  t('más largo que la mitad es entero', P.campoEfectivo(c100, 60, 40).medio === false);
  t('en 105x68, 50x60 es medio campo', P.campoEfectivo(campo, 50, 60).medio === true);
  const tm = { ...tarea, largo: 40, ancho: 30 };
  const dm = P.nuevoDibujo({ tarea: tm, campo: P.campoEfectivo(campo, 40, 30) });
  const rm = F.formasTarea({ tarea: tm, dibujo: dm, campo, modo: 'pizarra', anchoMax: 300, altoMax: 300 });
  t('medio campo: el campo dibujado es la mitad', Math.abs(rm.ventana.w - 52.5) < 0.01 && Math.abs(rm.ventana.h - 68) < 0.01);
  const lineas = (res) => res.formas.filter((f) => f.k === 'line' && f.stroke === F.COLOR_CAMPO.linea);
  t('medio campo: hay líneas de campo de referencia', lineas(rm).length > 40);
  const tf = { ...tarea, largo: 100, ancho: 60 };
  const df = P.nuevoDibujo({ tarea: tf, campo: P.campoEfectivo(campo, 100, 60) });
  const rf = F.formasTarea({ tarea: tf, dibujo: df, campo, modo: 'pizarra', anchoMax: 300, altoMax: 300 });
  t('campo entero: la ventana es el campo entero', Math.abs(rf.ventana.w - 105) < 0.01);
  t('campo entero: más líneas que medio campo (dos áreas)', lineas(rf).length > lineas(rm).length);
  // También en la vista pequeña de la tarea hay referencias
  const rv = F.formasTarea({ tarea: tm, dibujo: dm, campo, modo: 'vista', anchoMax: 300, altoMax: 190 });
  t('en la vista de la tarea también salen líneas del campo', lineas(rv).length > 5);
  // Ninguna línea se sale del lienzo
  const dentro = (res) => lineas(res).every((l) => [l.x1, l.x2].every((x) => x >= -0.01 && x <= res.ancho + 0.01) && [l.y1, l.y2].every((y) => y >= -0.01 && y <= res.alto + 0.01));
  t('las líneas no se salen del lienzo', dentro(rm) && dentro(rf) && dentro(rv));
  const [a, b, cc, dd] = F.recortar(-5, 5, 5, 5, 0, 0, 10, 10);
  t('recortar un segmento que entra', a === 0 && b === 5 && cc === 5 && dd === 5 && F.recortar(20, 5, 30, 5, 0, 0, 10, 10) === null);
  // Medio campo: todas las líneas dentro de la mitad
  const seg = F.lineasDeCampo(P.campoEfectivo(campo, 40, 30));
  t('medio campo: nada pasa de la mitad', seg.every((s2) => s2[0] <= 52.5 + 1e-6 && s2[2] <= 52.5 + 1e-6 && s2[1] >= -1e-6 && s2[3] <= 68 + 1e-6));
}
console.log(`formas: ${ok} ok, ${mal} mal`); process.exit(mal?1:0);

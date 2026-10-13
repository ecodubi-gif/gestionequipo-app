import * as P from './pizarra.mjs';
import { calcularDimensiones } from './tareas.mjs';
let ok=0,mal=0; const t=(n,c)=>{ if(c)ok++; else {mal++;console.log('FALLA',n)} };
const cerca=(a,b,e=1e-6)=>Math.abs(a-b)<e;
const tarea={largo:40,ancho:30,referencia:'porterias',n_ataque:4,n_defensa:4,n_comodines:1,n_porteros:2};
const campo={id:7,nombre:'Campo 2',largo:60,ancho:40};

// --- zona sugerida y límites del campo
const r=calcularDimensiones({objetivo:'fuerza',referencia:'porterias',jugadoresCampo:30,apP:200});
t('sin campo elegido sigue limitando al fútbol 11', r.largo<=105&&r.ancho<=68);
const z=P.zonaSugerida({objetivo:'fuerza',referencia:'porterias',jugadoresCampo:30,apP:200,campo});
t('la zona sugerida no pasa del campo elegido', z.largo<=60&&z.ancho<=40&&z.avisos.some(a=>a.includes('campo elegido')));
const z2=P.zonaSugerida({objetivo:'fuerza',referencia:'porterias',jugadoresCampo:8,apP:100,campo});
t('si cabe, sin avisos de tamaño', !z2.avisos.some(a=>a.includes('no cabe')));
for (const [n,ap] of [[8,100],[10,130],[8,80],[6,60],[12,150]]) t(`sin falso aviso: ${n} jugadores a ${ap} m²`, calcularDimensiones({objetivo:'fuerza',referencia:'porterias',jugadoresCampo:n,apP:ap}).avisos.length===0);
t('con el límite de verdad sí avisa', calcularDimensiones({objetivo:'fuerza',referencia:'porterias',jugadoresCampo:40,apP:300}).avisos.some(a=>a.includes('fútbol 11')));
t('campo por defecto 100×60', P.CAMPO_POR_DEFECTO.largo===100&&P.CAMPO_POR_DEFECTO.ancho===60 && P.campoEfectivo(P.CAMPO_POR_DEFECTO,50,60).medio===true && P.campoEfectivo(P.CAMPO_POR_DEFECTO,100,60).medio===false && P.campoEfectivo(P.CAMPO_POR_DEFECTO,50,60).largo===50);
// --- posición de la zona
t('centrar', JSON.stringify(P.centrarZona(campo,40,30))===JSON.stringify({x:10,y:5}));
t('limitar: no sale por la derecha/abajo', JSON.stringify(P.limitarZona(campo,{x:50,y:50},40,30))===JSON.stringify({x:20,y:10}));
t('limitar: no sale por la izquierda/arriba', JSON.stringify(P.limitarZona(campo,{x:-5,y:-5},40,30))===JSON.stringify({x:0,y:0}));
t('zona mayor que el campo: pegada a 0', JSON.stringify(P.limitarZona(campo,{x:5,y:5},80,50))===JSON.stringify({x:0,y:0}));
t('zonaCabe', P.zonaCabe(campo,60,40)&&!P.zonaCabe(campo,61,40));
// --- dibujo nuevo y jugadores
const d0=P.nuevoDibujo({tarea,campo});
t('nuevo: campo_id y zona centrada', d0.campo_id===7&&d0.zona.x===10&&d0.zona.y===5&&d0.v===1);
t('nuevo: 4+4+1+2 jugadores', d0.jugadores.length===11);
t('nuevo: sin elementos ni flechas', d0.elementos.length===0&&d0.flechas.length===0);
t('jugadores dentro de la zona (u,v 0..1)', d0.jugadores.every(j=>j.u>=0&&j.u<=1&&j.v>=0&&j.v<=1));
const cp=P.aCampo(d0,tarea,0.5,0.5);
t('aCampo: centro de la zona', cerca(cp.x,30)&&cerca(cp.y,20));
const bk=P.aZona(d0,tarea,cp.x,cp.y);
t('aZona deshace aCampo', cerca(bk.u,0.5)&&cerca(bk.v,0.5));
// sincronizar: conserva el movido
let d1=JSON.parse(JSON.stringify(d0)); d1.jugadores[0]={rol:'ataque',u:0.9,v:0.9};
let s=P.sincronizarJugadores(d1.jugadores,{...tarea,n_ataque:5});
t('sincronizar: +1 ataque, conserva el movido', s.filter(j=>j.rol==='ataque').length===5&&s.find(j=>j.rol==='ataque').u===0.9);
s=P.sincronizarJugadores(d1.jugadores,{...tarea,n_ataque:2,n_comodines:0});
t('sincronizar: quita los que sobran', s.filter(j=>j.rol==='ataque').length===2&&s.filter(j=>j.rol==='comodin').length===0);
s=P.sincronizarJugadores([],tarea);
t('sincronizar desde cero = automático', s.length===11);
t('ajustarDibujo recoloca la zona dentro', P.ajustarDibujo({...d0,zona:{x:99,y:99}},tarea,campo).zona.x===20);
t('ajustarDibujo con otro campo cambia campo_id', P.ajustarDibujo(d0,tarea,{id:9,nombre:'x',largo:105,ancho:68}).campo_id===9);
t('campo por defecto: campo_id null', P.nuevoDibujo({tarea,campo:P.CAMPO_POR_DEFECTO}).campo_id===null);
// --- elementos y flechas
let a=P.anadirElemento(d0,'porteria',-0.05,0.5);
t('añadir portería', a.dibujo.elementos.length===1&&a.ref.tipo==='elemento'&&a.ref.i===0&&a.dibujo.elementos[0].giro===0);
t('el original no cambia (inmutable)', d0.elementos.length===0);
t('tipo inventado no se añade', P.anadirElemento(d0,'tanque',0,0).ref===null);
a=P.anadirElemento(a.dibujo,'zona',0.5,0.5);
t('zona de color con color y texto', a.dibujo.elementos[1].color===P.COLOR_ZONA_INICIAL&&a.dibujo.elementos[1].largo===10);
a=P.anadirElemento(a.dibujo,'texto',0.2,0.2);
t('texto con texto por defecto', a.dibujo.elementos[2].texto==='Texto');
let f=P.anadirFlecha(a.dibujo,'pase',{u:0.1,v:0.1},{u:0.6,v:0.4});
t('añadir flecha', f.dibujo.flechas.length===1&&f.dibujo.flechas[0].tipo==='pase');
t('flecha de tipo inventado no se añade', P.anadirFlecha(d0,'magica',{u:0,v:0},{u:1,v:1}).ref===null);
t('flechas: continua = jugador, discontinua = balón', P.FLECHAS.pase.discontinua&&P.FLECHAS.tiro.discontinua&&!P.FLECHAS.conduccion.discontinua&&!P.FLECHAS.desmarque.discontinua&&!P.FLECHAS.presion.discontinua);
t('cada tipo de flecha tiene un color distinto', new Set(Object.values(P.FLECHAS).map(x=>x.color)).size===5);
t('los colores de flecha no se confunden con los equipos', Object.values(P.FLECHAS).every(x=>x.color!==P.COLOR_JUGADOR.ataque&&x.color!==P.COLOR_JUGADOR.defensa&&x.color!==P.COLOR_JUGADOR.comodin));
t('colores de equipo distintos', new Set(Object.values(P.COLOR_JUGADOR)).size===4);
let g=P.cambiarElemento(f.dibujo,0,{giro:true});
t('girar portería', g.elementos[0].giro===90);
g=P.cambiarElemento(g,1,{largo:20,ancho:12,color:'#3b82f6',texto:'Pasillo'});
t('zona: tamaño, color y texto', g.elementos[1].largo===20&&g.elementos[1].ancho===12&&g.elementos[1].color==='#3b82f6'&&g.elementos[1].texto==='Pasillo');
g=P.cambiarElemento(g,0,{largo:99});
t('la portería no cambia de medida', g.elementos[0].largo===undefined);
g=P.cambiarElemento(g,1,{color:'#000000'});
t('color fuera de paleta se ignora', g.elementos[1].color==='#3b82f6');
g=P.cambiarElemento(g,1,{texto:'x'.repeat(100)});
t('texto limitado a 40', g.elementos[1].texto.length===40);
g=P.cambiarTipoFlecha(g,0,'tiro');
t('cambiar tipo de flecha', g.flechas[0].tipo==='tiro');
t('tipo de flecha inventado se ignora', P.cambiarTipoFlecha(g,0,'x').flechas[0].tipo==='tiro');
let b=P.borrar(g,{tipo:'flecha',i:0});
t('borrar flecha', b.flechas.length===0&&g.flechas.length===1);
b=P.borrar(g,{tipo:'elemento',i:0});
t('borrar elemento', b.elementos.length===2);
t('jugadores no se borran', P.borrar(g,{tipo:'jugador',i:0}).jugadores.length===11);
// medidas
t('portería 7,32 m: boca vertical por defecto', (m=>cerca(m.ancho,7.32)&&cerca(m.largo,2))(P.medidasElemento({tipo:'porteria',giro:0})));
t('portería girada: boca horizontal', (m=>cerca(m.largo,7.32))(P.medidasElemento({tipo:'porteria',giro:90})));
t('pica horizontal por defecto', P.medidasElemento({tipo:'pica',giro:0}).largo===1.8&&P.medidasElemento({tipo:'pica',giro:90}).ancho===1.8);
t('zona editable usa su tamaño', P.medidasElemento({tipo:'zona',giro:0,largo:20,ancho:12}).largo===20);
// --- mover
const base=P.anadirFlecha(P.anadirElemento(d0,'cono',0.5,0.5).dibujo,'pase',{u:0.2,v:0.2},{u:0.8,v:0.8}).dibujo;
let m=P.mover(base,tarea,campo,{tipo:'zona'},5,3);
t('mover zona', m.zona.x===15&&m.zona.y===8);
t('al mover la zona, lo de dentro se va con ella (mismo u,v)', m.jugadores[0].u===base.jugadores[0].u&&m.elementos[0].u===0.5&&m.flechas[0].u1===0.2);
t('mover zona no se sale del campo', P.mover(base,tarea,campo,{tipo:'zona'},999,999).zona.x===20);
m=P.mover(base,tarea,campo,{tipo:'jugador',i:0},4,0);
t('mover jugador +4 m = +0,1 de u', cerca(m.jugadores[0].u-base.jugadores[0].u,0.1,1e-3)&&m.jugadores[1].u===base.jugadores[1].u);
m=P.mover(base,tarea,campo,{tipo:'jugador',i:0},-999,-999);
const pa=P.aCampo(m,tarea,m.jugadores[0].u,m.jugadores[0].v);
t("un jugador no sale del campo", pa.x>=-0.05&&pa.y>=-0.05);
m=P.mover(base,tarea,campo,{tipo:'elemento',i:0},0,6);
t('mover elemento +6 m = +0,2 de v', cerca(m.elementos[0].v,0.7,1e-3));
m=P.mover(base,tarea,campo,{tipo:'flecha',i:0,extremo:2},4,0);
t('mover un extremo de flecha: solo ese', m.flechas[0].u2>base.flechas[0].u2&&m.flechas[0].u1===base.flechas[0].u1);
m=P.mover(base,tarea,campo,{tipo:'flecha',i:0,extremo:null},4,0);
t('mover la flecha entera: los dos extremos', m.flechas[0].u1>base.flechas[0].u1&&m.flechas[0].u2>base.flechas[0].u2);
t('mover no cambia el original', base.zona.x===10&&base.elementos[0].u===0.5);
// --- qué hay en un punto
const dd=P.anadirFlecha(P.anadirElemento(P.anadirElemento(d0,'cono',0.5,0.5).dibujo,'zona',0.5,0.5).dibujo,'pase',{u:0.1,v:0.9},{u:0.9,v:0.9}).dibujo;
const j0=P.aCampo(dd,tarea,dd.jugadores[0].u,dd.jugadores[0].v);
t('toca un jugador', P.buscarEn(dd,tarea,j0.x,j0.y,1).tipo==='jugador');
const c0=P.aCampo(dd,tarea,0.5,0.5);
t('toca un cono (encima de la zona de color)', (r=>r.tipo==='elemento'&&r.i===0)(P.buscarEn(dd,tarea,c0.x,c0.y,1)));
const zc=P.aCampo(dd,tarea,0.55,0.55);
t('toca la zona de color', (r=>r&&r.tipo==='elemento'&&r.i===1)(P.buscarEn(dd,tarea,zc.x+2,zc.y+1,0.5)));
const fm=P.aCampo(dd,tarea,0.5,0.9);
const rf=P.buscarEn(dd,tarea,fm.x,fm.y,1);
t('toca el cuerpo de una flecha', rf&&rf.tipo==='flecha'&&rf.extremo===null);
const fe=P.aCampo(dd,tarea,0.9,0.9);
t('toca el extremo de una flecha', (r=>r&&r.tipo==='flecha'&&r.extremo===2)(P.buscarEn(dd,tarea,fe.x,fe.y,1)));
t('toca la zona de la tarea', P.buscarEn(d0,tarea,d0.zona.x+1,d0.zona.y+1,0.3)?.tipo==='zona');
t('fuera de todo: nada', P.buscarEn(d0,tarea,0.5,0.5,0.3)===null);
// --- normalizar lo que llega del servidor
t('basura → null', P.normalizarDibujo(null)===null&&P.normalizarDibujo({})===null&&P.normalizarDibujo({zona:{x:'a',y:1}})===null);
const sucio={campo_id:'3',zona:{x:1.23456,y:2},jugadores:[{rol:'ataque',u:0.5,v:0.5},{rol:'dios',u:0,v:0},{rol:'defensa',u:'x',v:0}],
  elementos:[{tipo:'zona',u:0.1,v:0.1,largo:999,ancho:0,color:'#123456',texto:'a'.repeat(80)},{tipo:'bomba',u:0,v:0}],
  flechas:[{tipo:'pase',u1:0,v1:0,u2:9,v2:9},{tipo:'nada',u1:0,v1:0,u2:1,v2:1}]};
const n=P.normalizarDibujo(sucio);
t('normalizar: quita lo inválido', n.jugadores.length===1&&n.elementos.length===1&&n.flechas.length===1);
t('normalizar: limita tamaños, color y texto', n.elementos[0].largo===60&&n.elementos[0].ancho===0.3&&n.elementos[0].color===P.COLOR_ZONA_INICIAL&&n.elementos[0].texto.length===40);
t('normalizar: u,v dentro del rango', n.flechas[0].u2===P.RANGO_UV[1]);
t('normalizar: campo_id no entero → null', n.campo_id===null);
t('normalizar es idempotente', JSON.stringify(P.normalizarDibujo(n))===JSON.stringify(n));
const muchos={zona:{x:0,y:0},jugadores:Array.from({length:200},()=>({rol:'ataque',u:0,v:0})),elementos:Array.from({length:200},()=>({tipo:'cono',u:0,v:0})),flechas:Array.from({length:200},()=>({tipo:'pase',u1:0,v1:0,u2:1,v2:1}))};
const nm=P.normalizarDibujo(muchos);
t('normalizar: respeta los máximos', nm.jugadores.length===64&&nm.elementos.length===60&&nm.flechas.length===40);
t('el nuevo dibujo ya es normal', JSON.stringify(P.normalizarDibujo(d0))===JSON.stringify(d0));
// --- avisos y campos
t('aviso si la zona no cabe', P.avisosDibujo(d0,{...tarea,largo:80,ancho:30},campo).some(x=>x.includes('no cabe')));
t('sin aviso si cabe', P.avisosDibujo(d0,tarea,campo).length===0);
t('campoDe: por id', P.campoDe({campo_id:7},[{id:1,largo:1,ancho:1},campo]).id===7);
t('campoDe: id borrado → primero de la lista', P.campoDe({campo_id:99},[campo]).id===7);
t('campoDe: sin campos → por defecto', P.campoDe(null,[]).id===null);
t('hayDibujo', P.hayDibujo(d0)&&!P.hayDibujo(null)&&!P.hayDibujo({zona:{x:0,y:0},jugadores:[],elementos:[],flechas:[]}));
t('catálogo: todos los elementos pedidos', ['cono','marca','porteria','miniporteria','pica','valla','aro','escalera','zona','texto'].every(k=>P.ELEMENTOS[k]));
// --- balones
{
  const b0 = P.nuevoDibujo({ tarea: { largo: 40, ancho: 30, n_ataque: 4, n_defensa: 4, n_comodines: 1, n_porteros: 2 }, campo: P.CAMPO_POR_DEFECTO });
  let b = P.anadirElemento(b0, 'balon', 0.5, 0.5).dibujo;
  b = P.anadirElemento(b, 'balon', 0.2, 0.7).dibujo;
  b = P.anadirElemento(b, 'balon', 0.8, 0.3).dibujo;
  t('se pueden poner varios balones', b.elementos.filter((e) => e.tipo === 'balon').length === 3);
  t('el balón es un elemento válido tras normalizar', P.normalizarDibujo(b).elementos.filter((e) => e.tipo === 'balon').length === 3);
  t('el balón mide 22 cm', P.medidasElemento(b.elementos[0]).largo === 0.22);
}
console.log(`pizarra: ${ok} ok, ${mal} mal`); process.exit(mal?1:0);

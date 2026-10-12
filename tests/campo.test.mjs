import { posicionesCampo, conteoDibujado, tamanoCampo, svgCampo } from './campo.mjs';
let ok=0,mal=0; const t=(n,c)=>{ if(c)ok++; else {mal++;console.log('FALLA',n)} };
const base={largo:60,ancho:40,referencia:'porterias'};
const c=posicionesCampo({...base,n_ataque:8,n_defensa:8,n_comodines:2,n_porteros:2});
t('cuenta cada rol', JSON.stringify(conteoDibujado(c))===JSON.stringify({ataque:8,defensa:8,comodin:2,portero:2}));
t('todo dentro del campo (0..1)', c.jugadores.every(j=>j.x>=0&&j.x<=1&&j.y>=0&&j.y<=1));
t('sin dimensiones → null', posicionesCampo({n_ataque:3})===null && posicionesCampo({largo:0,ancho:20})===null);
// separación: ningún par de jugadores del mismo equipo en el mismo sitio
const mismoSitio=(a)=>a.some((p,i)=>a.some((q,k)=>k>i&&Math.abs(p.x-q.x)<0.02&&Math.abs(p.y-q.y)<0.02));
t('nadie encima de otro (8v8+2+2)', !mismoSitio(c.jugadores));
const g=posicionesCampo({...base,n_ataque:20,n_defensa:20,n_comodines:20,n_porteros:4});
t('máximos: nadie encima de otro', !mismoSitio(g.jugadores)&&g.jugadores.length===64);
t('máximos: dentro', g.jugadores.every(j=>j.x>=0&&j.x<=1&&j.y>=0&&j.y<=1));
// equipos a cada lado: ataque a la izquierda de la defensa en media
const media=(a,r)=>{const l=a.filter(j=>j.rol===r);return l.reduce((s,j)=>s+j.x,0)/l.length};
t('ataque a la izquierda, defensa a la derecha', media(c.jugadores,'ataque')<media(c.jugadores,'defensa'));
// porteros
const p1=posicionesCampo({...base,n_porteros:1});
t('1 portero en la portería derecha', p1.jugadores.length===1&&p1.jugadores[0].x>0.9&&p1.jugadores[0].y===0.5);
const p2=posicionesCampo({...base,n_porteros:2});
t('2 porteros: uno a cada lado', p2.jugadores.some(j=>j.x<0.1)&&p2.jugadores.some(j=>j.x>0.9));
const p4=posicionesCampo({...base,n_porteros:4});
t('4 porteros: dos por portería y separados', p4.jugadores.filter(j=>j.x>0.9).length===2&&!mismoSitio(p4.jugadores));
const p9=posicionesCampo({...base,n_porteros:9});
t('más de 4 porteros: se dibujan 4', p9.jugadores.length===4);
// referencia
t('porterías de verdad: 7,32 m sobre el ancho', Math.abs(c.porterias.anchoNorm-7.32/40)<1e-9);
t('portería no pasa de la mitad del ancho', posicionesCampo({...base,ancho:10}).porterias.anchoNorm===0.5);
t('miniporterías más pequeñas', posicionesCampo({...base,referencia:'miniporterias'}).porterias.anchoNorm<c.porterias.anchoNorm);
t('sin referencia: sin porterías', posicionesCampo({...base,referencia:'sin_referencia'}).porterias===null);
// comodines en las bandas
const cm=posicionesCampo({...base,n_comodines:3}).jugadores;
t('3 comodines: 2 arriba y 1 abajo, en la banda', cm.filter(j=>j.y===0).length===2&&cm.filter(j=>j.y===1).length===1&&!mismoSitio(cm));
// escala
const tam=tamanoCampo(60,40,300,200);
t('escala: respeta la proporción', Math.abs(tam.ancho/tam.alto-60/40)<0.02);
t('escala: limita por el alto', tamanoCampo(30,60,300,120).alto===120&&tamanoCampo(30,60,300,120).ancho===60);
// svg
const s=svgCampo({...base,n_ataque:3,n_defensa:3,n_comodines:1,n_porteros:2});
t('svg con 9 jugadores', (s.match(/<circle/g)||[]).length===9&&s.startsWith('<svg')&&s.endsWith('</svg>'));
t('svg sin dimensiones → vacío', svgCampo({n_ataque:3})==='');
t('svg sin NaN', !/NaN|undefined/.test(s));
t('formato mínimo 0v0 no rompe', posicionesCampo({largo:20,ancho:20}).jugadores.length===0);
console.log(`campo: ${ok} ok, ${mal} mal`); process.exit(mal?1:0);

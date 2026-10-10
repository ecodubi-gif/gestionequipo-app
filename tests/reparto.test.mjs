import { proponerReparto, resumenReparto, grupoDeTarea, esDelGrupo } from './reparto.mjs';
import { contarRoles } from './tareas.mjs';
let ok=0,mal=0; const t=(n,c)=>{ if(c)ok++; else {mal++;console.log('FALLA',n)} };
const J=(id,pos,dorsal)=>({id,posicion:pos,dorsal:dorsal??id});
const jug=[J(1,'Portero'),J(13,'Portero'),J(3,'Central Izquierdo'),J(4,'Central Derecho'),J(5,'Lateral Derecho'),J(6,'Medio Centro'),J(8,'Medio Organizador'),J(10,'Media Punta'),J(9,'Delantero Centro'),J(11,'Extremo Derecho'),J(21,'Extremo Izquierdo'),J(7,'Interior Derecho')];
const min={3:90,4:90,5:70,6:90,8:20,10:0,9:60,11:15,21:0,7:80};
// grupo de tarea
t('E1 central recuperación', grupoDeTarea({tipo:1,bloque:'parte_central',objetivo:'recuperacion'})==='recuperacion');
t('E1 cierre compensación', grupoDeTarea({tipo:1,bloque:'cierre_tactico',objetivo:'compensacion'})==='compensacion');
t('E2 no tiene grupo', grupoDeTarea({tipo:2,bloque:'parte_central',objetivo:'recuperacion'})===null);
t('E1 activación no tiene grupo', grupoDeTarea({tipo:1,bloque:'activacion',objetivo:'recuperacion'})===null);
t('E1 fuerza no tiene grupo', grupoDeTarea({tipo:1,bloque:'parte_central',objetivo:'fuerza'})===null);
t('60 exactos → recuperación', esDelGrupo({id:9},'recuperacion',min)&&!esDelGrupo({id:9},'compensacion',min));
t('no convocado (sin minutos) → compensación', esDelGrupo({id:99},'compensacion',min));
t('sin partido: entran todos', esDelGrupo({id:3},'compensacion',null));
// modo sin formato: todos por posición
let r=proponerReparto({jugadores:jug,conteo:{}});
let c=contarRoles(r.asignaciones);
t('sin formato: todos asignados', Object.keys(r.asignaciones).length===12);
t('sin formato: 2 porteros', c.portero===2);
// sin formato en grupo: porteros fuera, solo su grupo
r=proponerReparto({jugadores:jug,conteo:{},grupo:'recuperacion',minutosPartido:min});
t('grupo rec: solo 60+', Object.keys(r.asignaciones).map(Number).sort((a,b)=>a-b).join()==='3,4,5,6,7,9');
t('grupo rec: sin porteros', contarRoles(r.asignaciones).portero===0);
r=proponerReparto({jugadores:jug,conteo:{},grupo:'compensacion',minutosPartido:min});
t('grupo comp: <60', Object.keys(r.asignaciones).map(Number).sort((a,b)=>a-b).join()==='8,10,11,21');
t('fuera de grupo contado', r.fueraDeGrupo===6);
// modo con formato 3v3 + 2 porteros, compensación (solo 4 de campo disponibles)
r=proponerReparto({jugadores:jug,conteo:{ataque:3,defensa:3,comodin:0,portero:2},grupo:'compensacion',minutosPartido:min});
c=contarRoles(r.asignaciones);
t('3v3+2P: 2 porteros', c.portero===2);
t('3v3+2P: 4 jugadores de campo', c.ataque+c.defensa===4);
t('faltan 2', Object.values(r.faltan).reduce((a,b)=>a+b,0)===2);
t('resumen avisa de que faltan', resumenReparto(r).some(l=>l.includes('faltan')));
// 8v8 recuperación con pocos
r=proponerReparto({jugadores:jug,conteo:{ataque:2,defensa:2,comodin:0,portero:0},grupo:'recuperacion',minutosPartido:min});
c=contarRoles(r.asignaciones);
t('2v2 rec exacto', c.ataque===2&&c.defensa===2&&c.portero===0);
t('sobran 2 sin sitio', r.sinSitio.length===2&&Object.keys(r.faltan).length===0);
t('defensas son defensas', Object.entries(r.asignaciones).filter(([,v])=>v==='defensa').every(([id])=>[3,4,5].includes(Number(id))));
// riesgo: el jugador con riesgo va a comodín o se queda fuera si hay otros
const riesgo=(id)=>id===9?'riesgo':null;
r=proponerReparto({jugadores:jug,conteo:{ataque:1,defensa:0,comodin:0,portero:0},riesgoDe:riesgo});
t('con riesgo, el delantero 9 no va de ataque habiendo otros', r.asignaciones[9]===undefined);
r=proponerReparto({jugadores:[J(9,'Delantero Centro')],conteo:{ataque:1,defensa:0,comodin:0,portero:0},riesgoDe:riesgo});
t('si no hay nadie más, entra igualmente', r.asignaciones[9]==='ataque');
r=proponerReparto({jugadores:jug,conteo:{ataque:0,defensa:0,comodin:2,portero:0},riesgoDe:riesgo});
t('riesgo + comodines: 2 comodines', contarRoles(r.asignaciones).comodin===2);
// nadie asignado dos veces y nada raro
r=proponerReparto({jugadores:jug,conteo:{ataque:5,defensa:5,comodin:5,portero:2}});
t('nadie repetido', new Set(Object.keys(r.asignaciones)).size===Object.keys(r.asignaciones).length);
t('máximo los disponibles', Object.keys(r.asignaciones).length===12);
t('sin jugadores', Object.keys(proponerReparto({jugadores:[],conteo:{ataque:2}}).asignaciones).length===0);
console.log(`${ok} OK, ${mal} fallos`);

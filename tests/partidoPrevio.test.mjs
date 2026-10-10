import { pesosGrupos, detectarPartidoPrevio, diasEntre } from './partidoPrevio.mjs';
let ok=0,mal=0; const t=(n,c)=>{ if(c)ok++; else {mal++;console.log('FALLA',n)} };
const J=(id,pos='Defensa',estado='disponible')=>({id,posicion:pos,estado});
const jug=[J(1,'Portero'),J(2),J(3),J(4),J(5),J(6),J(7)];
const min={1:90,2:90,3:75,4:60,5:59,6:10,7:0};
const p=pesosGrupos(jug,min);
t('portero no cuenta; 60 o más = recuperación', p.recuperacion===3&&p.compensacion===3);
t('sin minutos → null', pesosGrupos(jug,null)===null);
t('sin jugadores de campo → null', pesosGrupos([J(1,'Portero')],{1:90})===null);
t('el que no figura cuenta como 0 minutos → compensación', pesosGrupos([J(2),J(3)],{2:90}).compensacion===1);
// detección
const ent={id:10,fecha:'2026-10-06'};
const pa={id:1,estado:'finalizado',fecha:'2026-10-04T10:00:00Z'};
t('detecta el partido del domingo', detectarPartidoPrevio(ent,[ent],[pa])?.id===1);
t('partido sin finalizar no cuenta', detectarPartidoPrevio(ent,[ent],[{...pa,estado:'pendiente'}])===null);
t('otro entreno entre medias → null', detectarPartidoPrevio(ent,[ent,{id:9,fecha:'2026-10-05'}],[pa])===null);
t('demasiado lejos → null', detectarPartidoPrevio({id:11,fecha:'2026-10-20'},[],[pa])===null);
t('diasEntre', diasEntre('2026-10-04','2026-10-06')===2);
console.log(`partidoPrevio: ${ok} ok, ${mal} mal`); process.exit(mal?1:0);

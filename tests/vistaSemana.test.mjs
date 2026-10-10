import { diaRespectoPartido, cargaMediaPartido, construirVistaSemana, lecturaSemana } from './vistaSemana.mjs';
let ok=0,mal=0; const t=(n,c)=>{ if(c)ok++; else {mal++;console.log('FALLA',n)} };
const P=['2026-10-04','2026-10-11'];
t('martes = MD+2', diaRespectoPartido('2026-10-06',P)==='MD+2');
t('jueves = MD-3', diaRespectoPartido('2026-10-08',P)==='MD-3');
t('viernes con partido el domingo = MD-2', diaRespectoPartido('2026-10-09',P)==='MD-2');
t('sábado = MD-1', diaRespectoPartido('2026-10-10',P)==='MD-1');
t('día del partido = MD', diaRespectoPartido('2026-10-11',P)==='MD');
t('miércoles: más cerca el anterior (3 vs 4)', diaRespectoPartido('2026-10-07',P)==='MD+3');
t('sin partidos → null', diaRespectoPartido('2026-10-07',[])===null);
t('empate → siguiente', diaRespectoPartido('2026-10-08',['2026-10-04','2026-10-12'])==='MD-4');
t('partido sin RPE → null', cargaMediaPartido({rpe:[]})===null);
const pm=cargaMediaPartido({rpe:[{rpe:6,minutos:90},{rpe:8,minutos:60},{rpe:0,minutos:30}]});
t('media partido ignora RPE 0', pm.jugadores===2&&pm.rpe===7&&pm.minutos===75&&pm.carga===Math.round((540+480)/2));
const prev=(carga,minutos=90)=>({minutos,rpe:Math.round(carga/minutos*10)/10,carga});
const v=construirVistaSemana({
  entrenos:[
    {id:3,fecha:'2026-10-09',hora:'19:00',tipo:3,duracion_minutos:null,rpe_medio:null,previsto:prev(400)},
    {id:1,fecha:'2026-10-06',hora:'19:00',tipo:1,duracion_minutos:90,rpe_medio:6,previsto:prev(540)},
    {id:2,fecha:'2026-10-08',hora:'19:00',tipo:2,duracion_minutos:90,rpe_medio:8,previsto:prev(540)},
  ],
  partidos:[{id:9,fecha:'2026-10-11 12:00:00',estado:'pendiente',equipo_local:'A',equipo_visitante:'B',rpe:[]}],
  fechasPartidos:P,
});
t('ordenadas por fecha', v.filas.map(f=>f.id).join()==='1,2,3');
t('md puesto', v.filas.map(f=>f.md).join()==='MD+2,MD-3,MD-2');
t('estados', v.filas.map(f=>f.estado).join()==='comparada,comparada,sin_real');
t('veredictos', v.filas[0].veredicto==='en_linea'&&v.filas[1].veredicto==='mucho_mas_dura'&&v.filas[2].veredicto==='sin_datos');
t('total comparable solo con sesiones con RPE', v.comparable.sesiones===2&&v.comparable.previsto===1080&&v.comparable.real===540+720);
t('pct total', Math.abs(v.comparable.pct-(1260-1080)/1080)<1e-9);
t('escala = máximo', v.escala===720);
t('carga real de la semana', v.cargaRealSemana===1260);
t('lectura', v.lectura.some(x=>x.startsWith('Entreno 2')&&x.includes('+33 %'))&&v.lectura.some(x=>x.startsWith('Entreno 3')&&x.includes('pendiente')));
t('partido sin media', v.partidos[0].media===null);
const v0=construirVistaSemana({entrenos:[],partidos:[],fechasPartidos:[]});
t('semana vacía no rompe', v0.filas.length===0&&v0.comparable===null&&v0.escala===1&&v0.lectura.length===0);
const v1=construirVistaSemana({entrenos:[{id:1,fecha:'2026-10-06',hora:'19:00',tipo:1,duracion_minutos:80,rpe_medio:5,previsto:null},{id:2,fecha:'2026-10-08',hora:'19:00',tipo:2,duracion_minutos:null,rpe_medio:null,previsto:null}],partidos:[],fechasPartidos:[]});
t('sin tareas con RPE → solo_real', v1.filas[0].estado==='solo_real'&&v1.filas[0].cargaReal===400);
t('sin tareas ni RPE → sin_nada', v1.filas[1].estado==='sin_nada');
t('md null sin partidos', v1.filas[0].md===null);
t('todo en línea', lecturaSemana([{tipo:1,estado:'comparada',veredicto:'en_linea',cmp:{carga:{pct:0.02}}}])[0]==='Todo en línea con lo previsto.');
t('mucho más suave', lecturaSemana([{tipo:1,estado:'comparada',veredicto:'mucho_mas_suave',cmp:{carga:{pct:-0.4}}}])[0].includes('-40 %'));
console.log(`vistaSemana: ${ok} ok, ${mal} mal`); process.exit(mal?1:0);

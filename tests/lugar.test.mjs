import { componerLugar, parsearLugar, aFechaHoraISO } from './lugar.mjs';
let n=0; const t=(c,m)=>{ if(!c){console.log('FALLO',m);process.exitCode=1;} else n++; };
const C='Estadio Juan Benjumea';
for (const s of [{superficie:'césped natural',nombreCampo:'',tipoCampo:'Campo entero'},{superficie:'césped artificial',nombreCampo:'',tipoCampo:'Medio campo'},{superficie:'otro',nombreCampo:'Polideportivo Norte',tipoCampo:'Medio campo'}]) {
  const l=componerLugar(s,C); const p=parsearLugar(l,C);
  t(JSON.stringify(p)===JSON.stringify(s),'ida y vuelta '+l);
}
t(parsearLugar('Estadio Juan Benjumea',C).superficie==='césped natural','sin tipo');
t(parsearLugar('Campo antiguo',C).nombreCampo==='Campo antiguo' && parsearLugar('Campo antiguo',C).tipoCampo==='Campo entero','texto libre');
t(parsearLugar('',C).superficie==='otro','vacío');
const d=new Date(aFechaHoraISO('2026-10-18','11:30:00')); t(d.getFullYear()===2026&&d.getMonth()===9&&d.getDate()===18&&d.getHours()===11&&d.getMinutes()===30,'fecha hora');
console.log(n+' ok');

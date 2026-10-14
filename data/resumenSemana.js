// Resumen de la semana para compartir: asistencia a los entrenos, carga prevista frente a real y el rival
// del próximo partido (goles por tramos, si hay informe). Todo sale de datos que la app ya tiene.
import { formatoPct } from './cargaPlanificada';
import { textoGoles } from './goles';

const norm = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

// asistencias: lista de { estado } de un entreno (la que devuelve la API). Sin filas: null (no se ha pasado lista).
export function resumenAsistencia(asistencias) {
  const filas = asistencias || [];
  if (filas.length === 0) return null;
  const cuenta = (...estados) => filas.filter((a) => estados.includes(a.estado)).length;
  const presentes = cuenta('presente', 'retraso');
  return { total: filas.length, presentes, retrasos: cuenta('retraso'), faltas: cuenta('falta_justificada', 'falta_injustificada'), pct: Math.round((presentes / filas.length) * 100) };
}

// Primer partido por jugar a partir de hoy, con el nombre del rival (el equipo que no es el nuestro).
export function proximoPartido(partidos, hoyISO, nombreClub = 'herrera') {
  const futuros = (partidos || [])
    .filter((p) => p.estado !== 'finalizado' && String(p.fecha).slice(0, 10) >= hoyISO)
    .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
  const p = futuros[0];
  if (!p) return null;
  const nuestro = norm(nombreClub);
  const esNuestro = (n) => norm(n).includes(nuestro);
  const rival = esNuestro(p.equipo_local) ? p.equipo_visitante : esNuestro(p.equipo_visitante) ? p.equipo_local : p.equipo_visitante;
  return { id: p.id, fecha: String(p.fecha).slice(0, 10), rival, local: esNuestro(p.equipo_local) };
}

// Informe del rival (scouting) por nombre, sin tildes ni mayúsculas. Devuelve { equipo, textoGoles } o null.
export function golesDelRival(scouting, rival) {
  const clave = Object.keys(scouting || {}).find((k) => norm(k) === norm(rival));
  if (!clave) return null;
  const texto = textoGoles((scouting[clave] || {}).datos);
  return texto ? { equipo: clave, texto } : { equipo: clave, texto: '' };
}

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const diaCorto = (iso) => { const [a, m, d] = iso.split('-').map(Number); return `${DIAS[new Date(Date.UTC(a, m - 1, d)).getUTCDay()]} ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`; };

/**
 * filas: [{ fecha, tipo, md, previsto|null, real|null, cargaReal|null, cmp|null, asistencia|null }]
 * Devuelve el texto listo para WhatsApp.
 */
export function textoResumenSemana({ lunes, domingo, filas, partidos, cargaRealSemana, comparable, rival }) {
  const l = [];
  l.push(`*Resumen de la semana ${diaCorto(lunes)} – ${diaCorto(domingo)}*`);
  for (const f of filas) {
    let linea = `• Entreno ${f.tipo} (${diaCorto(f.fecha)}${f.md ? ` · ${f.md}` : ''})`;
    const partes = [];
    if (f.asistencia) partes.push(`asistencia ${f.asistencia.presentes}/${f.asistencia.total}${f.asistencia.retrasos ? ` (${f.asistencia.retrasos} con retraso)` : ''}`);
    else partes.push('sin lista de asistencia');
    if (f.previsto && f.cargaReal != null) partes.push(`carga ${f.cargaReal} frente a ${f.previsto.carga} prevista${f.cmp && f.cmp.carga.pct != null ? ` (${formatoPct(f.cmp.carga.pct)})` : ''}`);
    else if (f.cargaReal != null) partes.push(`carga real ${f.cargaReal}`);
    else if (f.previsto) partes.push(`carga prevista ${f.previsto.carga}, sin RPE todavía`);
    linea += `: ${partes.join(' · ')}`;
    l.push(linea);
  }
  if (filas.length === 0) l.push('• No hay entrenos esta semana.');
  const conLista = filas.filter((f) => f.asistencia);
  if (conLista.length) {
    const pres = conLista.reduce((s, f) => s + f.asistencia.presentes, 0);
    const tot = conLista.reduce((s, f) => s + f.asistencia.total, 0);
    l.push(`Asistencia media: ${Math.round((pres / tot) * 100)} %`);
  }
  if (comparable) l.push(`Carga de los entrenos con RPE: real ${comparable.real} frente a ${comparable.previsto} prevista (${formatoPct(comparable.pct) || '—'})`);
  for (const p of partidos || []) {
    l.push(`⚽ ${p.equipo_local} vs ${p.equipo_visitante}${p.media ? ` · carga media por jugador ${p.media.carga}` : ''}`);
  }
  if (cargaRealSemana > 0) l.push(`Suma de cargas reales (entrenos + media del partido): ${cargaRealSemana}`);
  if (rival) {
    l.push(`*Próximo rival: ${rival.nombre}* (${diaCorto(rival.fecha)})`);
    if (rival.goles && rival.goles.texto) l.push(`Goles: ${rival.goles.texto}`);
    else l.push('Sin goles por tramos en su informe todavía.');
  }
  return l.join('\n');
}

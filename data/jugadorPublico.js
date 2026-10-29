import { TARIFAS } from './multas';
// Enlace personal del jugador: confirmar asistencia y bienestar diario.

// El enlace es  https://app.ecodubi.com/?j=CODIGO  (así no hace falta configurar rutas en el servidor web).
export const urlJugador = (origen, token) => `${origen.replace(/\/+$/, '')}/?j=${token}`;

export function tokenDeBusqueda(search) {
  const m = /[?&]j=([A-Za-z0-9]{20,64})(?:&|$)/.exec(search || '');
  return m ? m[1] : null;
}

export const RESPUESTAS = { voy: 'Voy', no_voy: 'No voy', duda: 'Duda' };

// Texto que se manda por WhatsApp a cada jugador.
export const textoEnlace = (nombre, url) =>
  `Hola ${nombre}, este es tu enlace personal del C.D. Herrera. Desde ahí confirmas si vienes a los entrenos y contestas el cuestionario del día (1 minuto). No lo compartas con nadie.\n${url}`;

// Las cuatro preguntas. En todas la escala va de 1 a 5; 'peor' dice qué extremo es el malo.
export const PREGUNTAS_BIENESTAR = [
  { campo: 'sueno', texto: '¿Cómo has dormido?', bajo: 'Fatal', alto: 'Genial', peor: 'bajo' },
  { campo: 'cansancio', texto: '¿Cómo de cansado estás?', bajo: 'Nada', alto: 'Agotado', peor: 'alto' },
  { campo: 'dolor', texto: '¿Dolor o agujetas?', bajo: 'Ninguno', alto: 'Mucho', peor: 'alto' },
  { campo: 'animo', texto: '¿Cómo te encuentras de ánimo?', bajo: 'Mal', alto: 'Genial', peor: 'bajo' },
];

// Motivos por los que mirar a un jugador (orientativo, lo decide el preparador físico).
export function alertasBienestar(b) {
  const r = [];
  if (b.sueno <= 2) r.push('durmió mal');
  if (b.cansancio >= 4) r.push('muy cansado');
  if (b.dolor >= 4) r.push('mucho dolor o agujetas');
  if (b.animo <= 2) r.push('ánimo bajo');
  if (b.molestias && b.molestias.trim()) r.push(`molestias: ${b.molestias.trim()}`);
  return r;
}

// Último registro de cada jugador, con sus alertas, los que tienen alertas primero.
export function resumenBienestar(filas) {
  const ultimo = {};
  for (const f of filas || []) if (!ultimo[f.jugador_id] || f.fecha > ultimo[f.jugador_id].fecha) ultimo[f.jugador_id] = f;
  return Object.values(ultimo)
    .map((f) => ({ ...f, alertas: alertasBienestar(f) }))
    .sort((a, b) => b.alertas.length - a.alertas.length || b.fecha.localeCompare(a.fecha));
}

export const MINUTOS_RETRASO = [15, 30, 45];

// Lo que se rellena de antemano en la lista del delegado. Solo para quien aún no tiene asistencia guardada.
// Un aviso de retraso pesa más que el "voy": llega, pero tarde. La multa la corrige el delegado.
export function previoDeAviso(aviso) {
  if (!aviso) return null;
  if (aviso.retraso_minutos > 0 && aviso.respuesta !== 'no_voy') return { estado: 'retraso', multa: TARIFAS.retraso.importe, motivo: `Avisó: ${aviso.retraso_minutos} min` };
  if (aviso.respuesta === 'no_voy') return { estado: 'falta_justificada', multa: 0, motivo: aviso.motivo || '' };
  if (aviso.respuesta === 'voy') return { estado: 'presente', multa: 0, motivo: '' };
  return null; // duda: se queda como estaba y solo se muestra el aviso
}

// Texto corto de lo que avisó un jugador, para la lista del delegado.
export function textoAviso(aviso) {
  if (!aviso) return '';
  const partes = [];
  if (aviso.respuesta) partes.push(RESPUESTAS[aviso.respuesta] + (aviso.motivo ? ` (${aviso.motivo})` : ''));
  if (aviso.retraso_minutos > 0) partes.push(`llega ${aviso.retraso_minutos} min tarde`);
  return partes.join(' · ');
}

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
export const nombreDiaISO = (f) => DIAS[new Date(`${f}T00:00:00Z`).getUTCDay()];
const ddmm = (f) => f.slice(8, 10) + '/' + f.slice(5, 7);

// Mensaje para el GRUPO de WhatsApp. No lleva enlace (los enlaces son personales) ni nombres.
export function textoGrupoConvocatoria(partido) {
  const rival = partido.es_local ? partido.equipo_visitante : partido.equipo_local;
  const fecha = String(partido.fecha || '').slice(0, 10);
  const cita = [partido.hora_citacion ? String(partido.hora_citacion).slice(0, 5) : null, partido.lugar_citacion].filter(Boolean).join(' en ');
  return `📣 Convocatoria del ${nombreDiaISO(fecha)} ${ddmm(fecha)} vs ${rival} publicada.${cita ? `\nConcentración: ${cita}.` : ''}\nEntrad en vuestro enlace personal para ver si estáis convocados y marcar "Visto". Quien no tenga el enlace, que se lo pida al delegado.`;
}

export function contarAvisos(avisos, jugadoresIds) {
  const c = { voy: 0, no_voy: 0, duda: 0, sin: 0 };
  for (const id of jugadoresIds) {
    const a = avisos[id];
    if (a && a.respuesta && c[a.respuesta] !== undefined) c[a.respuesta]++;
    else c.sin++;
  }
  return c;
}

// Recordatorio para el GRUPO de WhatsApp: quién falta por confirmar el entreno (nombres de pila/apodos, sin enlaces).
export function textoRecordatorioEntreno(entrenamiento, jugadores, avisos) {
  const nombre = (j) => j.apodo || j.nombre;
  const sin = jugadores.filter((j) => !(avisos[j.id] && avisos[j.id].respuesta)).map(nombre);
  const dudas = jugadores.filter((j) => avisos[j.id] && avisos[j.id].respuesta === 'duda').map(nombre);
  if (!sin.length && !dudas.length) return '';
  const fecha = String(entrenamiento.fecha || '').slice(0, 10);
  const cita = [entrenamiento.hora ? String(entrenamiento.hora).slice(0, 5) : null, entrenamiento.lugar].filter(Boolean).join(' en ');
  return [
    `⏰ Entreno del ${nombreDiaISO(fecha)} ${ddmm(fecha)}${cita ? ` (${cita})` : ''}.`,
    sin.length ? `Faltan por confirmar: ${sin.join(', ')}.` : null,
    dudas.length ? `Con dudas: ${dudas.join(', ')}.` : null,
    'Entrad en vuestro enlace personal y marcad Voy / No voy. Quien no tenga el enlace, que se lo pida al delegado.',
  ].filter(Boolean).join('\n');
}

// Lo que ve el jugador de su último partido (ya jugado): resultado y lo suyo.
export function resumenUltimoPartido(u) {
  if (!u) return null;
  const n = Number(u.goles_nuestros); const r = Number(u.goles_rival);
  const hay = u.goles_nuestros != null && u.goles_rival != null && Number.isFinite(n) && Number.isFinite(r);
  const resultado = !hay ? '' : n > r ? `Ganamos ${n}-${r}` : n < r ? `Perdimos ${n}-${r}` : `Empatamos ${n}-${r}`;
  const lineas = [];
  if (!u.convocado) return { rival: u.rival, resultado, lineas: [] };
  lineas.push(u.jugo ? `⏱ Jugaste ${u.minutos} minuto${u.minutos === 1 ? '' : 's'}` : 'No llegaste a jugar esta vez');
  if (u.goles > 0) lineas.push(`⚽ ${u.goles} gol${u.goles === 1 ? '' : 'es'}`);
  if (u.amarillas > 0) lineas.push(`🟨 ${u.amarillas} amarilla${u.amarillas === 1 ? '' : 's'}`);
  if (u.rojas > 0) lineas.push(`🟥 ${u.rojas} roja${u.rojas === 1 ? '' : 's'}`);
  return { rival: u.rival, resultado, lineas };
}

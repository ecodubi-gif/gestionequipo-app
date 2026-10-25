// La sesión completa: el orden de los bloques, cuánto dura cada cosa, a qué hora empieza,
// y la hoja imprimible.
import { materialDeItems, textoMaterial } from './material';
import { programaDe, tiemposRueda, minutosRueda } from './programaSesion';
import { BLOQUES_ENTRENADOR, BLOQUE_FINAL, bloqueDeTarea, posturasEstiramiento, GRUPOS_PRIMER_ENTRENO, bloqueConGrupos, repartirTareasPorGrupo, textoSeries } from './planSesion';
import { OBJETIVOS, REFERENCIAS, ROLES, formatoTarea, textoDimensiones, segundosDe, formatoDuracion } from './tareas';
import { formatearFechaCorta } from './fecha';
import { dibujoDeTarea } from './pizarra';
import { formasTarea, svgDeFormas, leyendaFlechas } from './formas';

export const MIN_PREVENTIVO = 15;
export const MIN_MOVILIDAD = 5;
export const MIN_ESTIRAMIENTOS = BLOQUE_FINAL.duracion;

const pad = (n) => String(n).padStart(2, '0');

// Minutos que dura una tarea: series de trabajo + las pausas entre series (no hay pausa tras la última).
export function minutosTarea(t) {
  const series = Math.max(1, t.series || 1);
  const segundos = series * segundosDe(t) + (series - 1) * (t.pausa_seg || 0);
  return Math.round(segundos / 60);
}

// '19:00' + 95 min = '20:35' (pasa de hora y de medianoche sin romperse)
export function sumarHora(horaHHMM, minutos) {
  const [h, m] = String(horaHHMM || '00:00').slice(0, 5).split(':').map(Number);
  const total = (h || 0) * 60 + (m || 0) + Math.round(minutos);
  const dentroDelDia = ((total % 1440) + 1440) % 1440;
  return `${pad(Math.floor(dentroDelDia / 60))}:${pad(dentroDelDia % 60)}`;
}

// Devuelve los bloques en orden con su duración y su inicio (en minutos desde que empieza la sesión).
export function construirSesion({ entrenamiento, plantilla, tareas, tipo }) {
  const textos = entrenamiento.bloques || {};
  const programa = programaDe(entrenamiento, plantilla);
  const items = [];
  let reloj = 0;
  const anadir = (item) => {
    items.push({ ...item, inicio: reloj });
    reloj += item.minutos;
  };

  // El preventivo y la movilidad se pueden apagar en una sesión concreta (preventivo_activa / movilidad_activa = false).
  if (textos.preventivo_activa !== false) anadir({
    clave: 'preventivo', titulo: 'Trabajo preventivo neuromuscular', responsable: 'Preparador físico', minutos: MIN_PREVENTIVO,
    estaciones: plantilla || programa.propioPrev ? programa.preventivo : null, sinPrograma: !plantilla && !programa.propioPrev, propio: programa.propioPrev,
  });
  if (textos.movilidad_activa !== false) anadir({
    clave: 'movilidad', titulo: 'Movilidad dinámica integrada', responsable: 'Preparador físico', minutos: MIN_MOVILIDAD,
    tramos: plantilla || programa.propioMov ? programa.movilidad : null, sinPrograma: !plantilla && !programa.propioMov, propio: programa.propioMov,
  });

  for (const b of BLOQUES_ENTRENADOR) {
    if (b.conInterruptor && textos[`${b.clave}_activa`] === false) continue; // desactivado en esta sesión (rueda físico-técnica)
    const deEsteBloque = (tareas || []).filter((t) => bloqueDeTarea(t) === b.clave).map((t) => ({ ...t, minutos: minutosTarea(t) }));
    const suma = (lista) => lista.reduce((s, t) => s + t.minutos, 0);
    // Entreno 1: los dos grupos trabajan a la vez, así que el bloque dura lo que el más largo,
    // más las tareas que no son de ningún grupo (esas se hacen seguidas).
    let grupos = null;
    let sumaTareas = suma(deEsteBloque);
    if (bloqueConGrupos(tipo, b.clave)) {
      const rep = repartirTareasPorGrupo(deEsteBloque);
      grupos = GRUPOS_PRIMER_ENTRENO.map((g) => ({ ...g, tareas: rep[g.clave], minutos: suma(rep[g.clave]) }));
      sumaTareas = Math.max(...grupos.map((g) => g.minutos)) + suma(rep.otras);
      deEsteBloque.splice(0, deEsteBloque.length, ...rep.otras);
    }
    // La rueda físico-técnica dura lo que den sus postas (n × tiempo de posta + rotaciones entre ellas); parte central y cierre, lo que sumen sus tareas.
    const esRueda = b.clave === 'rueda_perfiles';
    const tiempos = esRueda ? tiemposRueda(entrenamiento) : null;
    const duracion = esRueda ? minutosRueda(programa.rueda.length, tiempos.posta, tiempos.rotacion) : b.duracion;
    const minutos = duracion ? duracion : sumaTareas;
    anadir({
      clave: b.clave, titulo: b.titulo, responsable: 'Entrenador / segundo', minutos,
      texto: textos[b.clave] || null, tareas: deEsteBloque, grupos,
      postas: esRueda ? programa.rueda : null, postaMin: esRueda ? tiempos.posta : null, rotacionMin: esRueda ? tiempos.rotacion : null, propio: esRueda ? programa.propioRueda : undefined,
      aviso: duracion && sumaTareas > duracion ? `Las tareas suman ${sumaTareas}' y este bloque dura ${duracion}'.` : null,
    });
  }
  // Todos los entrenos acaban con estiramientos (5 minutos), también los ya creados.
  anadir({ clave: BLOQUE_FINAL.clave, titulo: BLOQUE_FINAL.titulo, responsable: 'Entrenador / segundo', minutos: MIN_ESTIRAMIENTOS, texto: textos.estiramientos || (plantilla && plantilla.semana && plantilla.semana.estiramientos) || null });
  return { items, total: reloj, material: materialDeItems(items) };
}

// ---------- Hoja imprimible ----------
const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const saltos = (v) => esc(v).replace(/\n/g, '<br/>');

const nombreJugador = (j) => (j ? `${j.dorsal ? `#${j.dorsal} ` : ''}${j.nombre} ${j.apellidos || ''}`.trim() : 'Jugador no encontrado');

// Dibujo de la tarea para la hoja imprimible: el campo con la zona, los jugadores, el material y las flechas, con su leyenda.
function dibujoHtml(t, campos) {
  const d = dibujoDeTarea(t, campos);
  if (!d) return '';
  const res = formasTarea({ tarea: t, dibujo: d.dibujo, campo: d.campo, modo: 'vista', anchoMax: 300, altoMax: 190 });
  const roles = ['ataque', 'defensa', 'comodin', 'portero'].filter((r) => d.dibujo.jugadores.some((j) => j.rol === r));
  const col = { ataque: '#dc2626', defensa: '#2563eb', comodin: '#eab308', portero: '#111827' };
  const nom = { ataque: 'Ataque', defensa: 'Defensa', comodin: 'Comodín', portero: 'Portero' };
  const ley = roles.map((r) => `<span style="display:inline-block;width:9px;height:9px;border-radius:5px;background:${col[r]};margin-right:3px"></span>${nom[r]}`)
    .concat(leyendaFlechas(d.dibujo).map((f) => `<span style="display:inline-block;width:18px;border-top:2px ${f.discontinua ? 'dashed' : 'solid'} ${f.color};margin-right:3px;vertical-align:middle"></span>${esc(f.etiqueta)}`));
  return `${svgDeFormas(res)}<div class="leyenda" style="font-size:10px;color:#4b5563">${ley.join(' &nbsp; ')}</div>`;
}

export function htmlSesion({ entrenamiento, tipo, sesion, jugadoresPorId, trabajoAparte, asistentes, lugar, campos = [] }) {
  const hora = (entrenamiento.hora || '').slice(0, 5);
  const fin = hora ? sumarHora(hora, sesion.total) : null;

  const htmlTareas = (lista) => lista.map((t) => {
        const porRol = ['ataque', 'defensa', 'comodin', 'portero']
          .map((r) => {
            const nombres = (t.jugadores || []).filter((a) => a.rol === r).map((a) => nombreJugador(jugadoresPorId[a.jugador_id]));
            return nombres.length ? `<div><b>${esc(ROLES[r].etiqueta)} (${nombres.length}):</b> ${esc(nombres.join(', '))}</div>` : '';
          }).join('');
        return `<div class="tarea">
          <div class="tarea-cab"><b>${esc(t.nombre)}</b><span>${esc(t.series)} × ${esc(formatoDuracion(segundosDe(t)))}${t.pausa_seg ? ` · pausa ${esc(t.pausa_seg)} s` : ''} = ${esc(t.minutos)}'</span></div>
          <div class="tarea-datos">${esc(formatoTarea(t))} · ${esc(textoDimensiones(t))}${t.objetivo && OBJETIVOS[t.objetivo] ? ` · ${esc(OBJETIVOS[t.objetivo].corto)}` : ''}${REFERENCIAS[t.referencia] ? ` · ${esc(REFERENCIAS[t.referencia].etiqueta)}` : ''}</div>
          ${dibujoHtml(t, campos)}
          ${t.descripcion ? `<p>${saltos(t.descripcion)}</p>` : ''}
          ${porRol ? `<div class="roles">${porRol}</div>` : ''}
        </div>`;
      }).join('');

  const bloques = sesion.items.map((it) => {
    const desde = hora ? sumarHora(hora, it.inicio) : '';
    let cuerpo = '';
    if (it.estaciones) {
      cuerpo += '<ol class="lista">' + it.estaciones.map((e) =>
        `<li><b>${esc(e.zona)}.</b> ${esc(e.ejercicio)}${textoSeries(e) ? ` <i>(${esc(textoSeries(e))})</i>` : ''}</li>`).join('') + '</ol>';
    }
    if (it.tramos) {
      cuerpo += '<ul class="lista">' + it.tramos.map((m) =>
        `<li><b>${esc(m.tiempo)} ${esc(m.zona)}.</b> ${esc(m.descripcion)}</li>`).join('') + '</ul>';
    }
    if (it.postas && it.postas.length) {
      cuerpo += `<p class="tenue">${esc(it.postas.length)} postas de ${esc(it.postaMin)}' con rotación de ${esc(it.rotacionMin)}'.</p><ol class="lista">` + it.postas.map((x) =>
        `<li><b>${esc(x.titulo)}.</b> <u>Físico:</u> ${esc(x.fisico)} <u>Técnico:</u> ${esc(x.tecnico)}</li>`).join('') + '</ol>';
    }
    if (it.sinPrograma) cuerpo += '<p class="tenue">Sin programa de preparación física para este tipo de entreno.</p>';
    if (it.texto) {
      const est = it.clave === 'estiramientos' ? posturasEstiramiento(it.texto) : null;
      cuerpo += est
        ? `<ol class="lista">${est.posturas.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>${est.nota ? `<p class="tenue">${esc(est.nota)}</p>` : ''}`
        : `<p>${saltos(it.texto)}</p>`;
    }
    if (it.aviso) cuerpo += `<p class="aviso">${esc(it.aviso)}</p>`;
    if (it.tareas) {
      cuerpo += htmlTareas(it.tareas);
    }
    if (it.grupos) {
      cuerpo += it.grupos.map((g) => `<div class="grupo"><div class="grupo-cab"><b>${esc(g.titulo)}</b> <span>${esc(g.criterio)} · ${esc(g.minutos)}'</span></div>${g.tareas.length ? htmlTareas(g.tareas) : '<p class="tenue">Sin tareas todavía.</p>'}</div>`).join('');
    }
    if (it.tareas) {
      if (it.tareas.length === 0 && !it.grupos && ['parte_central', 'cierre_tactico'].includes(it.clave) && !it.texto) cuerpo += '<p class="tenue">Sin tareas todavía.</p>';
    }
    return `<section class="bloque">
      <div class="bloque-cab"><span class="hora">${esc(desde)}</span><h3>${esc(it.titulo)}</h3><span class="min">${esc(it.minutos)}'</span></div>
      <div class="resp">${esc(it.responsable)}</div>${cuerpo}
    </section>`;
  }).join('');

  const aparte = trabajoAparte.length
    ? `<section class="bloque"><div class="bloque-cab"><h3>Trabajo aparte (readaptación)</h3></div>
        <ul class="lista">${trabajoAparte.map((j) => `<li><b>${esc(nombreJugador(j))}:</b> ${esc(j.readaptacion)}</li>`).join('')}</ul></section>`
    : '';

  const material = (sesion.material || []).length
    ? `<section class="bloque"><div class="bloque-cab"><h3>Material para sacar al campo</h3></div>
        <ul class="lista">${sesion.material.map((m) => `<li><b>${esc(textoMaterial(m))}</b> <span class="tenue">(${esc(m.en.join(', '))})</span></li>`).join('')}</ul>
        <p class="tenue">Cantidades según lo que dicen los textos de las estaciones y postas; si no dice número, se anota el material sin cantidad.</p></section>`
    : '';

  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/><title>Sesión de entrenamiento</title>
<style>
  @page { size: A4; margin: 14mm; }
  body { font-family: -apple-system, 'Segoe UI', Arial, sans-serif; color: #111827; font-size: 11.5px; line-height: 1.4; }
  h1 { font-size: 20px; margin: 0 0 2px; } h3 { font-size: 13px; margin: 0; flex: 1; }
  .sub { color: #4b5563; margin-bottom: 10px; }
  .resumen { display: flex; gap: 18px; background: #f3f4f6; border-radius: 6px; padding: 8px 12px; margin-bottom: 12px; }
  .resumen b { font-size: 14px; }
  .bloque { border: 1px solid #d1d5db; border-radius: 6px; padding: 8px 10px; margin-bottom: 8px; page-break-inside: avoid; }
  .bloque-cab { display: flex; align-items: center; gap: 8px; }
  .hora { background: #7c3aed; color: #fff; font-weight: 700; border-radius: 4px; padding: 1px 6px; }
  .min { color: #6b7280; font-weight: 700; }
  .resp { color: #6b7280; font-size: 10px; margin: 1px 0 4px; }
  .lista { margin: 4px 0 4px 16px; padding: 0; }
  .tarea { border-left: 3px solid #7c3aed; background: #faf5ff; padding: 6px 8px; margin: 6px 0; page-break-inside: avoid; }
  .tarea-cab { display: flex; justify-content: space-between; gap: 8px; }
  .tarea-datos { color: #6d28d9; font-weight: 600; margin: 2px 0; }
  .roles div { margin-top: 2px; }
  .grupo { border: 1px dashed #a78bfa; border-radius: 6px; padding: 4px 8px; margin: 6px 0; }
  .grupo-cab span { color: #6b7280; font-size: 10px; }
  .aviso { color: #92400e; background: #fef3c7; padding: 3px 6px; border-radius: 4px; }
  .tenue { color: #9ca3af; font-style: italic; }
  p { margin: 4px 0; }
</style></head><body>
  <h1>Sesión de entrenamiento</h1>
  <div class="sub">${esc(formatearFechaCorta(entrenamiento.fecha))}${hora ? ` · ${esc(hora)}` : ''}${lugar ? ` · ${esc(lugar)}` : ''} · Entreno ${esc(tipo)}</div>
  <div class="resumen">
    <div>Inicio<br/><b>${esc(hora || '—')}</b></div>
    <div>Fin previsto<br/><b>${esc(fin || '—')}</b></div>
    <div>Duración<br/><b>${esc(sesion.total)} min</b></div>
    <div>Asistentes<br/><b>${asistentes === null ? '—' : esc(asistentes)}</b></div>
  </div>
  ${material}${bloques}${aparte}
</body></html>`;
}

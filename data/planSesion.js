// Lógica del plan de sesión: qué tipo de entreno (1, 2 o 3) es cada sesión de
// la semana, y los bloques que pone el entrenador.

// Bloques que rellena el entrenador/segundo en cada sesión. El preventivo y la
// movilidad no están aquí: son del preparador físico y viven en las plantillas.
export const BLOQUES_ENTRENADOR = [
  { clave: 'rueda_perfiles', titulo: 'Rueda físico-técnica', duracion: 15, conInterruptor: true },
  { clave: 'parte_central', titulo: 'Parte central específica', duracion: null },
  { clave: 'cierre_tactico', titulo: 'Cierre táctico', duracion: null },
];

// La rueda de perfiles y la activación son ahora un solo bloque (la rueda físico-técnica, 15').
// Las tareas que se hicieron con el bloque 'activacion' se muestran dentro de la rueda: no se pierde ninguna.
export const bloqueDeTarea = (t) => (t && t.bloque === 'activacion' ? 'rueda_perfiles' : t && t.bloque);

// La rueda: hasta 4 postas de 3' con 1' de rotación (4 × 3' + 3 × 1' = 15').
export const MAX_POSTAS = 6;
export const postasDe = (plantilla) => {
  const v = plantilla && plantilla.semana && plantilla.semana.postas;
  return Array.isArray(v) ? v : [];
};

// El texto de los estiramientos ("Isquios con correa · cuádriceps · … · glúteo en figura 4. 25'' por postura y por lado.")
// se enseña como lista de posturas. Si no tiene esa forma, se enseña tal cual (devuelve null).
export function posturasEstiramiento(texto) {
  const partes = String(texto || '').trim().split(/\s*·\s*/).filter(Boolean);
  if (partes.length < 3) return null;
  const ultimo = partes[partes.length - 1];
  const m = ultimo.match(/^(.*?)\.\s+(.*)$/);
  partes[partes.length - 1] = m ? m[1] : ultimo.replace(/\.$/, '');
  const mayus = (x) => x.charAt(0).toUpperCase() + x.slice(1);
  return { posturas: partes.map((x) => mayus(x.trim())), nota: m ? m[2] : '' };
}

// Último bloque de todos los entrenos: fijo, no se rellena ni se puede quitar.
export const BLOQUE_FINAL = { clave: 'estiramientos', titulo: 'Estiramientos', duracion: 5 };

export const TIPOS_SESION = [1, 2, 3];

// Lunes de la semana (de lunes a domingo) de una fecha 'AAAA-MM-DD'.
export function lunesDeLaSemana(fechaISO) {
  const [a, m, d] = fechaISO.split('-').map(Number);
  const f = new Date(Date.UTC(a, m - 1, d));
  const diasDesdeLunes = (f.getUTCDay() + 6) % 7; // domingo = 6
  f.setUTCDate(f.getUTCDate() - diasDesdeLunes);
  return f.toISOString().slice(0, 10);
}

// Posición del entreno dentro de su semana, por fecha y hora (1.º, 2.º, 3.º).
// Si hubiera más de tres, los demás cuentan como el 3.º.
export function tipoPorOrden(entrenamiento, todos) {
  const semana = lunesDeLaSemana(entrenamiento.fecha);
  const clave = (e) => `${e.fecha} ${(e.hora || '').slice(0, 5)}`;
  const deLaSemana = todos
    .filter((e) => lunesDeLaSemana(e.fecha) === semana)
    .sort((a, b) => clave(a).localeCompare(clave(b)) || a.id - b.id);
  const posicion = deLaSemana.findIndex((e) => e.id === entrenamiento.id);
  return Math.min(Math.max(posicion, 0) + 1, 3);
}

// Tipo que se aplica: el elegido a mano si lo hay; si no, el detectado por orden.
export function tipoDeSesion(entrenamiento, todos) {
  const detectado = tipoPorOrden(entrenamiento, todos);
  const manual = entrenamiento.tipo_sesion != null;
  return { tipo: manual ? entrenamiento.tipo_sesion : detectado, detectado, manual };
}

// "3 × 15'' por lado", o lo que haya si falta alguna de las dos partes.
export function textoSeries(estacion) {
  const series = (estacion.series || '').trim();
  const detalle = (estacion.detalle || '').trim();
  if (series && detalle) return `${series} × ${detalle}`;
  return detalle || (series ? `${series} series` : '');
}

// ---------- Primer entreno de la semana: dos grupos según los minutos del partido ----------
// En el Entreno 1, la parte central y el cierre táctico se dividen en dos bloques que
// trabajan a la vez: Recuperación (60' o más en el partido anterior) y Compensación
// (menos de 60'). El grupo de una tarea es su objetivo físico: así no hace falta
// ningún dato nuevo en el servidor.
export const MINUTOS_CORTE = 60;
export const BLOQUES_CON_GRUPOS = ['parte_central', 'cierre_tactico'];
export const GRUPOS_PRIMER_ENTRENO = [
  { clave: 'recuperacion', titulo: 'Recuperación', criterio: `${MINUTOS_CORTE}' o más en el partido anterior` },
  { clave: 'compensacion', titulo: 'Compensación', criterio: `menos de ${MINUTOS_CORTE}' en el partido anterior` },
];

export function bloqueConGrupos(tipo, claveBloque) {
  return tipo === 1 && BLOQUES_CON_GRUPOS.includes(claveBloque);
}

// Reparte las tareas de un bloque: las de cada grupo y las que no son de ninguno
// (sin objetivo o con otro, p. ej. hechas antes de dividir el bloque).
export function repartirTareasPorGrupo(tareas) {
  const r = { recuperacion: [], compensacion: [], otras: [] };
  for (const t of tareas || []) (r[t.objetivo] || r.otras).push(t);
  if (!Array.isArray(r.recuperacion)) r.recuperacion = [];
  return r;
}

// Quién va a cada grupo según los minutos del partido anterior. Los porteros no entran
// (trabajan aparte, como en el resto de la app). Sin partido anterior: null.
// Los no convocados no jugaron: van a Compensación (0') pero se cuentan aparte para poder avisar.
export function jugadoresPorGrupo(jugadores, minutosPartido, convocados) {
  if (!minutosPartido) return null;
  const idsConv = new Set(convocados || []);
  const r = { recuperacion: [], compensacion: [], noConvocados: [] };
  for (const j of jugadores || []) {
    if ((j.posicion || '').toLowerCase().startsWith('port')) continue;
    const min = minutosPartido[j.id] || 0;
    if (min >= MINUTOS_CORTE) r.recuperacion.push(j);
    else {
      r.compensacion.push(j);
      if (!idsConv.has(j.id)) r.noConvocados.push(j);
    }
  }
  return r;
}

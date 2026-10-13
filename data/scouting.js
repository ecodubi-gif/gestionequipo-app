import { textoGoles } from './goles';
// Informe de scouting de un rival. La estructura del informe está aquí (secciones y campos), así la pantalla de
// edición y la ficha del próximo rival salen de lo mismo. Funciones puras, para poder probarlas.
// tipo 'texto' = respuesta corta, 'largo' = varias líneas, 'opciones' = una de varias (se puede dejar sin marcar).

export const SECCIONES = [
  {
    id: 'sistema', icono: '♟️', titulo: 'Sistema de juego y estructura',
    campos: [
      { id: 'dibujo', grupo: 'Esquema de inicio', etiqueta: 'Dibujo base', tipo: 'texto', formacion: true, ayuda: 'Ej: 1-4-4-2, 1-4-3-3' },
      { id: 'dibujo_ataque', etiqueta: 'Cómo cambia con balón', tipo: 'texto', formacion: true, ayuda: 'Ej: 1-2-3-5 si los laterales suben' },
      { id: 'dibujo_defensa', etiqueta: 'Cómo cambia sin balón', tipo: 'texto', formacion: true, ayuda: 'Ej: 1-4-5-1 con los extremos replegados' },
      { id: 'dibujo_cambios', etiqueta: 'Otros cambios según la fase o el marcador', tipo: 'largo', ayuda: 'Cambios de sistema cuando ganan, pierden o juegan con uno menos' },
      { id: 'of_inicio', grupo: 'Fase ofensiva', etiqueta: 'Cómo inician el juego', tipo: 'opciones', opciones: ['Salida combinativa', 'Juego directo', 'Mixto'] },
      { id: 'of_combinativa', etiqueta: 'Salida combinativa: cómo la hacen', tipo: 'largo', ayuda: 'Quién inicia, apoyos del portero, pivote que baja, laterales altos…' },
      { id: 'of_directo', etiqueta: 'Juego directo: cómo lo hacen', tipo: 'largo', ayuda: 'Referente arriba, saque largo del portero, segundas jugadas…' },
      { id: 'of_zonas', etiqueta: 'Zonas de progresión', tipo: 'opciones', opciones: ['Por dentro', 'Por bandas', 'Mixto'] },
      { id: 'of_zonas_texto', etiqueta: 'Zonas de progresión: detalle', tipo: 'largo', ayuda: 'Por qué carril llegan, si centran o buscan dentro, qué banda prefieren…' },
      { id: 'of_remate', etiqueta: 'Ocupación del área y llegada de segunda línea', tipo: 'largo' },
      { id: 'def_altura', grupo: 'Fase defensiva', etiqueta: 'Altura del bloque defensivo', tipo: 'opciones', opciones: ['Presión alta', 'Bloque medio', 'Bloque bajo'] },
      { id: 'def_tipo', etiqueta: 'Tipo de defensa', tipo: 'opciones', opciones: ['Zona', 'Individual', 'Mixta'] },
      { id: 'def_banda', etiqueta: 'Intensidad en las disputas y comportamiento en banda', tipo: 'largo', ayuda: '¿Saltan con el lateral o se repliegan con los extremos?' },
    ],
  },
  {
    id: 'transiciones', icono: '🔄', titulo: 'Transiciones',
    campos: [
      { id: 'tr_perdida', etiqueta: 'Tras pérdida', tipo: 'opciones', opciones: ['Presionan al instante', 'Repliegan a su campo'] },
      { id: 'tr_vulnerable', etiqueta: 'Vulnerabilidad tras pérdida', tipo: 'largo', ayuda: 'Espalda de los laterales o de los pivotes' },
      { id: 'tr_recup', etiqueta: 'Tras recuperación', tipo: 'opciones', opciones: ['Contra vertical y rápido', 'Aseguran el primer pase'] },
      { id: 'tr_ref', etiqueta: 'Quién inicia la contra', tipo: 'texto', ayuda: 'Velocidad en bandas o bote del punta' },
    ],
  },
  {
    id: 'abp', icono: '🚩', titulo: 'Acciones a balón parado',
    campos: [
      { id: 'abp_jugadas', etiqueta: 'A favor: córners y faltas laterales', tipo: 'largo', ayuda: 'Bloqueos, primer palo, envíos pasados, jugadas ensayadas' },
      { id: 'abp_lanzadores', etiqueta: 'Lanzadores', tipo: 'texto', ayuda: 'Pie y tipo de golpeo (rosca hacia dentro o fuera)' },
      { id: 'abp_rematadores', etiqueta: 'Rematadores', tipo: 'texto', ayuda: 'Mejor juego aéreo y quién va al rechace' },
      { id: 'abp_marcaje', etiqueta: 'En contra: tipo de marcaje', tipo: 'opciones', opciones: ['Zonal', 'Al hombre', 'Mixto'] },
      { id: 'abp_debiles', etiqueta: 'Puntos débiles', tipo: 'largo', ayuda: 'Zona de rechace o primer palo' },
    ],
  },
  {
    id: 'fisico', icono: '🩺', titulo: 'Estado físico y disciplinario',
    campos: [
      { id: 'fis_notas', etiqueta: 'Rotaciones, bajones físicos (min 70-90), lesionados', tipo: 'largo' },
    ],
  },
  {
    id: 'contexto', icono: '🏟️', titulo: 'Contexto del partido',
    campos: [
      { id: 'ctx_dim', etiqueta: 'Dimensiones del campo', tipo: 'texto', ayuda: 'Ej: 100 × 62 m' },
      { id: 'ctx_cesped', etiqueta: 'Césped', tipo: 'opciones', opciones: ['Natural', 'Artificial', 'Tierra'] },
      { id: 'ctx_estado', etiqueta: 'Estado del terreno', tipo: 'texto' },
      { id: 'ctx_necesidad', etiqueta: 'Necesidad de puntos y racha', tipo: 'largo', ayuda: 'La clasificación y los últimos 5 ya salen en la ficha' },
    ],
  },
  {
    id: 'tendencias', icono: '📈', titulo: 'Métricas y tendencias',
    campos: [
      { id: 'met_tramos', etiqueta: 'Goles por tramos del partido', tipo: 'goles', ayuda: 'Cuándo son más peligrosos o más vulnerables. Pon los goles de cada tramo o pega las fichas.' },
      { id: 'met_abp', etiqueta: 'Goles a balón parado frente a jugada elaborada', tipo: 'texto', ayuda: 'Ej: 3 de 11 a balón parado' },
    ],
  },
];

export const TIPOS_JUGADOR = [
  { id: 'clave', etiqueta: 'Clave', color: '#15803d', fondo: '#dcfce7' },
  { id: 'debil', etiqueta: 'Punto débil', color: '#b45309', fondo: '#fef3c7' },
  { id: 'apercibido', etiqueta: 'Apercibido', color: '#b91c1c', fondo: '#fee2e2' },
];

export const MAX_JUGADORES = 20;

export const informeVacio = () => ({ datos: {}, jugadores: [] });

// Deja el informe listo para guardar: sin respuestas vacías, sin jugadores sin nombre.
export function limpiarInforme(informe) {
  const validos = new Set(SECCIONES.flatMap((s) => s.campos.map((c) => c.id)));
  const datos = {};
  for (const [k, v] of Object.entries((informe && informe.datos) || {})) {
    const t = String(v == null ? '' : v).trim();
    if ((validos.has(k) || /^goles_(\d{2}|tramos)$/.test(k)) && t) datos[k] = t.slice(0, 600);
  }
  const jugadores = ((informe && informe.jugadores) || [])
    .filter((j) => j && String(j.nombre || '').trim())
    .slice(0, MAX_JUGADORES)
    .map((j) => ({
      nombre: String(j.nombre).trim().slice(0, 60),
      dorsal: String(j.dorsal || '').replace(/\D/g, '').slice(0, 3),
      tipo: TIPOS_JUGADOR.some((t) => t.id === j.tipo) ? j.tipo : 'clave',
      nota: String(j.nota || '').trim().slice(0, 300),
    }));
  return { datos, jugadores };
}

export const estaVacio = (informe) => {
  const l = limpiarInforme(informe);
  return Object.keys(l.datos).length === 0 && l.jugadores.length === 0;
};

// Lo que se enseña en la ficha del rival: por sección, solo los campos que tienen respuesta.
export function resumenInforme(informe) {
  const l = limpiarInforme(informe);
  return SECCIONES
    .map((s) => {
      let grupo = '';
      const lineas = [];
      for (const c of s.campos) {
        if (c.grupo) grupo = c.grupo;
        const valor = c.tipo === 'goles' ? [textoGoles(l.datos), l.datos[c.id]].filter(Boolean).join('. ') : l.datos[c.id];
        if (valor) lineas.push({ id: c.id, grupo, etiqueta: c.etiqueta, valor, formacion: Boolean(c.formacion) });
      }
      return { id: s.id, icono: s.icono, titulo: s.titulo, lineas };
    })
    .filter((s) => s.lineas.length > 0);
}

// Cuántos campos de las secciones se han rellenado (para "6 de 24").
export function progreso(informe) {
  const l = limpiarInforme(informe);
  const total = SECCIONES.reduce((n, s) => n + s.campos.length, 0);
  return { hechos: Object.keys(l.datos).filter((k) => !/^goles_(\d{2}|tramos)$/.test(k)).length, total };
}

export const jugadoresPorTipo = (informe, tipo) => limpiarInforme(informe).jugadores.filter((j) => j.tipo === tipo);

// "1-4-4-2", "4-4-2", "4 3 3" o "1-4-2-3-1" → líneas de jugadores de campo, de la defensa al ataque ([4,4,2]).
// Devuelve null si no se entiende o no suman 10 jugadores de campo.
export function lineasFormacion(texto) {
  const nums = String(texto || '').match(/\d+/g);
  if (!nums || nums.length < 2 || nums.length > 6) return null;
  let l = nums.map(Number);
  if (l.some((n) => n < 1 || n > 9)) return null;
  const suma = (x) => x.reduce((a, b) => a + b, 0);
  if (suma(l) === 11 && l[0] === 1) l = l.slice(1);
  return suma(l) === 10 && l.length >= 2 ? l : null;
}

// Puntos para dibujar la formación en un campo pequeño (x e y de 0 a 1; la portería abajo, el ataque arriba).
export function puntosFormacion(lineas) {
  if (!lineas) return [];
  const pts = [{ x: 0.5, y: 0.93 }];
  lineas.forEach((n, i) => {
    const y = 0.78 - (i * 0.66) / Math.max(1, lineas.length - 1) * (lineas.length > 1 ? 1 : 0);
    for (let k = 0; k < n; k++) pts.push({ x: (k + 1) / (n + 1), y });
  });
  return pts;
}

// Qué ha cambiado entre dos versiones del informe (la anterior puede ser null: es la primera).
// Devuelve [{ etiqueta, tipo: 'nuevo' | 'cambiado' | 'quitado' }], con los campos y la lista de jugadores.
export function cambiosEntre(anterior, nuevo) {
  const a = limpiarInforme(anterior);
  const n = limpiarInforme(nuevo);
  const cambios = [];
  for (const sec of SECCIONES) {
    for (const c of sec.campos) {
      const antes = a.datos[c.id]; const ahora = n.datos[c.id];
      if (antes === ahora) continue;
      cambios.push({ etiqueta: c.etiqueta, tipo: !antes ? 'nuevo' : !ahora ? 'quitado' : 'cambiado' });
    }
  }
  const gk = (d) => Object.keys(d).filter((k) => /^goles_(\d{2}|tramos)$/.test(k));
  const gAntes = new Set(gk(a.datos).map((k) => a.datos[k])); const gAhora = new Set(gk(n.datos).map((k) => n.datos[k]));
  const gAltas = [...gAhora].filter((x) => !gAntes.has(x)).length; const gBajas = [...gAntes].filter((x) => !gAhora.has(x)).length;
  if (gAltas) cambios.push({ etiqueta: gAltas === 1 ? 'Goles: 1 partido añadido o cambiado' : `Goles: ${gAltas} partidos añadidos o cambiados`, tipo: 'nuevo' });
  if (gBajas) cambios.push({ etiqueta: gBajas === 1 ? 'Goles: 1 partido quitado o cambiado' : `Goles: ${gBajas} partidos quitados o cambiados`, tipo: 'quitado' });
  const firma = (js) => js.map((j) => `${j.nombre}|${j.dorsal}|${j.tipo}|${j.nota}`);
  const fa = new Set(firma(a.jugadores)); const fn = new Set(firma(n.jugadores));
  const altas = firma(n.jugadores).filter((x) => !fa.has(x)).length;
  const bajas = firma(a.jugadores).filter((x) => !fn.has(x)).length;
  if (altas) cambios.push({ etiqueta: altas === 1 ? '1 jugador añadido o cambiado' : `${altas} jugadores añadidos o cambiados`, tipo: 'nuevo' });
  if (bajas) cambios.push({ etiqueta: bajas === 1 ? '1 jugador quitado o cambiado' : `${bajas} jugadores quitados o cambiados`, tipo: 'quitado' });
  return cambios;
}

// Tareas de la sesión: roles de los jugadores y dimensiones del espacio según el objetivo físico.
//
// El espacio se calcula con el "área por jugador" (m² por jugador de campo, sin porteros), que es
// como se mide en juegos reducidos. Los rangos son ORIENTATIVOS, tomados de la literatura sobre
// juegos reducidos en fútbol (la mayoría con jugadores de élite o de cantera de élite).
// No existe un m²/jugador que garantice un resultado concreto: es un punto de partida que el cuerpo
// técnico ajusta a su plantilla, su nivel y su objetivo.
import { GRUPOS_POSICIONES } from './posiciones';

export const BLOQUES_TAREAS = [
  { clave: 'rueda_perfiles', titulo: 'Rueda de perfiles' },
  { clave: 'activacion', titulo: 'Activación' },
  { clave: 'parte_central', titulo: 'Parte central específica' },
  { clave: 'cierre_tactico', titulo: 'Cierre táctico' },
];

// Para qué sirve la tarea en la semana. El espacio por jugador (apP, en m²) es solo el punto de partida
// de cada objetivo: lo que de verdad marca la carga es la intensidad, las series y las pausas.
// Los m² cuentan SOLO a los jugadores de campo (los porteros no). Los rangos salen de la matriz de
// microciclo del cuerpo técnico (martes MD+2: 80-150; jueves MD-3: 35-75; viernes MD-1: 70-100) y
// están todos aquí, en una sola tabla, para que el preparador físico los ajuste.
// Los rondos pequeños (3v1, 4v2: 11-16 m²) quedan por debajo de cualquier rango: es normal, son otro tipo de tarea.
export const OBJETIVOS = {
  recuperacion: {
    etiqueta: 'Recuperación', corto: 'Recuperación', apP: [100, 150], apPInicial: 130, ajusteRatio: -0.1,
    ayuda: 'Baja intensidad: espacio amplio, sin presión ni contacto, para no sumar carga mecánica.',
    trabajo: { series: [2, 3, 2], segundos: [240, 600, 600], pausa: [60, 120, 120] },
  },
  compensacion: {
    etiqueta: 'Compensación', corto: 'Compensación', apP: [60, 100], apPInicial: 85, ajusteRatio: 0.2,
    ayuda: 'Para quien jugó poco o nada: más volumen e intensidad en espacio medio-reducido.',
    trabajo: { series: [3, 5, 4], segundos: [120, 240, 180], pausa: [60, 120, 90] },
  },
  fuerza: {
    etiqueta: 'Fuerza', corto: 'Fuerza', apP: [35, 75], apPInicial: 55, ajusteRatio: -0.1,
    ayuda: 'Espacio reducido: aceleraciones, frenadas, cambios de dirección y duelos.',
    trabajo: { series: [3, 6, 4], segundos: [45, 240, 240], pausa: [45, 120, 90] },
  },
  puesta_a_punto: {
    etiqueta: 'Puesta a punto', corto: 'Puesta a punto', apP: [70, 100], apPInicial: 85, ajusteRatio: 0,
    ayuda: 'Víspera de partido: trabajo corto, explosivo y con descanso casi completo, sin fatigar.',
    trabajo: { series: [3, 8, 6], segundos: [8, 90, 10], pausa: [45, 150, 90] },
  },
};

// "trabajo": [mínimo, máximo, inicial] de series, minutos por serie y pausa en segundos que se proponen para
// cada objetivo. Apoyos de la literatura sobre juegos reducidos: lo más habitual son 3-6 repeticiones (el
// clásico es 4 x 4 minutos con 2-4 minutos de recuperación pasiva); las series más largas hacen que los
// jugadores se autorregulen y baje la intensidad; y la pausa decide cuánto trabajo intenso se puede hacer.
// Cómo se reparte eso entre tus cuatro objetivos es una PROPUESTA que debe validar el preparador físico.
// La duración de cada serie va en SEGUNDOS (hay tareas de 8'', 45'' o 100'' además de las de varios minutos).
// Recalibrado con la matriz de microciclo del cuerpo técnico; sigue siendo una propuesta que valida el preparador físico.

// Si la tarea no tiene objetivo todavía (o es de la lista antigua), se usa este espacio por jugador.
export const APP_NEUTRO = 130;

// Proporción largo/ancho de partida según la referencia de gol (con porterías hace falta más largo).
export const REFERENCIAS = {
  porterias: { etiqueta: 'Porterías', ratio: 1.5 },
  miniporterias: { etiqueta: 'Miniporterías', ratio: 1.3 },
  sin_referencia: { etiqueta: 'Sin referencia de gol', ratio: 1.1 },
};

export const ROLES = {
  ataque: { etiqueta: 'Ataque', color: '#dc2626', fondo: '#fee2e2' },
  defensa: { etiqueta: 'Defensa', color: '#2563eb', fondo: '#dbeafe' },
  comodin: { etiqueta: 'Comodín', color: '#ca8a04', fondo: '#fef9c3' },
  portero: { etiqueta: 'Portero', color: '#16a34a', fondo: '#dcfce7' },
};

export const CAMPO_MAXIMO = { largo: 105, ancho: 68 }; // un campo de fútbol 11

// Rol con el que se propone a un jugador según su posición (se puede cambiar a mano).
export function rolSugerido(posicion) {
  const grupo = GRUPOS_POSICIONES.find((g) => g.posiciones.includes(posicion));
  if (!grupo) return null;
  return { 'Portería': 'portero', Defensas: 'defensa', Medios: 'comodin', Ataque: 'ataque' }[grupo.linea] || null;
}

// asignaciones: { [jugadorId]: 'ataque' | 'defensa' | 'comodin' | 'portero' }
export function contarRoles(asignaciones) {
  const c = { ataque: 0, defensa: 0, comodin: 0, portero: 0 };
  Object.values(asignaciones).forEach((rol) => {
    if (c[rol] !== undefined) c[rol] += 1;
  });
  return c;
}

export const jugadoresDeCampo = (c) => c.ataque + c.defensa + c.comodin;

const limitar = (v, min, max) => Math.min(max, Math.max(min, v));

export function calcularDimensiones({ objetivo, referencia, jugadoresCampo, apP, campoMax = CAMPO_MAXIMO }) {
  const obj = OBJETIVOS[objetivo] || { ajusteRatio: 0 }; // sin objetivo: proporción de partida, sin ajuste
  const ref = REFERENCIAS[referencia] || REFERENCIAS.sin_referencia;
  const n = Math.max(1, jugadoresCampo);
  const area = n * apP;
  const ratio = limitar(ref.ratio + obj.ajusteRatio, 1.0, 2.2);
  const avisos = [];

  let largo = Math.round(Math.sqrt(area * ratio));
  let ancho = Math.round(area / largo);
  if (ancho > largo) [largo, ancho] = [ancho, largo];

  // La zona no puede pasar del campo (el de fútbol 11 salvo que se elija otro con sus medidas reales).
  const esDefecto = campoMax === CAMPO_MAXIMO;
  let recortada = false; // solo se avisa si la zona se ha tenido que recortar de verdad (no por el redondeo)
  if (largo > campoMax.largo) { largo = campoMax.largo; ancho = Math.round(area / largo); recortada = true; }
  if (ancho > campoMax.ancho) { ancho = campoMax.ancho; recortada = true; }
  if (recortada && largo * ancho < area - 1) avisos.push(`Con este número de jugadores y este espacio por jugador, la zona no cabe ${esDefecto ? 'en un campo de fútbol 11' : 'en el campo elegido'}. Se ha limitado al ${esDefecto ? 'campo completo' : 'tamaño del campo'}.`);
  if (ancho < 12) avisos.push('La zona sale muy estrecha (menos de 12 m de ancho). Prueba con menos jugadores o con más espacio por jugador.');

  return { largo, ancho, apPReal: Math.round((largo * ancho) / n), avisos };
}

export const apPInicial = (objetivo) => (OBJETIVOS[objetivo] ? OBJETIVOS[objetivo].apPInicial : APP_NEUTRO);

// "6 vs 5 + 2 comodines + 2 porteros"
export function formatoTarea(t) {
  const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
  let texto = `${t.n_ataque} vs ${t.n_defensa}`;
  if (t.n_comodines > 0) texto += ` + ${plural(t.n_comodines, 'comodín', 'comodines')}`;
  if (t.n_porteros > 0) texto += ` + ${plural(t.n_porteros, 'portero', 'porteros')}`;
  return texto;
}

export const textoDimensiones = (t) => (t.largo && t.ancho ? `${t.largo} × ${t.ancho} m` : 'Sin dimensiones');

// Duración de una serie en segundos. Las tareas antiguas solo tienen minutos.
export const segundosDe = (t) => (t.duracion_seg != null ? t.duracion_seg : (t.duracion_min || 0) * 60);

// "45''", "4'", "1'30''" (comillas simples = minutos, dobles = segundos).
export function formatoDuracion(seg) {
  if (!seg) return '?';
  const m = Math.floor(seg / 60);
  const r = seg % 60;
  if (m === 0) return `${r}''`;
  return r === 0 ? `${m}'` : `${m}'${String(r).padStart(2, '0')}''`;
}

// Valores por los que se mueve el botón +/- de la duración de una serie.
export const ESCALA_DURACION = (() => {
  const v = [5, 8, 10, 12, 15, 20, 25, 30, 40, 45, 50, 60, 75, 90, 100, 120, 150];
  for (let x = 180; x <= 900; x += 30) v.push(x);
  for (let x = 960; x <= 3600; x += 60) v.push(x);
  return v;
})();

// Series, duración (en segundos) y pausa que se proponen para un objetivo (null si no hay objetivo).
export function trabajoInicial(objetivo) {
  const t = OBJETIVOS[objetivo] && OBJETIVOS[objetivo].trabajo;
  return t ? { series: t.series[2], duracion_seg: t.segundos[2], pausa_seg: t.pausa[2] } : null;
}

// Compara lo que hay con el rango recomendado del objetivo. Devuelve las cosas que se salen (vacío = todo bien).
export function avisosTrabajo(objetivo, series, duracion_seg, pausa_seg) {
  const t = OBJETIVOS[objetivo] && OBJETIVOS[objetivo].trabajo;
  if (!t) return [];
  const fuera = (valor, [min, max]) => (valor < min ? 'por debajo' : valor > max ? 'por encima' : null);
  const avisos = [];
  const a = fuera(series, t.series);
  if (a) avisos.push(`Series: ${series} (${a} de ${t.series[0]}-${t.series[1]})`);
  const b = fuera(duracion_seg, t.segundos);
  if (b) avisos.push(`Duración por serie: ${formatoDuracion(duracion_seg)} (${b} de ${formatoDuracion(t.segundos[0])}-${formatoDuracion(t.segundos[1])})`);
  const c = fuera(pausa_seg, t.pausa);
  if (c) avisos.push(`Pausa: ${pausa_seg} s (${c} de ${t.pausa[0]}-${t.pausa[1]} s)`);
  return avisos;
}

// Relación trabajo:pausa como la escribe el cuerpo técnico: 10' de juego con 2' de pausa -> "5:1";
// 10'' con 50'' de pausa -> "1:5"; igual -> "1:1". Sin pausa -> "sin pausa".
export function relacionTrabajoPausa(duracion_seg, pausa_seg) {
  if (!duracion_seg || !pausa_seg) return 'sin pausa';
  const num = (x) => String(Math.round(x * 10) / 10).replace('.', ',');
  if (duracion_seg >= pausa_seg) return `${num(duracion_seg / pausa_seg)}:1`;
  return `1:${num(pausa_seg / duracion_seg)}`;
}

// Minutos totales de la tarea: el juego solo, y con las pausas entre series (no hay pausa tras la última).
export function totalesTarea(series, duracion_seg, pausa_seg) {
  const juegoSeg = series * (duracion_seg || 0);
  const pausasSeg = Math.max(0, series - 1) * (pausa_seg || 0);
  return { juego: Math.round(juegoSeg / 60), conPausas: Math.round((juegoSeg + pausasSeg) / 60), juegoSeg, totalSeg: juegoSeg + pausasSeg };
}

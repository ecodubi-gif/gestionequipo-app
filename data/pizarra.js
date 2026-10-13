// Pizarra de la tarea: el campo de entrenamiento con sus medidas reales, la zona de la tarea colocada dentro,
// los jugadores de cada equipo, los elementos de material y las flechas de balón y de jugador.
//
// Todo lo que se dibuja dentro de la zona se guarda en coordenadas RELATIVAS a ella: u (0 = borde izquierdo,
// 1 = borde derecho) y v (0 = arriba, 1 = abajo). Así, si la zona se mueve o cambia de tamaño, jugadores,
// material y flechas la acompañan. Las medidas del material (una portería mide 7,32 m) no cambian.
// Distancias en metros; el origen del campo es su esquina superior izquierda y el largo va en horizontal.
import { ROLES, calcularDimensiones, CAMPO_MAXIMO } from './tareas';
import { posicionesCampo } from './campo';

export const VERSION = 1;
export const LIMITES = { jugadores: 64, elementos: 60, flechas: 40, texto: 40 };
export const RANGO_UV = [-0.6, 1.6]; // lo más lejos de la zona (en su propio tamaño) que se puede dejar algo

export const CAMPO_POR_DEFECTO = { id: null, nombre: 'Estadio Juan Benjumea', largo: CAMPO_MAXIMO.largo, ancho: CAMPO_MAXIMO.ancho };
export const LIMITES_CAMPO = { largo: [20, 130], ancho: [15, 100] };

// ---------- Colores: dos equipos y comodines; las flechas tienen un significado fijo ----------
export const COLOR_JUGADOR = { ataque: ROLES.ataque.color, defensa: ROLES.defensa.color, comodin: '#eab308', portero: '#111827' };

// Continua = el jugador se mueve; discontinua = se mueve el balón. El color dice qué se hace.
export const FLECHAS = {
  pase: { etiqueta: 'Pase', color: '#111827', discontinua: true, ayuda: 'Balón' },
  tiro: { etiqueta: 'Tiro / finalización', color: '#ea580c', discontinua: true, ayuda: 'Balón' },
  conduccion: { etiqueta: 'Conducción', color: '#15803d', discontinua: false, ayuda: 'Jugador con balón' },
  desmarque: { etiqueta: 'Desmarque / carrera', color: '#7c3aed', discontinua: false, ayuda: 'Jugador sin balón' },
  presion: { etiqueta: 'Presión / repliegue', color: '#0891b2', discontinua: false, ayuda: 'Jugador sin balón' },
};

// Medidas reales en metros: largo = lado largo; ancho = el otro lado (en 'zona' y 'escalera' se pueden cambiar).
export const ELEMENTOS = {
  cono: { etiqueta: 'Cono', grupo: 'Conos y marcas', largo: 0.4, ancho: 0.4 },
  marca: { etiqueta: 'Marca / disco', grupo: 'Conos y marcas', largo: 0.3, ancho: 0.3 },
  porteria: { etiqueta: 'Portería', grupo: 'Porterías', largo: 7.32, ancho: 2 },
  miniporteria: { etiqueta: 'Miniportería', grupo: 'Porterías', largo: 3, ancho: 1.2 },
  pica: { etiqueta: 'Pica', grupo: 'Material', largo: 1.8, ancho: 0.1 },
  valla: { etiqueta: 'Valla', grupo: 'Material', largo: 1, ancho: 0.4 },
  aro: { etiqueta: 'Aro', grupo: 'Material', largo: 0.9, ancho: 0.9 },
  escalera: { etiqueta: 'Escalera', grupo: 'Material', largo: 4.5, ancho: 0.5 },
  zona: { etiqueta: 'Zona de color', grupo: 'Zonas y texto', largo: 10, ancho: 6 },
  texto: { etiqueta: 'Texto', grupo: 'Zonas y texto', largo: 0, ancho: 0 },
};
export const COLORES_ZONA = ['#ef4444', '#3b82f6', '#eab308', '#22c55e', '#a855f7', '#6b7280'];
export const COLOR_ZONA_INICIAL = COLORES_ZONA[2];
export const TAMANO_EDITABLE = ['zona', 'escalera'];

// ---------- Utilidades numéricas ----------
const redondear = (n, d = 3) => { const f = 10 ** d; return Math.round(n * f) / f; };
const limitar = (v, min, max) => Math.min(max, Math.max(min, v));
const esNumero = (v) => typeof v === 'number' && Number.isFinite(v);
const copiar = (o) => JSON.parse(JSON.stringify(o));

// ---------- Zona de la tarea ----------
// Tamaño de la zona = largo × ancho de la tarea. Sin medidas, una zona pequeña de partida.
export function dimsZona(tarea) {
  const L = tarea && tarea.largo > 0 ? tarea.largo : 40;
  const W = tarea && tarea.ancho > 0 ? tarea.ancho : 30;
  return { L, W };
}

// Zona orientativa que sale de la carga física (espacio por jugador del objetivo), los jugadores y la referencia,
// limitada a las medidas reales del campo elegido.
export function zonaSugerida({ objetivo, referencia, jugadoresCampo, apP, campo }) {
  const c = campo || CAMPO_POR_DEFECTO;
  const r = calcularDimensiones({ objetivo, referencia, jugadoresCampo, apP, campoMax: { largo: c.largo, ancho: c.ancho } });
  return { largo: r.largo, ancho: r.ancho, avisos: r.avisos };
}

// Medio campo o campo entero según la zona de la tarea: si cabe en la mitad del campo (largo hasta la mitad y ancho
// hasta el ancho del campo; se supone una portería móvil), se trabaja y se dibuja medio campo; si no, el campo entero.
// Devuelve el campo con el que se dibuja y se limita todo: { ...campo, largo (el visible), largoTotal, medio }.
export function campoEfectivo(campo, L, W) {
  const c = campo || CAMPO_POR_DEFECTO;
  const medio = L <= c.largo / 2 + 0.5 && W <= c.ancho + 1e-9;
  return medio ? { ...c, largo: c.largo / 2, largoTotal: c.largo, medio: true } : { ...c, largoTotal: c.largo, medio: false };
}

export function limitarZona(campo, pos, L, W) {
  const c = campo || CAMPO_POR_DEFECTO;
  return {
    x: redondear(limitar(pos.x, 0, Math.max(0, c.largo - L)), 2),
    y: redondear(limitar(pos.y, 0, Math.max(0, c.ancho - W)), 2),
  };
}
export const centrarZona = (campo, L, W) => {
  const c = campo || CAMPO_POR_DEFECTO;
  return limitarZona(c, { x: (c.largo - L) / 2, y: (c.ancho - W) / 2 }, L, W);
};
export const zonaCabe = (campo, L, W) => {
  const c = campo || CAMPO_POR_DEFECTO;
  return L <= c.largo + 1e-9 && W <= c.ancho + 1e-9;
};

// u,v (relativo a la zona) <-> metros del campo
export function aCampo(dibujo, tarea, u, v) {
  const { L, W } = dimsZona(tarea);
  return { x: dibujo.zona.x + u * L, y: dibujo.zona.y + v * W };
}
export function aZona(dibujo, tarea, x, y) {
  const { L, W } = dimsZona(tarea);
  return { u: (x - dibujo.zona.x) / L, v: (y - dibujo.zona.y) / W };
}

// ---------- Jugadores ----------
const cuentasTarea = (t) => ({
  ataque: t.n_ataque || 0, defensa: t.n_defensa || 0, comodin: t.n_comodines || 0, portero: Math.min(4, t.n_porteros || 0),
});

// Colocación automática (ataque a la izquierda, defensa a la derecha, comodines en las bandas, porteros en porterías).
export function jugadoresIniciales(tarea) {
  const { L, W } = dimsZona(tarea);
  const c = posicionesCampo({
    n_ataque: tarea.n_ataque, n_defensa: tarea.n_defensa, n_comodines: tarea.n_comodines, n_porteros: tarea.n_porteros,
    referencia: tarea.referencia, largo: L, ancho: W,
  });
  return c ? c.jugadores.map((j) => ({ rol: j.rol, u: redondear(j.x), v: redondear(j.y) })) : [];
}

// Ajusta los jugadores dibujados al formato de la tarea: conserva los que ya están colocados,
// añade los que faltan en su sitio automático y quita los que sobran.
export function sincronizarJugadores(actuales, tarea) {
  const cuentas = cuentasTarea(tarea);
  const auto = jugadoresIniciales(tarea);
  const resultado = [];
  for (const rol of ['ataque', 'defensa', 'comodin', 'portero']) {
    const propios = (actuales || []).filter((j) => j.rol === rol).slice(0, cuentas[rol]);
    const deAuto = auto.filter((j) => j.rol === rol);
    const nuevos = deAuto.slice(propios.length, cuentas[rol]);
    resultado.push(...propios, ...nuevos);
  }
  return resultado;
}

// ---------- El dibujo ----------
export function nuevoDibujo({ tarea, campo }) {
  const { L, W } = dimsZona(tarea);
  return {
    v: VERSION,
    campo_id: campo && campo.id != null ? campo.id : null,
    zona: centrarZona(campo, L, W),
    jugadores: jugadoresIniciales(tarea),
    elementos: [],
    flechas: [],
  };
}

// Pone el dibujo en orden: zona dentro del campo y jugadores acordes con el formato de la tarea.
export function ajustarDibujo(dibujo, tarea, campo) {
  const { L, W } = dimsZona(tarea);
  const d = copiar(dibujo);
  d.campo_id = campo && campo.id != null ? campo.id : null;
  d.zona = limitarZona(campo, d.zona || { x: 0, y: 0 }, L, W);
  d.jugadores = sincronizarJugadores(d.jugadores, tarea);
  return d;
}

// Lee lo que llega del servidor (o de una plantilla) y lo deja con la forma esperada; null si no sirve.
export function normalizarDibujo(d) {
  if (!d || typeof d !== 'object' || !d.zona || !esNumero(d.zona.x) || !esNumero(d.zona.y)) return null;
  const uv = (v) => (esNumero(v) ? limitar(v, RANGO_UV[0], RANGO_UV[1]) : null);
  const jugadores = (Array.isArray(d.jugadores) ? d.jugadores : [])
    .filter((j) => j && COLOR_JUGADOR[j.rol] && uv(j.u) !== null && uv(j.v) !== null)
    .slice(0, LIMITES.jugadores).map((j) => ({ rol: j.rol, u: redondear(uv(j.u)), v: redondear(uv(j.v)) }));
  const elementos = (Array.isArray(d.elementos) ? d.elementos : [])
    .filter((e) => e && ELEMENTOS[e.tipo] && uv(e.u) !== null && uv(e.v) !== null)
    .slice(0, LIMITES.elementos).map((e) => {
      const r = { tipo: e.tipo, u: redondear(uv(e.u)), v: redondear(uv(e.v)), giro: e.giro === 90 ? 90 : 0 };
      if (TAMANO_EDITABLE.includes(e.tipo)) {
        r.largo = esNumero(e.largo) ? limitar(e.largo, 0.5, 60) : ELEMENTOS[e.tipo].largo;
        r.ancho = esNumero(e.ancho) ? limitar(e.ancho, 0.3, 60) : ELEMENTOS[e.tipo].ancho;
      }
      if (e.tipo === 'zona') r.color = COLORES_ZONA.includes(e.color) ? e.color : COLOR_ZONA_INICIAL;
      if (e.tipo === 'zona' || e.tipo === 'texto') r.texto = typeof e.texto === 'string' ? e.texto.slice(0, LIMITES.texto) : '';
      return r;
    });
  const flechas = (Array.isArray(d.flechas) ? d.flechas : [])
    .filter((f) => f && FLECHAS[f.tipo] && [f.u1, f.v1, f.u2, f.v2].every((n) => uv(n) !== null))
    .slice(0, LIMITES.flechas).map((f) => ({ tipo: f.tipo, u1: redondear(uv(f.u1)), v1: redondear(uv(f.v1)), u2: redondear(uv(f.u2)), v2: redondear(uv(f.v2)) }));
  return {
    v: VERSION,
    campo_id: Number.isInteger(d.campo_id) ? d.campo_id : null,
    zona: { x: redondear(d.zona.x, 2), y: redondear(d.zona.y, 2) },
    jugadores, elementos, flechas,
  };
}

// ---------- Tamaño y forma de cada elemento ----------
// Devuelve { largo, ancho } en metros, ya girado (giro 90 intercambia los lados).
export function medidasElemento(e) {
  const base = ELEMENTOS[e.tipo];
  const largo = TAMANO_EDITABLE.includes(e.tipo) && e.largo ? e.largo : base.largo;
  const ancho = TAMANO_EDITABLE.includes(e.tipo) && e.ancho ? e.ancho : base.ancho;
  // Porterías: la boca mira al lado (largo en vertical). Resto: el largo va en horizontal.
  const verticalDeBase = e.tipo === 'porteria' || e.tipo === 'miniporteria';
  const horizontal = verticalDeBase ? e.giro === 90 : e.giro !== 90;
  return horizontal ? { largo, ancho } : { largo: ancho, ancho: largo };
}

// ---------- Añadir y editar ----------
export function anadirElemento(dibujo, tipo, u, v) {
  if (!ELEMENTOS[tipo] || dibujo.elementos.length >= LIMITES.elementos) return { dibujo, ref: null };
  const e = { tipo, u: redondear(u), v: redondear(v), giro: 0 };
  if (TAMANO_EDITABLE.includes(tipo)) { e.largo = ELEMENTOS[tipo].largo; e.ancho = ELEMENTOS[tipo].ancho; }
  if (tipo === 'zona') { e.color = COLOR_ZONA_INICIAL; e.texto = ''; }
  if (tipo === 'texto') e.texto = 'Texto';
  const d = copiar(dibujo);
  d.elementos.push(e);
  return { dibujo: d, ref: { tipo: 'elemento', i: d.elementos.length - 1 } };
}

export function anadirFlecha(dibujo, tipo, a, b) {
  if (!FLECHAS[tipo] || dibujo.flechas.length >= LIMITES.flechas) return { dibujo, ref: null };
  const d = copiar(dibujo);
  d.flechas.push({ tipo, u1: redondear(a.u), v1: redondear(a.v), u2: redondear(b.u), v2: redondear(b.v) });
  return { dibujo: d, ref: { tipo: 'flecha', i: d.flechas.length - 1 } };
}

export function borrar(dibujo, ref) {
  const d = copiar(dibujo);
  if (ref.tipo === 'elemento') d.elementos.splice(ref.i, 1);
  else if (ref.tipo === 'flecha') d.flechas.splice(ref.i, 1);
  return d; // los jugadores no se borran: salen del formato de la tarea
}

export function cambiarElemento(dibujo, i, cambios) {
  const d = copiar(dibujo);
  const e = d.elementos[i];
  if (!e) return d;
  if (cambios.giro !== undefined) e.giro = e.giro === 90 ? 0 : 90;
  if (cambios.largo !== undefined && TAMANO_EDITABLE.includes(e.tipo)) e.largo = redondear(limitar(cambios.largo, 0.5, 60), 1);
  if (cambios.ancho !== undefined && TAMANO_EDITABLE.includes(e.tipo)) e.ancho = redondear(limitar(cambios.ancho, 0.3, 60), 1);
  if (cambios.color !== undefined && e.tipo === 'zona' && COLORES_ZONA.includes(cambios.color)) e.color = cambios.color;
  if (cambios.texto !== undefined && (e.tipo === 'zona' || e.tipo === 'texto')) e.texto = String(cambios.texto).slice(0, LIMITES.texto);
  return d;
}

export function cambiarTipoFlecha(dibujo, i, tipo) {
  const d = copiar(dibujo);
  if (d.flechas[i] && FLECHAS[tipo]) d.flechas[i].tipo = tipo;
  return d;
}

// ---------- Mover ----------
// base: el dibujo tal como estaba al empezar a arrastrar; dx, dy: metros desplazados desde entonces.
// ref: { tipo: 'zona' } | { tipo: 'jugador'|'elemento'|'flecha', i, extremo?: 1|2 }
export function mover(base, tarea, campo, ref, dx, dy) {
  const { L, W } = dimsZona(tarea);
  const d = copiar(base);
  const c = campo || CAMPO_POR_DEFECTO;
  if (ref.tipo === 'zona') {
    d.zona = limitarZona(c, { x: base.zona.x + dx, y: base.zona.y + dy }, L, W);
    return d;
  }
  // Un punto no puede salir del campo (en metros) ni irse demasiado lejos de la zona.
  const punto = (u, v) => {
    const x = limitar(base.zona.x + u * L + dx, 0, c.largo);
    const y = limitar(base.zona.y + v * W + dy, 0, c.ancho);
    return { u: limitar((x - base.zona.x) / L, RANGO_UV[0], RANGO_UV[1]), v: limitar((y - base.zona.y) / W, RANGO_UV[0], RANGO_UV[1]) };
  };
  if (ref.tipo === 'jugador' || ref.tipo === 'elemento') {
    const lista = ref.tipo === 'jugador' ? d.jugadores : d.elementos;
    const o = base[ref.tipo === 'jugador' ? 'jugadores' : 'elementos'][ref.i];
    if (!o) return d;
    const p = punto(o.u, o.v);
    lista[ref.i].u = redondear(p.u);
    lista[ref.i].v = redondear(p.v);
  } else if (ref.tipo === 'flecha') {
    const f = base.flechas[ref.i];
    if (!f) return d;
    const salida = d.flechas[ref.i];
    if (!ref.extremo || ref.extremo === 1) { const p = punto(f.u1, f.v1); salida.u1 = redondear(p.u); salida.v1 = redondear(p.v); }
    if (!ref.extremo || ref.extremo === 2) { const p = punto(f.u2, f.v2); salida.u2 = redondear(p.u); salida.v2 = redondear(p.v); }
  }
  return d;
}

// ---------- Qué hay en un punto (para tocar y arrastrar) ----------
const distSegmento = (px, py, x1, y1, x2, y2) => {
  const dx = x2 - x1; const dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : limitar(((px - x1) * dx + (py - y1) * dy) / l2, 0, 1);
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
};

// px, py en metros del campo. tol: metros de margen para el dedo. Devuelve la referencia de lo que haya encima, o null.
export function buscarEn(dibujo, tarea, px, py, tol = 1) {
  // 1. Jugadores (lo de arriba)
  for (let i = dibujo.jugadores.length - 1; i >= 0; i--) {
    const j = dibujo.jugadores[i];
    const p = aCampo(dibujo, tarea, j.u, j.v);
    if (Math.hypot(px - p.x, py - p.y) <= Math.max(tol, 1)) return { tipo: 'jugador', i };
  }
  // 2. Extremos de flechas, luego material, luego el cuerpo de las flechas, y las zonas de color al final
  for (let i = dibujo.flechas.length - 1; i >= 0; i--) {
    const f = dibujo.flechas[i];
    const a = aCampo(dibujo, tarea, f.u1, f.v1); const b = aCampo(dibujo, tarea, f.u2, f.v2);
    if (Math.hypot(px - b.x, py - b.y) <= tol * 1.2) return { tipo: 'flecha', i, extremo: 2 };
    if (Math.hypot(px - a.x, py - a.y) <= tol * 1.2) return { tipo: 'flecha', i, extremo: 1 };
  }
  const caja = (e) => {
    const p = aCampo(dibujo, tarea, e.u, e.v);
    const m = medidasElemento(e);
    return { p, mx: Math.max(m.largo / 2, tol * 0.6), my: Math.max(m.ancho / 2, tol * 0.6) };
  };
  for (let i = dibujo.elementos.length - 1; i >= 0; i--) {
    const e = dibujo.elementos[i];
    if (e.tipo === 'zona') continue;
    const { p, mx, my } = caja(e);
    if (Math.abs(px - p.x) <= mx && Math.abs(py - p.y) <= my) return { tipo: 'elemento', i };
  }
  for (let i = dibujo.flechas.length - 1; i >= 0; i--) {
    const f = dibujo.flechas[i];
    const a = aCampo(dibujo, tarea, f.u1, f.v1); const b = aCampo(dibujo, tarea, f.u2, f.v2);
    if (distSegmento(px, py, a.x, a.y, b.x, b.y) <= tol) return { tipo: 'flecha', i, extremo: null };
  }
  for (let i = dibujo.elementos.length - 1; i >= 0; i--) {
    const e = dibujo.elementos[i];
    if (e.tipo !== 'zona') continue;
    const { p, mx, my } = caja(e);
    if (Math.abs(px - p.x) <= mx && Math.abs(py - p.y) <= my) return { tipo: 'elemento', i };
  }
  // 3. La zona de la tarea
  const { L, W } = dimsZona(tarea);
  if (px >= dibujo.zona.x && px <= dibujo.zona.x + L && py >= dibujo.zona.y && py <= dibujo.zona.y + W) return { tipo: 'zona' };
  return null;
}

// ---------- Resumen para avisos ----------
export function avisosDibujo(dibujo, tarea, campo) {
  const c = campo || CAMPO_POR_DEFECTO;
  const { L, W } = dimsZona(tarea);
  const avisos = [];
  if (!zonaCabe(c, L, W)) avisos.push(`La zona (${L} × ${W} m) no cabe en ${c.nombre} (${c.largo} × ${c.ancho} m). Reduce la zona, gírala o elige otro campo.`);
  if (dibujo && dibujo.flechas && dibujo.flechas.length >= LIMITES.flechas) avisos.push('Has llegado al máximo de flechas.');
  if (dibujo && dibujo.elementos && dibujo.elementos.length >= LIMITES.elementos) avisos.push('Has llegado al máximo de elementos.');
  return avisos;
}

// Un campo de la lista (o el de por defecto) según el id guardado en el dibujo.
export function campoDe(dibujo, campos) {
  const lista = campos || [];
  if (dibujo && dibujo.campo_id != null) {
    const c = lista.find((x) => x.id === dibujo.campo_id);
    if (c) return c;
  }
  return lista[0] || CAMPO_POR_DEFECTO;
}

// ¿Merece la pena dibujar algo ahora mismo? (hay zona y alguna cosa colocada)
export const hayDibujo = (d) => Boolean(d && d.zona && ((d.jugadores || []).length || (d.elementos || []).length || (d.flechas || []).length));

// El dibujo que se enseña de una tarea: el guardado (ajustado a su formato actual) o, si no hay, uno automático
// con la zona centrada en el campo. Sin medidas de la tarea no se dibuja nada.
export function dibujoDeTarea(tarea, campos) {
  if (!tarea || !(tarea.largo > 0) || !(tarea.ancho > 0)) return null;
  const guardado = normalizarDibujo(tarea.dibujo);
  const campo = campoDe(guardado, campos);
  const base = guardado || nuevoDibujo({ tarea, campo });
  return { dibujo: ajustarDibujo(base, tarea, campo), campo, automatico: !guardado };
}

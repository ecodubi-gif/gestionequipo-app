// Material que hay que sacar al campo en una sesión. Se deduce de los textos del preventivo, la movilidad y las postas
// (y de las descripciones de las tareas): si el texto dice "5 minivallas" se cuenta 5; si solo las nombra, se anota
// el material sin cantidad. Los bloques se hacen uno detrás de otro y se reutiliza el material, así que la cantidad
// de cada cosa es la del bloque que más necesita (dentro de un bloque, las estaciones se hacen a la vez y se suman).

export const MATERIALES = [
  { clave: 'minivalla', nombre: 'Minivallas', re: 'minivallas?' },
  { clave: 'escalera', nombre: 'Escaleras de agilidad', re: 'escaleras?' },
  { clave: 'seta', nombre: 'Setas', re: 'setas?' },
  { clave: 'peto', nombre: 'Petos', re: 'petos?' },
  { clave: 'medicinal', nombre: 'Balones medicinales', re: 'medicinal(?:es)?' },
  { clave: 'goma', nombre: 'Gomas elásticas', re: 'gomas?' },
  { clave: 'cojin', nombre: 'Cojines de equilibrio', re: 'coj[ií]n(?:es)?' },
  { clave: 'pica', nombre: 'Picas', re: 'picas?' },
  { clave: 'rulo', nombre: 'Rulos foam', re: 'rulos? foam' },
  { clave: 'esterilla', nombre: 'Esterillas', re: 'esterillas?' },
  { clave: 'miniporteria', nombre: 'Miniporterías', re: 'miniporter[ií]as?' },
  { clave: 'correa', nombre: 'Correas de estiramiento', re: 'correas?' },
];

const regexes = MATERIALES.map((m) => ({
  ...m,
  nombreRe: new RegExp(`\\b${m.re}\\b`, 'i'),
  numeroDelante: new RegExp(`(\\d+)\\s+(?:[a-záéíóúñ]+\\s+)?${m.re}\\b`, 'gi'),
  numeroEntreParentesis: new RegExp(`\\b${m.re}\\s*\\((\\d+)\\)`, 'gi'),
}));

// Qué material nombra un texto y cuántas unidades dice (null si no dice cantidad).
export function materialDeTexto(texto) {
  const t = String(texto || '');
  const r = [];
  for (const m of regexes) {
    if (!m.nombreRe.test(t)) continue;
    let cantidad = null;
    for (const re of [m.numeroDelante, m.numeroEntreParentesis]) {
      re.lastIndex = 0;
      let x;
      while ((x = re.exec(t)) !== null) cantidad = Math.max(cantidad || 0, Number(x[1]));
    }
    r.push({ clave: m.clave, nombre: m.nombre, cantidad });
  }
  return r;
}

// bloques: [{ titulo, textos: [string, ...] }]  (cada texto es una estación, un tramo o una posta)
// Devuelve [{ clave, nombre, cantidad|null, en: ['Preventivo', 'Rueda físico-técnica'] }]
export function materialDeSesion(bloques) {
  const total = new Map();
  for (const b of bloques) {
    const enBloque = new Map();
    for (const t of b.textos) {
      for (const m of materialDeTexto(t)) {
        const previo = enBloque.get(m.clave) || { cantidad: null };
        enBloque.set(m.clave, { nombre: m.nombre, cantidad: m.cantidad == null && previo.cantidad == null ? null : (previo.cantidad || 0) + (m.cantidad == null ? 1 : m.cantidad) });
      }
    }
    for (const [clave, v] of enBloque) {
      const t = total.get(clave) || { clave, nombre: v.nombre, cantidad: null, en: [] };
      if (v.cantidad != null) t.cantidad = Math.max(t.cantidad || 0, v.cantidad);
      t.en.push(b.titulo);
      total.set(clave, t);
    }
  }
  const orden = MATERIALES.map((m) => m.clave);
  return [...total.values()].sort((a, b) => orden.indexOf(a.clave) - orden.indexOf(b.clave));
}

// Los textos de cada bloque de una sesión ya construida (construirSesion).
export function materialDeItems(items) {
  const bloques = [];
  for (const it of items) {
    if (it.estaciones) bloques.push({ titulo: 'Preventivo', textos: it.estaciones.map((e) => `${e.zona}. ${e.ejercicio}`) });
    else if (it.tramos) bloques.push({ titulo: 'Movilidad', textos: it.tramos.map((m) => m.descripcion) });
    else if (it.clave === 'rueda_perfiles') {
      const textos = (it.postas || []).map((p) => `${p.fisico} ${p.tecnico || ''}`);
      for (const t of it.tareas || []) if (t.descripcion) textos.push(t.descripcion);
      bloques.push({ titulo: 'Rueda físico-técnica', textos });
    } else if (it.clave === 'estiramientos' && it.texto) bloques.push({ titulo: 'Estiramientos', textos: [it.texto] });
  }
  return materialDeSesion(bloques);
}

export const textoMaterial = (m) => `${m.nombre}${m.cantidad != null ? `: ${m.cantidad}` : ''}`;

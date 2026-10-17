// Jugadores que proceden de la cantera: categoría de la que vienen (null = no es de cantera).
export const CATEGORIAS_CANTERA = ['infantil', 'cadete', 'juvenil', 'filial'];
export const categoriaCanteraValida = (c) => c == null || c === '' || CATEGORIAS_CANTERA.includes(c);
export const normalizarCantera = (c) => (CATEGORIAS_CANTERA.includes(String(c || '').toLowerCase()) ? String(c).toLowerCase() : null);
export const etiquetaCantera = (c) => { const n = normalizarCantera(c); return n ? `🌱 Cantera · ${n.charAt(0).toUpperCase()}${n.slice(1)}` : ''; };
export const esDeCantera = (j) => !!normalizarCantera(j && j.cantera);
export const resumenCantera = (jugadores) => {
  const r = { total: 0 }; CATEGORIAS_CANTERA.forEach((c) => { r[c] = 0; });
  (jugadores || []).forEach((j) => { const c = normalizarCantera(j && j.cantera); if (c) { r[c] += 1; r.total += 1; } });
  return r;
};

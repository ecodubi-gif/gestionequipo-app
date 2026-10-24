// Dónde cortar un documento largo en páginas: a la altura de página, pero sin partir los bloques (.bloque, .tarea)
// y respetando los saltos de página forzados. Todo en píxeles de la página.
export function cortesDePagina(total, alturaPagina, bloques = [], saltos = []) {
  const cortes = [0];
  let y = 0;
  while (total - y > alturaPagina + 1 || saltos.some((t) => t > y + 4 && t < total - 4)) {
    let corte = Math.min(y + alturaPagina, total);
    const salto = saltos.filter((t) => t > y + 4 && t < corte).sort((p, q) => p - q)[0];
    if (salto !== undefined) corte = salto;
    else {
      const partido = bloques.find((b) => b.top > y + 4 && b.top < corte && b.bottom > corte && b.bottom - b.top < alturaPagina);
      if (partido) corte = partido.top;
    }
    cortes.push(corte);
    y = corte;
  }
  cortes.push(total);
  return cortes;
}

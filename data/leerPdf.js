// Lee el texto de un PDF en el navegador (la clasificación que genera la Federación Andaluza cada jornada).
// El lector (pdf.js) está en /pdfjs/ del propio sitio y solo se carga cuando se sube un PDF.

function cargarScript(src, listo) {
  return new Promise((ok, mal) => {
    if (listo()) { ok(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => ok();
    s.onerror = () => mal(new Error(`No se pudo cargar ${src}. Pega la tabla a mano.`));
    document.head.appendChild(s);
  });
}

// Agrupa los trozos de texto por línea (misma altura) y los ordena de izquierda a derecha.
export function lineasDeTrozos(trozos) {
  const filas = [];
  for (const t of trozos) {
    const txt = String(t.str || '').trim();
    if (!txt) continue;
    const y = t.transform[5]; const x = t.transform[4];
    let f = filas.find((r) => Math.abs(r.y - y) <= 3);
    if (!f) { f = { y, items: [] }; filas.push(f); }
    f.items.push({ x, txt });
  }
  filas.sort((a, b) => b.y - a.y);
  return filas.map((f) => f.items.sort((a, b) => a.x - b.x).map((i) => i.txt).join(' '));
}

const conTiempo = (promesa, ms, mensaje) => new Promise((ok, mal) => {
  const t = setTimeout(() => mal(new Error(mensaje)), ms);
  promesa.then((v) => { clearTimeout(t); ok(v); }, (e) => { clearTimeout(t); mal(e); });
});

export async function textoDePdf(archivo) {
  await cargarScript('/pdfjs/pdf.min.js', () => Boolean(window.pdfjsLib));
  // El "worker" se carga como script normal: así pdf.js trabaja en la propia página y no depende de
  // crear un hilo aparte (que en algunos móviles se queda esperando para siempre).
  await cargarScript('/pdfjs/pdf.worker.min.js', () => Boolean(window.pdfjsWorker));
  const lib = window.pdfjsLib;
  const leer = async () => {
    const datos = await archivo.arrayBuffer();
    const pdf = await lib.getDocument({ data: datos }).promise;
    const salida = [];
    for (let n = 1; n <= pdf.numPages; n++) {
      const pagina = await pdf.getPage(n);
      const contenido = await pagina.getTextContent();
      salida.push(...lineasDeTrozos(contenido.items));
    }
    return salida.join('\n');
  };
  return conTiempo(leer(), 25000, 'El PDF tarda demasiado en leerse. Pega la tabla a mano.');
}

// Abre el selector de archivos del navegador y devuelve el texto del PDF elegido (o null si se cancela).
export function elegirPdf() {
  return new Promise((ok, mal) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf,.pdf';
    input.oncancel = () => ok(null);
    input.onchange = async () => {
      const f = input.files && input.files[0];
      if (!f) { ok(null); return; }
      try { ok(await textoDePdf(f)); } catch (e) { mal(e); }
    };
    input.click();
  });
}

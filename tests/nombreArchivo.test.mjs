import { nombreArchivo } from './nombreArchivo.mjs';
let ok = 0, mal = 0;
const t = (n, c) => { if (c) ok++; else { mal++; console.log('MAL:', n); } };
const d = new Date(2026, 9, 24);
t('árbitro', nombreArchivo('el PDF del árbitro', d) === 'pdf-del-arbitro-2026-10-24');
t('alineación', nombreArchivo('la alineación', d) === 'alineacion-2026-10-24');
t('vacío', nombreArchivo('', d) === 'documento-2026-10-24');
console.log('compartir:', ok, 'ok', mal, 'mal');

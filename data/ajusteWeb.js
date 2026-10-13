// Ajustes de la versión web para que, en el iPhone, la pantalla no "baile":
// - Safari amplía la página sola al tocar un campo de texto con letra menor de 16 px (y luego se queda movida).
// - Al arrastrar más allá del principio o del final, la página rebota.
// - Con la barra de Safari que aparece y desaparece, 100 % de alto no es el alto real visible.
// Solo actúa en la web; en el móvil nativo no hace nada.
import { Platform } from 'react-native';

export const CSS_AJUSTE_WEB = `
html, body { overscroll-behavior: none; -webkit-text-size-adjust: 100%; -webkit-tap-highlight-color: transparent; }
body { position: fixed; top: 0; left: 0; right: 0; bottom: 0; width: 100%; touch-action: manipulation; }
html, body, #root { overflow: hidden; max-width: 100%; }
@supports (height: 100dvh) { html, body, #root { height: 100dvh; } }
@media (pointer: coarse) { input, textarea, select { font-size: 16px !important; } }
`;

export const VIEWPORT_WEB = 'width=device-width, initial-scale=1, maximum-scale=1, shrink-to-fit=no';

export function aplicarAjusteWeb() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if (document.getElementById('ajuste-web')) return;
  const estilo = document.createElement('style');
  estilo.id = 'ajuste-web';
  estilo.textContent = CSS_AJUSTE_WEB;
  document.head.appendChild(estilo);
  const meta = document.querySelector('meta[name="viewport"]');
  if (meta) meta.setAttribute('content', VIEWPORT_WEB);
}

aplicarAjusteWeb();

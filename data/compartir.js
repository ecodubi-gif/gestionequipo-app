import { Platform, Alert, Linking, Share } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { nombreArchivo } from './nombreArchivo';
import { cortesDePagina } from './paginasPdf';

/**
 * Abre WhatsApp con un texto ya escrito.
 * En móvil (Expo Go / app instalada) usamos el enlace whatsapp://,
 * que abre la app directamente. En el navegador ese enlace no
 * funciona, así que usamos wa.me, el enlace oficial de WhatsApp
 * pensado justo para abrirse desde una web (abre WhatsApp Web o la
 * app de escritorio).
 */
export async function compartirWhatsApp(texto) {
  if (Platform.OS === 'web') {
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
    return;
  }

  const url = `whatsapp://send?text=${encodeURIComponent(texto)}`;
  try {
    const puedeAbrir = await Linking.canOpenURL(url);
    if (puedeAbrir) {
      await Linking.openURL(url);
    } else {
      await Share.share({ message: texto });
    }
  } catch {
    Alert.alert('No se pudo abrir WhatsApp', 'Comprueba que lo tienes instalado.');
  }
}

// Coloca el HTML dentro de la propia página (tapado por un aviso "Generando PDF…") para poder pintarlo. Un iframe fuera de
// pantalla sale en blanco en Safari del iPhone, por eso no se usa. Devuelve { el, quitar }.
async function montarHtml(html, ancho) {
  const d = new DOMParser().parseFromString(html, 'text/html');
  const css = [...d.querySelectorAll('style')].map((x) => x.textContent).join('\n')
    .replace(/@page\s*\{[^}]*\}/g, '').replace(/(^|[},\s])(html|body)\b/g, '$1.pdf-raiz');
  const estilo = document.createElement('style');
  estilo.textContent = css;
  const el = document.createElement('div');
  el.className = 'pdf-raiz';
  el.setAttribute('style', `${d.body.getAttribute('style') || ''};position:absolute;left:0;top:${window.pageYOffset || 0}px;width:${ancho}px;margin:0;background:#ffffff;z-index:2147483000;box-sizing:border-box;`);
  el.innerHTML = d.body.innerHTML;
  const aviso = document.createElement('div');
  aviso.setAttribute('style', 'position:fixed;left:0;top:0;right:0;bottom:0;background:#ffffff;z-index:2147483001;display:flex;align-items:center;justify-content:center;font:600 16px -apple-system,Arial,sans-serif;color:#374151;');
  aviso.textContent = 'Generando PDF…';
  document.head.appendChild(estilo);
  document.body.appendChild(el);
  document.body.appendChild(aviso);
  await new Promise((r) => setTimeout(r, 700)); // que termine de pintar (SVG, tipos de letra)
  const quitar = () => [estilo, el, aviso].forEach((n) => { if (n.parentNode) n.parentNode.removeChild(n); });
  return { el, quitar };
}

// ¿Está el lienzo todo blanco? (así se ve un PDF que ha salido mal)
function lienzoEnBlanco(canvas) {
  try {
    const m = document.createElement('canvas');
    m.width = 48; m.height = 48;
    const c = m.getContext('2d');
    c.drawImage(canvas, 0, 0, 48, 48);
    const px = c.getImageData(0, 0, 48, 48).data;
    for (let i = 0; i < px.length; i += 4) if (px[i] < 245 || px[i + 1] < 245 || px[i + 2] < 245) return false;
    return true;
  } catch (e) {
    return false;
  }
}

// Los navegadores del móvil limitan el tamaño del lienzo: por encima de unos 12 millones de píxeles sale en blanco.
const escalaSegura = (ancho, alto, maxima = 2) => Math.max(0.5, Math.min(maxima, Math.sqrt(12e6 / (ancho * alto)), 16000 / alto));

// En el navegador: convierte el HTML en un PDF de verdad y lo comparte con el menú del móvil o, si no existe, lo descarga.
// Si recibe una lista de hojas, cada una ocupa una página entera; si recibe un texto, se reparte en páginas A4.
// Devuelve null si todo fue bien, o el motivo del fallo para caer en el diálogo de impresión.
async function pdfEnNavegador(contenido, nombre, horizontal = false) {
  const quitarTodo = [];
  try {
    const ancho = horizontal ? 1123 : 794;
    const html2canvas = (await import('html2canvas')).default;
    const { jsPDF: JsPDF } = await import('jspdf');
    const pdf = new JsPDF({ unit: 'mm', format: 'a4', orientation: horizontal ? 'landscape' : 'portrait' });
    const pw = pdf.internal.pageSize.getWidth() - 16;
    const ph = pdf.internal.pageSize.getHeight() - 16;
    const opciones = (alto) => ({ scale: escalaSegura(ancho, alto), useCORS: true, backgroundColor: '#ffffff', scrollX: 0, scrollY: -(window.pageYOffset || 0) });
    if (Array.isArray(contenido)) {
      for (let i = 0; i < contenido.length; i++) {
        const { el, quitar } = await montarHtml(contenido[i], ancho);
        quitarTodo.push(quitar);
        const canvas = await html2canvas(el, opciones(Math.max(el.scrollHeight, 100)));
        quitar();
        if (lienzoEnBlanco(canvas)) throw new Error('La hoja ha salido en blanco');
        if (i > 0) pdf.addPage();
        const k = Math.min(pw / canvas.width, ph / canvas.height);
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 8, 8, canvas.width * k, canvas.height * k);
      }
    } else {
      const { el, quitar } = await montarHtml(contenido, ancho);
      quitarTodo.push(quitar);
      const base = el.getBoundingClientRect().top;
      const total = Math.max(el.scrollHeight, 100);
      const bloques = [...el.querySelectorAll('.bloque, .tarea')].map((n) => { const r = n.getBoundingClientRect(); return { top: r.top - base, bottom: r.bottom - base }; });
      const saltos = [...el.querySelectorAll('*')].filter((n) => { const c = window.getComputedStyle(n); return c.pageBreakBefore === 'always' || c.breakBefore === 'page'; }).map((n) => n.getBoundingClientRect().top - base);
      const cortes = cortesDePagina(total, Math.floor(ancho * (ph / pw)), bloques, saltos);
      const canvas = await html2canvas(el, opciones(total));
      quitar();
      if (lienzoEnBlanco(canvas)) throw new Error('El documento ha salido en blanco');
      const esc = canvas.height / total;
      for (let i = 0; i < cortes.length - 1; i++) {
        const y0 = Math.round(cortes[i] * esc);
        const alto = Math.max(1, Math.min(canvas.height - y0, Math.round((cortes[i + 1] - cortes[i]) * esc)));
        const trozo = document.createElement('canvas');
        trozo.width = canvas.width;
        trozo.height = alto;
        const c = trozo.getContext('2d');
        c.fillStyle = '#ffffff';
        c.fillRect(0, 0, trozo.width, trozo.height);
        c.drawImage(canvas, 0, y0, canvas.width, alto, 0, 0, canvas.width, alto);
        if (i > 0) pdf.addPage();
        const k = pw / canvas.width;
        pdf.addImage(trozo.toDataURL('image/jpeg', 0.92), 'JPEG', 8, 8, canvas.width * k, alto * k);
      }
    }
    const blob = pdf.output('blob');
    quitarTodo.forEach((q) => q());
    const archivo = new File([blob], `${nombre}.pdf`, { type: 'application/pdf' });
    if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
      try {
        await navigator.share({ files: [archivo], title: nombre });
        return null;
      } catch (e) {
        if (e && e.name === 'AbortError') return null; // el usuario cerró el menú de compartir
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nombre}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    return null;
  } catch (e) {
    return (e && e.message) || 'error desconocido';
  } finally {
    quitarTodo.forEach((q) => q());
  }
}

/**
 * Genera un documento (PDF) a partir de HTML y lo comparte.
 * En móvil usamos expo-print + expo-sharing, que crean un PDF de verdad y abren el menú de compartir del sistema.
 * En el navegador generamos el PDF y lo compartimos con el menú del dispositivo (WhatsApp, correo…) o lo descargamos.
 * Solo si eso falla abrimos el diálogo de impresión del navegador, donde se puede elegir "Guardar como PDF".
 */
export async function generarDocumento(contenido, nombreError = 'el documento', opciones = {}) {
  const html = Array.isArray(contenido) ? contenido.map((h, i) => (i > 0 ? `<div style="page-break-before:always"></div>${h}` : h)).join('') : contenido;
  if (Platform.OS === 'web') {
    const fallo = await pdfEnNavegador(contenido, nombreArchivo(nombreError), Boolean(opciones.horizontal));
    if (fallo === null) return;
    const ventana = window.open('', '_blank');
    if (!ventana) {
      Alert.alert('No se pudo generar el PDF', `Motivo: ${fallo}. Prueba de nuevo y, si sigue fallando, dímelo con este mensaje.`);
      return;
    }
    ventana.document.write(html);
    ventana.document.close();
    setTimeout(() => ventana.print(), 400);
    return;
  }

  try {
    const { uri } = await Print.printToFileAsync({ html, ...(opciones.horizontal ? { width: 842, height: 595 } : {}) });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri);
    } else {
      Alert.alert('No se puede compartir', 'Este dispositivo no permite compartir archivos.');
    }
  } catch (err) {
    Alert.alert(`No se pudo generar ${nombreError}`, err.message);
  }
}

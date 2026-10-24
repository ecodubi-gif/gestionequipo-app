import { Platform, Alert, Linking, Share } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { nombreArchivo } from './nombreArchivo';

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

// Escribe un HTML dentro de un iframe fuera de pantalla y espera a que pinte. Devuelve { iframe, doc }.
async function iframeConHtml(html, ancho, alto) {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = `position:fixed;left:-10000px;top:0;width:${ancho}px;height:${alto}px;border:0;`;
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  doc.open();
  doc.write(/^\s*(<!doctype|<html)/i.test(html) ? html : `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0">${html}</body></html>`);
  doc.close();
  await new Promise((r) => setTimeout(r, 600)); // que termine de pintar (SVG, tipos de letra)
  return { iframe, doc };
}

// Los navegadores del móvil limitan el tamaño del lienzo: por encima de unos 12 millones de píxeles sale en blanco.
const escalaSegura = (ancho, alto, maxima = 2) => Math.max(0.5, Math.min(maxima, Math.sqrt(12e6 / (ancho * alto)), 16000 / alto));

// En el navegador: convierte el HTML en un PDF de verdad y lo comparte con el menú del móvil o, si no existe, lo descarga.
// Si recibe una lista de hojas, cada una ocupa una página entera (así no se juntan en un lienzo gigante).
// Devuelve false si no ha podido, para caer en el diálogo de impresión.
async function pdfEnNavegador(contenido, nombre, horizontal = false) {
  const iframes = [];
  try {
    const ancho = horizontal ? 1123 : 794;
    const html2pdf = (await import('html2pdf.js')).default;
    const jsPDF = { unit: 'mm', format: 'a4', orientation: horizontal ? 'landscape' : 'portrait' };
    let blob;
    if (Array.isArray(contenido)) {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF: JsPDF } = await import('jspdf');
      const pdf = new JsPDF(jsPDF);
      for (let i = 0; i < contenido.length; i++) {
        const { iframe, doc } = await iframeConHtml(contenido[i], ancho, horizontal ? 794 : 1123);
        iframes.push(iframe);
        const alto = Math.max(doc.body.scrollHeight, 100);
        const canvas = await html2canvas(doc.body, { scale: escalaSegura(ancho, alto), useCORS: true, backgroundColor: '#ffffff', windowWidth: ancho, windowHeight: alto, height: alto });
        iframe.remove();
        if (i > 0) pdf.addPage();
        const pw = pdf.internal.pageSize.getWidth() - 16;
        const ph = pdf.internal.pageSize.getHeight() - 16;
        const k = Math.min(pw / canvas.width, ph / canvas.height);
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 8, 8, canvas.width * k, canvas.height * k);
      }
      blob = pdf.output('blob');
    } else {
      const { iframe, doc } = await iframeConHtml(contenido, ancho, horizontal ? 794 : 1123);
      iframes.push(iframe);
      const alto = Math.max(doc.documentElement.scrollHeight, doc.body.scrollHeight, 100);
      blob = await html2pdf().set({
        margin: [8, 8, 8, 8],
        image: { type: 'jpeg', quality: 0.92 },
        html2canvas: { scale: escalaSegura(ancho, alto), useCORS: true, backgroundColor: '#ffffff', windowWidth: ancho },
        jsPDF,
        pagebreak: { mode: ['css', 'legacy'], avoid: ['.bloque', '.tarea'] },
      }).from(doc.body).outputPdf('blob');
    }
    const archivo = new File([blob], `${nombre}.pdf`, { type: 'application/pdf' });
    if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
      try {
        await navigator.share({ files: [archivo], title: nombre });
        return true;
      } catch (e) {
        if (e && e.name === 'AbortError') return true; // el usuario cerró el menú de compartir
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
    return true;
  } catch (e) {
    return false;
  } finally {
    iframes.forEach((f) => { if (f.parentNode) f.parentNode.removeChild(f); });
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
    if (await pdfEnNavegador(contenido, nombreArchivo(nombreError), Boolean(opciones.horizontal))) return;
    const ventana = window.open('', '_blank');
    if (!ventana) {
      Alert.alert(
        'No se pudo generar el PDF',
        'Prueba de nuevo. Si sigue fallando, permite las ventanas emergentes para este sitio.'
      );
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

import { Platform, Alert, Linking, Share } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

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

/**
 * Genera un documento (PDF) a partir de HTML y lo comparte.
 * En móvil usamos expo-print + expo-sharing, que crean un PDF de
 * verdad y abren el menú de compartir del sistema. En el navegador,
 * expo-print no genera un archivo real — en vez de eso abrimos una
 * ventana nueva solo con el documento (sin el resto de la app) y
 * lanzamos el diálogo de impresión del propio navegador, donde se
 * puede elegir "Guardar como PDF".
 */
export async function generarDocumento(html, nombreError = 'el documento') {
  if (Platform.OS === 'web') {
    const ventana = window.open('', '_blank');
    if (!ventana) {
      Alert.alert(
        'No se pudo abrir la ventana',
        'El navegador ha bloqueado la ventana emergente. Permítela para este sitio y vuelve a intentarlo.'
      );
      return;
    }
    ventana.document.write(html);
    ventana.document.close();
    // Esperamos un poco a que la ventana termine de pintar antes de imprimir.
    setTimeout(() => ventana.print(), 400);
    return;
  }

  try {
    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri);
    } else {
      Alert.alert('No se puede compartir', 'Este dispositivo no permite compartir archivos.');
    }
  } catch (err) {
    Alert.alert(`No se pudo generar ${nombreError}`, err.message);
  }
}

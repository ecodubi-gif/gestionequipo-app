import { Alert, Platform } from 'react-native';

/**
 * Alert.alert con varios botones no funciona bien en la versión web
 * (a veces no hace nada al pulsar). En web usamos window.confirm, que
 * es lo que el propio navegador sabe mostrar; en Android/iOS seguimos
 * usando el Alert nativo, que ahí sí funciona perfecto.
 */
export function confirmar(titulo, mensaje, onConfirmar, textoConfirmar = 'Confirmar') {
  if (Platform.OS === 'web') {
    if (window.confirm(`${titulo}\n\n${mensaje}`)) {
      onConfirmar();
    }
    return;
  }

  Alert.alert(titulo, mensaje, [
    { text: 'Cancelar', style: 'cancel' },
    { text: textoConfirmar, style: 'destructive', onPress: onConfirmar },
  ]);
}

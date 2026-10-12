import { Alert, Platform } from 'react-native';
import { mostrarDialogo } from './dialogos';

/**
 * Pregunta "¿seguro?" antes de hacer algo. En la web se usa el cuadro propio de la app (window.confirm no se ve
 * en algunos móviles); en Android/iOS, el Alert nativo.
 */
export function confirmar(titulo, mensaje, onConfirmar, textoConfirmar = 'Confirmar') {
  const botones = [
    { text: 'Cancelar', style: 'cancel' },
    { text: textoConfirmar, style: 'destructive', onPress: onConfirmar },
  ];
  if (Platform.OS === 'web') {
    mostrarDialogo(titulo, mensaje, botones);
    return;
  }
  Alert.alert(titulo, mensaje, botones);
}

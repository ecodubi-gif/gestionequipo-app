// Cuadros de aviso y de confirmación propios para la versión web.
// En la web, Alert.alert de React Native no muestra nada y window.confirm no se ve en algunos móviles
// (navegadores incrustados, app instalada), así que los avisos y errores se perdían sin que nadie los viera.
// Aquí se registra un "anfitrión" (components/DialogoHost.js) que los pinta, y se sustituye Alert.alert en la web.
import { Alert, Platform } from 'react-native';

let anfitrion = null;
const cola = [];

export function registrarAnfitrion(fn) {
  anfitrion = fn;
  while (fn && cola.length) fn(cola.shift());
}

// botones: [{ text, style: 'cancel' | 'destructive' | undefined, onPress }]
export function mostrarDialogo(titulo, mensaje, botones) {
  const lista = botones && botones.length ? botones : [{ text: 'Entendido' }];
  const dialogo = { titulo: titulo || '', mensaje: mensaje || '', botones: lista };
  if (anfitrion) anfitrion(dialogo);
  else cola.push(dialogo);
}

// En la web, Alert.alert pasa a mostrar el cuadro propio. En el móvil nativo no se toca.
if (Platform.OS === 'web' && !Alert.__conDialogos) {
  Alert.alert = (titulo, mensaje, botones) => mostrarDialogo(titulo, mensaje, botones);
  Alert.__conDialogos = true;
}

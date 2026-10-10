// En el navegador, Alert.alert de React Native no muestra nada. Por eso los avisos ("No se pudo
// guardar", "Guardado"...) no se veían en la versión web. Esta función los muestra con los cuadros
// del propio navegador. Se instala en App.js solo cuando la app corre en web.
export function alertaWeb(titulo, mensaje, botones, ventana = typeof window !== 'undefined' ? window : null) {
  if (!ventana) return;
  const texto = [titulo, mensaje].filter((t) => t !== undefined && t !== null && t !== '').join('\n\n');

  // Un solo botón (o ninguno): un aviso normal
  if (!botones || botones.length <= 1) {
    ventana.alert(texto);
    if (botones && botones[0] && botones[0].onPress) botones[0].onPress();
    return;
  }

  // Varios botones: se pregunta, y se ejecuta el de aceptar o el de cancelar
  const cancelar = botones.find((b) => b.style === 'cancel');
  const aceptar = botones.find((b) => b !== cancelar) || botones[0];
  if (ventana.confirm(texto)) {
    if (aceptar.onPress) aceptar.onPress();
  } else if (cancelar && cancelar.onPress) {
    cancelar.onPress();
  }
}

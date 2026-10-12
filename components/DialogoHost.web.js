import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { View, StyleSheet } from 'react-native';
import { registrarAnfitrion } from '../data/dialogos';
import DialogoCaja from './DialogoCaja';

// Versión web. Un Modal de React Native se queda DETRÁS de otro Modal que ya esté abierto (la ficha de un jugador,
// por ejemplo), y el aviso no se veía. Aquí se pinta directamente en el <body>, por encima de todo.
export default function DialogoHost() {
  const [pendientes, setPendientes] = useState([]);
  useEffect(() => {
    registrarAnfitrion((d) => setPendientes((p) => [...p, d]));
    return () => registrarAnfitrion(null);
  }, []);
  const actual = pendientes[0];
  const cerrar = (boton) => {
    setPendientes((p) => p.slice(1));
    if (boton && boton.onPress) setTimeout(() => boton.onPress(), 0);
  };
  if (!actual || typeof document === 'undefined') return null;
  return createPortal(
    <View style={styles.fondo}>
      <DialogoCaja dialogo={actual} onBoton={cerrar} />
    </View>,
    document.body
  );
}

const styles = StyleSheet.create({
  fondo: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2147483000,
    backgroundColor: 'rgba(17,24,39,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24,
  },
});

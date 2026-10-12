import React, { useEffect, useState } from 'react';
import { Modal, View, StyleSheet } from 'react-native';
import { registrarAnfitrion } from '../data/dialogos';
import DialogoCaja from './DialogoCaja';

// Pinta los avisos y confirmaciones de data/dialogos.js (versión móvil nativo: un Modal). Se monta una sola vez, en App.js.
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
  return (
    <Modal visible={Boolean(actual)} transparent animationType="fade" onRequestClose={() => cerrar(null)}>
      <View style={styles.fondo}>{actual && <DialogoCaja dialogo={actual} onBoton={cerrar} />}</View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: 'rgba(17,24,39,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
});

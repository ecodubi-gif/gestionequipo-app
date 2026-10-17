import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import SelectorFecha from './SelectorFecha';

const aISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Fecha con calendario (el mismo selector que en entrenos y partidos). valor y onCambiar usan AAAA-MM-DD;
// con opcional, la fecha puede estar vacía ('') y hay un botón para quitarla o ponerla.
export default function CampoFecha({ valor, onCambiar, opcional = false, textoVacio = 'Sin fecha', textoPoner = '＋ Poner fecha' }) {
  if (!valor) {
    return (
      <TouchableOpacity style={styles.vacio} onPress={() => onCambiar(aISO(new Date()))}>
        <Text style={styles.vacioTexto}>{textoVacio} · <Text style={{ fontWeight: '700', color: '#16a34a' }}>{textoPoner}</Text></Text>
      </TouchableOpacity>
    );
  }
  return (
    <View>
      <SelectorFecha valor={new Date(`${valor}T12:00:00`)} onCambiar={(d) => onCambiar(aISO(d))} />
      {opcional && (
        <TouchableOpacity style={styles.quitar} onPress={() => onCambiar('')}>
          <Text style={styles.quitarTexto}>✕ Quitar fecha</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  vacio: { borderWidth: 1, borderColor: '#d1d5db', borderStyle: 'dashed', borderRadius: 10, padding: 13, marginBottom: 18 },
  vacioTexto: { fontSize: 15, color: '#6b7280' },
  quitar: { alignSelf: 'flex-start', marginTop: -10, marginBottom: 14 },
  quitarTexto: { fontSize: 13, color: '#dc2626', fontWeight: '600' },
});

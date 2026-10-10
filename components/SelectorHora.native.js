import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function SelectorHora({ valor, onCambiar }) {
  const [mostrar, setMostrar] = useState(false);
  const fecha = new Date(valor);
  const textoHora = fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  return (
    <>
      <TouchableOpacity style={styles.selector} onPress={() => setMostrar(true)}>
        <Text style={styles.texto}>{textoHora}</Text>
      </TouchableOpacity>
      {mostrar && (
        <DateTimePicker
          value={fecha}
          mode="time"
          display="default"
          onChange={(event, nuevaHora) => {
            setMostrar(false);
            if (nuevaHora) onCambiar(nuevaHora);
          }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  selector: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 18,
  },
  texto: { fontSize: 16, color: '#111827' },
});

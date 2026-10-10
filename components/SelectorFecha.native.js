import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

// Versión para Android/iOS. Metro elige este archivo automáticamente
// en compilaciones nativas gracias al sufijo .native.js.
export default function SelectorFecha({ valor, onCambiar }) {
  const [mostrar, setMostrar] = useState(false);
  const fecha = new Date(valor);
  const textoFecha = fecha.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <>
      <TouchableOpacity style={styles.selector} onPress={() => setMostrar(true)}>
        <Text style={styles.texto}>{textoFecha}</Text>
      </TouchableOpacity>
      {mostrar && (
        <DateTimePicker
          value={fecha}
          mode="date"
          display="default"
          onChange={(event, nuevaFecha) => {
            setMostrar(false);
            if (nuevaFecha) onCambiar(nuevaFecha);
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
  texto: { fontSize: 16, color: '#111827', textTransform: 'capitalize' },
});

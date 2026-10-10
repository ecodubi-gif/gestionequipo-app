import React from 'react';
import { View, StyleSheet } from 'react-native';

export default function SelectorHora({ valor, onCambiar }) {
  const fecha = new Date(valor);
  const hh = String(fecha.getHours()).padStart(2, '0');
  const mm = String(fecha.getMinutes()).padStart(2, '0');
  const valorInput = `${hh}:${mm}`;

  const manejarCambio = (evento) => {
    const [horas, minutos] = evento.target.value.split(':').map(Number);
    if (Number.isNaN(horas) || Number.isNaN(minutos)) return;
    const nueva = new Date(fecha);
    nueva.setHours(horas, minutos);
    onCambiar(nueva);
  };

  return (
    <View style={styles.contenedor}>
      <input type="time" value={valorInput} onChange={manejarCambio} style={estiloInput} />
    </View>
  );
}

const estiloInput = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid #d1d5db',
  borderRadius: 10,
  padding: '13px 14px',
  fontSize: 16,
  color: '#111827',
  fontFamily: 'inherit',
};

const styles = StyleSheet.create({
  contenedor: { marginBottom: 18 },
});

import React from 'react';
import { View, StyleSheet } from 'react-native';

// Versión para navegador. Metro elige este archivo automáticamente al
// compilar para web gracias al sufijo .web.js. Usa el selector de
// fecha nativo del propio navegador (input type="date"), que en
// móvil (Chrome/Safari) ya sale con calendario táctil.
export default function SelectorFecha({ valor, onCambiar }) {
  const fecha = new Date(valor);
  const valorInput = fecha.toISOString().slice(0, 10); // YYYY-MM-DD

  const manejarCambio = (evento) => {
    const [anio, mes, dia] = evento.target.value.split('-').map(Number);
    if (!anio || !mes || !dia) return;
    const nueva = new Date(fecha);
    nueva.setFullYear(anio, mes - 1, dia);
    onCambiar(nueva);
  };

  return (
    <View style={styles.contenedor}>
      <input type="date" value={valorInput} onChange={manejarCambio} style={estiloInput} />
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

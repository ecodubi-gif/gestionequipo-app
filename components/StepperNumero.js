import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

// Un número que se ajusta con botones (sin teclado). pasos: p. ej. [-5, -1, 1, 5]
export default function StepperNumero({ valor, onCambiar, pasos = [-1, 1], min = 0, max = 999, formato, deshabilitado, escala }) {
  const mitad = pasos.filter((p) => p < 0);
  const resto = pasos.filter((p) => p > 0);
  // Con "escala" (lista ordenada de valores) el + y el − saltan al valor siguiente o anterior de la lista.
  const moverEscala = (p) => {
    const lista = escala;
    if (p > 0) onCambiar(lista.find((x) => x > valor) ?? lista[lista.length - 1]);
    else onCambiar([...lista].reverse().find((x) => x < valor) ?? lista[0]);
  };
  const mover = escala ? moverEscala : (p) => onCambiar(Math.min(max, Math.max(min, Math.round((valor + p) * 10) / 10)));
  const boton = (p) => (
    <TouchableOpacity key={p} disabled={deshabilitado} style={[styles.boton, deshabilitado && { opacity: 0.4 }]} onPress={() => mover(p)}>
      <Text style={styles.botonTexto}>{escala ? (p > 0 ? '+' : '−') : p > 0 ? `+${p}` : `−${Math.abs(p)}`}</Text>
    </TouchableOpacity>
  );
  return (
    <View style={styles.fila}>
      {mitad.map(boton)}
      <Text style={styles.valor}>{formato ? formato(valor) : String(valor)}</Text>
      {resto.map(boton)}
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  boton: { minWidth: 42, paddingVertical: 10, borderRadius: 10, backgroundColor: '#f3f4f6', alignItems: 'center' },
  botonTexto: { fontWeight: '800', color: '#374151', fontSize: 13 },
  valor: { minWidth: 64, textAlign: 'center', fontSize: 19, fontWeight: '800', color: '#111827' },
});

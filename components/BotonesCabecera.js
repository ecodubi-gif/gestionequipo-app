import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

// Botón "‹ Atrás" bien visible para la cabecera de todas las pantallas (la flecha pequeña por defecto no se veía).
export function BotonAtras() {
  const navigation = useNavigation();
  if (!navigation.canGoBack()) return null;
  return (
    <TouchableOpacity
      style={styles.atras}
      onPress={() => navigation.goBack()}
      accessibilityRole="button"
      accessibilityLabel="Volver a la pantalla anterior"
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      testID="cabecera-atras"
    >
      <Text style={styles.atrasTexto}>‹ Atrás</Text>
    </TouchableOpacity>
  );
}

// Atajo al panel principal desde cualquier pantalla.
export function BotonInicio() {
  const navigation = useNavigation();
  return (
    <TouchableOpacity
      style={styles.inicio}
      onPress={() => navigation.navigate('Panel')}
      accessibilityRole="button"
      accessibilityLabel="Ir al panel principal"
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      testID="cabecera-inicio"
    >
      <Text style={styles.inicioTexto}>🏠</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  atras: { backgroundColor: '#111827', borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12, marginLeft: 4 },
  atrasTexto: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  inicio: { paddingVertical: 6, paddingHorizontal: 10, marginRight: 4 },
  inicioTexto: { fontSize: 20 },
});

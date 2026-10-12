import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

// La caja del aviso o de la confirmación (la usan la versión nativa y la web de DialogoHost).
export default function DialogoCaja({ dialogo, onBoton }) {
  return (
    <View style={styles.caja} accessibilityRole="alert">
      {!!dialogo.titulo && <Text style={styles.titulo}>{dialogo.titulo}</Text>}
      {!!dialogo.mensaje && (
        <ScrollView style={{ maxHeight: 260 }}>
          <Text style={styles.mensaje}>{dialogo.mensaje}</Text>
        </ScrollView>
      )}
      <View style={styles.botones}>
        {dialogo.botones.map((b, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.boton, b.style === 'destructive' && styles.botonPeligro, b.style === 'cancel' && styles.botonCancelar]}
            onPress={() => onBoton(b)}
            testID={`dialogo-boton-${i}`}
          >
            <Text style={[styles.botonTexto, b.style === 'cancel' && styles.botonCancelarTexto]}>{b.text}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  caja: { width: '100%', maxWidth: 380, backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  titulo: { fontSize: 17, fontWeight: '800', color: '#111827', marginBottom: 8 },
  mensaje: { fontSize: 14, color: '#374151', lineHeight: 20 },
  botones: { marginTop: 18, gap: 8 },
  boton: { backgroundColor: '#16a34a', borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  botonPeligro: { backgroundColor: '#dc2626' },
  botonCancelar: { backgroundColor: '#f3f4f6' },
  botonTexto: { color: '#fff', fontWeight: '800', fontSize: 14 },
  botonCancelarTexto: { color: '#374151' },
});

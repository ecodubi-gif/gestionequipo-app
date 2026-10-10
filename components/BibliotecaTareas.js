import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { OBJETIVOS, formatoTarea, textoDimensiones, formatoDuracion } from '../data/tareas';
import { filtrarBiblioteca } from '../data/biblioteca';

// Ventana con las tareas guardadas: se busca, se filtra por objetivo y al tocar una se añade a la sesión.
export default function BibliotecaTareas({ visible, titulo, items, error, objetivoInicial, puedeBorrar, onElegir, onBorrar, onCerrar }) {
  const [texto, setTexto] = useState('');
  const [objetivo, setObjetivo] = useState(objetivoInicial || null);
  React.useEffect(() => {
    if (visible) {
      setTexto('');
      setObjetivo(objetivoInicial || null);
    }
  }, [visible, objetivoInicial]);

  const lista = items ? filtrarBiblioteca(items, { texto, objetivo }) : [];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCerrar}>
      <View style={styles.fondo}>
        <View style={styles.caja}>
          <View style={styles.cabecera}>
            <TouchableOpacity onPress={onCerrar}><Text style={styles.cerrar}>Cerrar</Text></TouchableOpacity>
            <Text style={styles.titulo} numberOfLines={1}>{titulo}</Text>
            <View style={{ minWidth: 50 }} />
          </View>

          <TextInput style={styles.buscar} value={texto} onChangeText={setTexto} placeholder="Buscar por nombre o descripción" placeholderTextColor="#9ca3af" />
          <View style={styles.chips}>
            <TouchableOpacity style={[styles.chip, !objetivo && styles.chipActivo]} onPress={() => setObjetivo(null)}>
              <Text style={[styles.chipTexto, !objetivo && styles.chipTextoActivo]}>Todas</Text>
            </TouchableOpacity>
            {Object.entries(OBJETIVOS).map(([clave, o]) => (
              <TouchableOpacity key={clave} style={[styles.chip, objetivo === clave && styles.chipActivo]} onPress={() => setObjetivo(objetivo === clave ? null : clave)}>
                <Text style={[styles.chipTexto, objetivo === clave && styles.chipTextoActivo]}>{o.corto}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled">
            {error ? (
              <Text style={styles.vacio}>{error}</Text>
            ) : !items ? (
              <ActivityIndicator color="#7c3aed" style={{ marginVertical: 24 }} />
            ) : lista.length === 0 ? (
              <Text style={styles.vacio}>
                {items.length === 0 ? 'La biblioteca está vacía. Abre una tarea y pulsa "Guardar en la biblioteca".' : 'Ninguna tarea coincide con la búsqueda.'}
              </Text>
            ) : (
              lista.map((t) => (
                <View key={t.id} style={styles.fila}>
                  <TouchableOpacity style={{ flex: 1 }} onPress={() => onElegir(t)} activeOpacity={0.7}>
                    <Text style={styles.nombre} numberOfLines={2}>{t.nombre}</Text>
                    <Text style={styles.formato}>{formatoTarea(t)} · {textoDimensiones(t)}</Text>
                    <View style={styles.pie}>
                      {t.objetivo && OBJETIVOS[t.objetivo] && (
                        <View style={styles.pildora}><Text style={styles.pildoraTexto}>{OBJETIVOS[t.objetivo].corto}</Text></View>
                      )}
                      <Text style={styles.trabajo}>{t.series} × {formatoDuracion(t.duracion_seg)}{t.pausa_seg ? ` · pausa ${t.pausa_seg} s` : ''}</Text>
                    </View>
                  </TouchableOpacity>
                  {puedeBorrar && (
                    <TouchableOpacity style={styles.borrar} onPress={() => onBorrar(t)}>
                      <Text style={styles.borrarTexto}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </ScrollView>
          <Text style={styles.nota}>Toca una tarea para añadirla a la sesión. Después se puede editar y asignar jugadores.</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-start', paddingTop: 40, paddingHorizontal: 12 },
  caja: { backgroundColor: '#fff', borderRadius: 16, padding: 16, maxHeight: '90%' },
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  cerrar: { color: '#6b7280', fontWeight: '700', fontSize: 14, minWidth: 50 },
  titulo: { flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '800', color: '#111827' },
  buscar: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#111827' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 10 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#fff' },
  chipActivo: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  chipTexto: { fontSize: 11, fontWeight: '700', color: '#6b7280' },
  chipTextoActivo: { color: '#fff' },
  vacio: { fontSize: 12, color: '#6b7280', textAlign: 'center', paddingVertical: 24, paddingHorizontal: 12 },
  fila: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#faf5ff', borderRadius: 10, borderWidth: 1, borderColor: '#e9d5ff', padding: 12, marginBottom: 6 },
  nombre: { fontSize: 13, fontWeight: '800', color: '#111827' },
  formato: { fontSize: 12, color: '#6d28d9', fontWeight: '700', marginTop: 3 },
  pie: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  pildora: { backgroundColor: '#ede9fe', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  pildoraTexto: { fontSize: 10, fontWeight: '700', color: '#6d28d9' },
  trabajo: { fontSize: 11, color: '#6b7280' },
  borrar: { paddingHorizontal: 12, paddingVertical: 8 },
  borrarTexto: { color: '#dc2626', fontWeight: '800', fontSize: 14 },
  nota: { fontSize: 10, color: '#9ca3af', marginTop: 10, textAlign: 'center' },
});

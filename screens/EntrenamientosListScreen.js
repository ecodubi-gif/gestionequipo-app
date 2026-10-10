import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import SelectorFecha from '../components/SelectorFecha';
import SelectorHora from '../components/SelectorHora';
import { listarEntrenamientosApi, crearEntrenamientoApi, obtenerUsuario } from '../data/apiClient';
import { formatearFechaCorta } from '../data/fecha';

// Solo entrenador y segundo entrenador crean la sesión (fecha/hora/campo).
// El delegado ya no crea entrenamientos: pasa lista y registra multas
// desde la pantalla de asistencia, en la sesión que haya creado el cuerpo técnico.
const ROLES_GESTION = ['entrenador', 'segundo_entrenador'];
const ROLES_MATERIAL = ['entrenador', 'segundo_entrenador'];

function pad(n) {
  return String(n).padStart(2, '0');
}

export default function EntrenamientosListScreen({ navigation }) {
  const [entrenamientos, setEntrenamientos] = useState([]);
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [modalVisible, setModalVisible] = useState(false);
  const [fechaHora, setFechaHora] = useState(new Date().toISOString());
  const [nombreCampo, setNombreCampo] = useState('');
  const [tipoCampo, setTipoCampo] = useState('Campo entero');
  const [material, setMaterial] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setError('');
    try {
      const [u, lista] = await Promise.all([obtenerUsuario(), listarEntrenamientosApi()]);
      setUsuario(u);
      setEntrenamientos(lista);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los entrenamientos');
    } finally {
      setCargando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  const puedeCrear = usuario && ROLES_GESTION.includes(usuario.role);
  const puedeAnadirMaterial = usuario && ROLES_MATERIAL.includes(usuario.role);

  const abrirModal = () => {
    setFechaHora(new Date().toISOString());
    setNombreCampo('');
    setTipoCampo('Campo entero');
    setMaterial('');
    setModalVisible(true);
  };

  const cambiarFecha = (nuevaFecha) => {
    const actual = new Date(fechaHora);
    nuevaFecha.setHours(actual.getHours(), actual.getMinutes());
    setFechaHora(nuevaFecha.toISOString());
  };

  const cambiarHora = (nuevaHora) => {
    const actual = new Date(fechaHora);
    actual.setHours(nuevaHora.getHours(), nuevaHora.getMinutes());
    setFechaHora(actual.toISOString());
  };

  const crear = async () => {
    if (!nombreCampo.trim()) {
      Alert.alert('Falta el nombre del campo', 'Indica dónde vais a entrenar');
      return;
    }
    setGuardando(true);
    try {
      const d = new Date(fechaHora);
      const entrenamiento = await crearEntrenamientoApi({
        fecha: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
        hora: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
        lugar: `${nombreCampo.trim()} · ${tipoCampo}`,
        material: puedeAnadirMaterial ? material.trim() || null : null,
      });
      setModalVisible(false);
      navigation.navigate('Asistencia', { entrenamientoId: entrenamiento.id });
    } catch (err) {
      Alert.alert('No se pudo crear', err.message);
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <View style={styles.contenedor}>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={entrenamientos}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
        refreshing={cargando}
        onRefresh={cargar}
        ListEmptyComponent={<Text style={styles.vacio}>Todavía no hay entrenamientos registrados</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.tarjeta}
            onPress={() => navigation.navigate('Asistencia', { entrenamientoId: item.id })}
          >
            <Text style={styles.fecha}>{formatearFechaCorta(item.fecha)} · {item.hora?.slice(0, 5)}</Text>
            <Text style={styles.lugar}>🏟️ {item.lugar}</Text>
            {item.material ? <Text style={styles.material}>🎒 {item.material}</Text> : null}
          </TouchableOpacity>
        )}
      />

      {puedeCrear && (
        <TouchableOpacity style={styles.botonNuevo} onPress={abrirModal}>
          <Text style={styles.botonNuevoTexto}>+ Nuevo entrenamiento</Text>
        </TouchableOpacity>
      )}

      <Modal visible={modalVisible} transparent animationType="slide">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.modalFondo}>
          <View style={styles.modalContenido}>
            <Text style={styles.modalTitulo}>Nuevo entrenamiento</Text>

            <Text style={styles.etiqueta}>Fecha</Text>
            <SelectorFecha valor={fechaHora} onCambiar={cambiarFecha} />

            <Text style={styles.etiqueta}>Hora</Text>
            <SelectorHora valor={fechaHora} onCambiar={cambiarHora} />

            <Text style={styles.etiqueta}>Campo</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Campo Municipal, Polideportivo..."
              placeholderTextColor="#9ca3af"
              value={nombreCampo}
              onChangeText={setNombreCampo}
            />
            <View style={[styles.filaChips, { marginTop: 10 }]}>
              <TouchableOpacity style={[styles.chip, tipoCampo === 'Campo entero' && styles.chipActivo]} onPress={() => setTipoCampo('Campo entero')}>
                <Text style={[styles.chipTexto, tipoCampo === 'Campo entero' && styles.chipTextoActivo]}>Campo entero</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.chip, tipoCampo === 'Medio campo' && styles.chipActivo]} onPress={() => setTipoCampo('Medio campo')}>
                <Text style={[styles.chipTexto, tipoCampo === 'Medio campo' && styles.chipTextoActivo]}>Medio campo</Text>
              </TouchableOpacity>
            </View>

            {puedeAnadirMaterial && (
              <>
                <Text style={styles.etiqueta}>Material (opcional)</Text>
                <TextInput
                  style={styles.inputMultilinea}
                  placeholder="Ej: 20 balones, 12 petos, conos..."
                  placeholderTextColor="#9ca3af"
                  value={material}
                  onChangeText={setMaterial}
                  multiline
                  returnKeyType="done"
                  blurOnSubmit
                  onSubmitEditing={Keyboard.dismiss}
                />
              </>
            )}

            <View style={styles.modalBotones}>
              <TouchableOpacity style={styles.botonCancelar} onPress={() => { Keyboard.dismiss(); setModalVisible(false); }}>
                <Text style={styles.botonCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.botonConfirmar} onPress={() => { Keyboard.dismiss(); crear(); }} disabled={guardando}>
                {guardando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botonConfirmarTexto}>Crear</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#f8fafc' },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  error: { color: '#dc2626', textAlign: 'center', marginTop: 12 },
  vacio: { textAlign: 'center', color: '#9ca3af', marginTop: 40 },
  tarjeta: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10 },
  fecha: { fontSize: 15, fontWeight: '700', color: '#111827', textTransform: 'capitalize' },
  lugar: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  material: { fontSize: 12, color: '#2563eb', marginTop: 4 },
  botonNuevo: { position: 'absolute', bottom: 24, right: 20, left: 20, backgroundColor: '#16a34a', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  botonNuevoTexto: { color: '#fff', fontWeight: '700', fontSize: 15 },
  modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContenido: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20 },
  modalTitulo: { fontSize: 17, fontWeight: '700', marginBottom: 16, color: '#111827' },
  etiqueta: { fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 6, marginTop: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  filaChips: { flexDirection: 'row', gap: 10 },
  chip: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db', alignItems: 'center' },
  chipActivo: { backgroundColor: '#111827', borderColor: '#111827' },
  chipTexto: { fontSize: 13, fontWeight: '600', color: '#374151' },
  chipTextoActivo: { color: '#fff' },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827' },
  inputMultilinea: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827', height: 70, textAlignVertical: 'top' },
  modalBotones: { flexDirection: 'row', gap: 10, marginTop: 20 },
  botonCancelar: { flex: 1, paddingVertical: 14, borderRadius: 8, backgroundColor: '#f3f4f6', alignItems: 'center' },
  botonCancelarTexto: { color: '#374151', fontWeight: '600' },
  botonConfirmar: { flex: 1, paddingVertical: 14, borderRadius: 8, backgroundColor: '#16a34a', alignItems: 'center' },
  botonConfirmarTexto: { color: '#fff', fontWeight: '700' },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cambiarPasswordApi } from '../data/apiClient';

export default function CambiarPasswordScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetir, setRepetir] = useState('');
  const [verActual, setVerActual] = useState(false);
  const [verNueva, setVerNueva] = useState(false);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const confirmar = async () => {
    setError('');
    if (!actual || !nueva || !repetir) {
      setError('Rellena los tres campos');
      return;
    }
    if (nueva.length < 6) {
      setError('La contraseña nueva debe tener al menos 6 caracteres');
      return;
    }
    if (nueva !== repetir) {
      setError('Las dos contraseñas nuevas no coinciden');
      return;
    }
    setGuardando(true);
    try {
      await cambiarPasswordApi(actual, nueva);
      navigation.goBack();
    } catch (err) {
      setError(err.message || 'No se pudo cambiar la contraseña');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <View style={styles.fondo}>
      <View style={styles.manchaVerde} />

      <KeyboardAvoidingView style={styles.contenedor} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.volver, { top: insets.top + 10 }]}>
            <Text style={styles.volverTexto}>← Volver</Text>
          </TouchableOpacity>

          <View style={styles.logo}>
            <Text style={styles.logoEmoji}>🔑</Text>
          </View>
          <Text style={styles.titulo}>Cambiar contraseña</Text>
          <Text style={styles.subtitulo}>Elige una contraseña nueva cuando quieras</Text>

          <View style={styles.caja}>
            {error ? (
              <View style={styles.errorBanner}><Text style={styles.errorTexto}>{error}</Text></View>
            ) : null}

            <Campo etiqueta="Contraseña actual" valor={actual} onCambiar={setActual} ver={verActual} onAlternarVer={() => setVerActual((v) => !v)} />
            <Campo etiqueta="Nueva contraseña" valor={nueva} onCambiar={setNueva} ver={verNueva} onAlternarVer={() => setVerNueva((v) => !v)} />
            <Campo etiqueta="Repite la nueva contraseña" valor={repetir} onCambiar={setRepetir} ver={verNueva} onAlternarVer={() => setVerNueva((v) => !v)} />

            <TouchableOpacity style={styles.boton} onPress={confirmar} disabled={guardando} activeOpacity={0.85}>
              {guardando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botonTexto}>Guardar</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Campo({ etiqueta, valor, onCambiar, ver, onAlternarVer }) {
  return (
    <>
      <Text style={styles.etiqueta}>{etiqueta}</Text>
      <View style={styles.inputContenedor}>
        <Text style={styles.inputIcono}>🔒</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor="#9ca3af"
          value={valor}
          onChangeText={onCambiar}
          secureTextEntry={!ver}
        />
        <TouchableOpacity onPress={onAlternarVer} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.inputIconoOjo}>{ver ? '🙈' : '👁️'}</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const VERDE = '#16a34a';

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: '#f8fafc' },
  manchaVerde: { position: 'absolute', width: 380, height: 380, borderRadius: 190, backgroundColor: '#dcfce7', top: -140, right: -120 },
  contenedor: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  volver: { position: 'absolute', left: 4 },
  volverTexto: { color: '#6b7280', fontSize: 13, fontWeight: '600' },
  logo: {
    width: 72, height: 72, borderRadius: 20, backgroundColor: VERDE, alignSelf: 'center',
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
    shadowColor: VERDE, shadowOpacity: 0.3, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 6,
  },
  logoEmoji: { fontSize: 32 },
  titulo: { fontSize: 23, fontWeight: '800', color: '#111827', textAlign: 'center' },
  subtitulo: { fontSize: 13, color: '#6b7280', textAlign: 'center', marginTop: 8, marginBottom: 24 },
  caja: { backgroundColor: '#ffffff', borderRadius: 20, padding: 22, borderWidth: 1, borderColor: '#e5e7eb', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  errorBanner: { backgroundColor: '#fef2f2', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 16, borderWidth: 1, borderColor: '#fecaca' },
  errorTexto: { color: '#dc2626', fontSize: 13, textAlign: 'center' },
  etiqueta: { fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 6, marginTop: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputContenedor: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 14 },
  inputIcono: { fontSize: 15, marginRight: 10 },
  inputIconoOjo: { fontSize: 16, marginLeft: 8, opacity: 0.7 },
  input: { flex: 1, paddingVertical: 13, fontSize: 15, color: '#111827' },
  boton: { backgroundColor: VERDE, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 26, shadowColor: VERDE, shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  botonTexto: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
});

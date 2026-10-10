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
import { solicitarCodigoRecuperacion, restablecerPasswordConCodigo } from '../data/apiClient';

export default function OlvidoPasswordScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [paso, setPaso] = useState(1); // 1: pedir email | 2: código + contraseña nueva
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [nueva, setNueva] = useState('');
  const [verNueva, setVerNueva] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [cargando, setCargando] = useState(false);

  const pedirCodigo = async () => {
    setError('');
    if (!email.trim()) {
      setError('Escribe tu email');
      return;
    }
    setCargando(true);
    try {
      await solicitarCodigoRecuperacion(email.trim());
      setAviso('Si ese email está registrado, te ha llegado un código de 6 dígitos. Revisa también spam.');
      setPaso(2);
    } catch (err) {
      setError(err.message || 'No se pudo enviar el código');
    } finally {
      setCargando(false);
    }
  };

  const restablecer = async () => {
    setError('');
    if (!codigo.trim() || !nueva) {
      setError('Rellena el código y la contraseña nueva');
      return;
    }
    if (nueva.length < 6) {
      setError('La contraseña nueva debe tener al menos 6 caracteres');
      return;
    }
    setCargando(true);
    try {
      await restablecerPasswordConCodigo(email.trim(), codigo.trim(), nueva);
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch (err) {
      setError(err.message || 'No se pudo restablecer la contraseña');
    } finally {
      setCargando(false);
    }
  };

  return (
    <View style={styles.fondo}>
      <View style={styles.circuloGrande} />
      <View style={styles.circuloPequeno} />

      <KeyboardAvoidingView style={styles.contenedor} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.volver, { top: insets.top + 10 }]}>
            <Text style={styles.volverTexto}>← Volver al login</Text>
          </TouchableOpacity>

          <View style={styles.logo}>
            <Text style={styles.logoEmoji}>✉️</Text>
          </View>
          <Text style={styles.titulo}>Recuperar contraseña</Text>
          <Text style={styles.subtitulo}>
            {paso === 1 ? 'Te mandamos un código de 6 dígitos a tu email' : 'Introduce el código que te ha llegado'}
          </Text>

          <View style={styles.caja}>
            {error ? (
              <View style={styles.errorBanner}><Text style={styles.errorTexto}>{error}</Text></View>
            ) : null}
            {aviso ? (
              <View style={styles.avisoBanner}><Text style={styles.avisoTexto}>{aviso}</Text></View>
            ) : null}

            {paso === 1 ? (
              <>
                <Text style={styles.etiqueta}>Email</Text>
                <View style={styles.inputContenedor}>
                  <Text style={styles.inputIcono}>✉️</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="tucorreo@club.com"
                    placeholderTextColor="#9aa3b2"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>
                <TouchableOpacity style={styles.boton} onPress={pedirCodigo} disabled={cargando}>
                  {cargando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botonTexto}>Enviar código</Text>}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.etiqueta}>Código de 6 dígitos</Text>
                <View style={styles.inputContenedor}>
                  <Text style={styles.inputIcono}>🔢</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="123456"
                    placeholderTextColor="#9aa3b2"
                    value={codigo}
                    onChangeText={setCodigo}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>

                <Text style={styles.etiqueta}>Nueva contraseña</Text>
                <View style={styles.inputContenedor}>
                  <Text style={styles.inputIcono}>🔒</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor="#9aa3b2"
                    value={nueva}
                    onChangeText={setNueva}
                    secureTextEntry={!verNueva}
                  />
                  <TouchableOpacity onPress={() => setVerNueva((v) => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={styles.inputIconoOjo}>{verNueva ? '🙈' : '👁️'}</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.boton} onPress={restablecer} disabled={cargando}>
                  {cargando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botonTexto}>Restablecer contraseña</Text>}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setPaso(1)} style={{ marginTop: 14 }}>
                  <Text style={styles.enlaceSecundario}>¿No te ha llegado? Pedir otro código</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const VERDE = '#16a34a';

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: '#f8fafc' },
  circuloGrande: { position: 'absolute', width: 380, height: 380, borderRadius: 190, backgroundColor: '#dcfce7', top: -140, right: -120 },
  circuloPequeno: { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: '#f0fdf4', bottom: -100, left: -80 },
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
  subtitulo: { fontSize: 13, color: '#9ca3af', textAlign: 'center', marginTop: 8, marginBottom: 24, paddingHorizontal: 10 },
  caja: { backgroundColor: '#ffffff', borderRadius: 20, padding: 22, borderWidth: 1, borderColor: '#e5e7eb', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  errorBanner: { backgroundColor: '#fef2f2', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 16, borderWidth: 1, borderColor: '#fecaca' },
  errorTexto: { color: '#dc2626', fontSize: 13, textAlign: 'center' },
  avisoBanner: { backgroundColor: '#eff6ff', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 16, borderWidth: 1, borderColor: '#bfdbfe' },
  avisoTexto: { color: '#2563eb', fontSize: 12, textAlign: 'center', lineHeight: 17 },
  etiqueta: { fontSize: 12, fontWeight: '600', color: '#9ca3af', marginBottom: 6, marginTop: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputContenedor: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 14 },
  inputIcono: { fontSize: 15, marginRight: 10 },
  inputIconoOjo: { fontSize: 16, marginLeft: 8, opacity: 0.7 },
  input: { flex: 1, paddingVertical: 13, fontSize: 15, color: '#111827' },
  boton: { backgroundColor: VERDE, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 26, shadowColor: VERDE, shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  botonTexto: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  enlaceSecundario: { color: '#93c5fd', fontSize: 12, textAlign: 'center', fontWeight: '600' },
});

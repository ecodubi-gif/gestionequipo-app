import React, { useEffect, useRef, useState } from 'react';
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
import { iniciarSesion } from '../data/apiClient';
import { entrarConReintento, describirEnvio } from '../data/login';

export default function LoginScreen({ navigation, route }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [detalleError, setDetalleError] = useState('');
  const enCurso = useRef(false); // evita enviar el acceso dos veces si se pulsa dos veces seguidas
  const emailRef = useRef(null);
  const passRef = useRef(null);

  // En el navegador, el relleno automático de contraseñas puede dejar texto en el campo sin avisar a la app.
  // Por eso, al pulsar Entrar se lee lo que hay realmente escrito en cada campo.
  const leerCampo = (ref, valorDeLaApp) =>
    Platform.OS === 'web' && ref.current && typeof ref.current.value === 'string' ? ref.current.value : valorDeLaApp;

  // Al volver aquí tras cerrar sesión, todo vacío (también lo que el navegador haya podido rellenar).
  useEffect(() => {
    if (!route?.params?.limpiar) return;
    setEmail('');
    setPassword('');
    setError('');
    setDetalleError('');
    setVerPassword(false);
    if (Platform.OS === 'web') {
      if (emailRef.current && 'value' in emailRef.current) emailRef.current.value = '';
      if (passRef.current && 'value' in passRef.current) passRef.current.value = '';
    }
  }, [route?.params?.limpiar]);

  // En Safari de iPhone/iPad, al pulsar Entrar con el teclado abierto el teclado se recoge, la pantalla se mueve
  // y el primer toque se pierde. Allí se actúa al tocar (antes de que la pantalla se mueva); el resto de
  // dispositivos entran al soltar, como siempre.
  const esSafariIOS = Platform.OS === 'web' && typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent || '');

  const entrar = async () => {
    if (enCurso.current) return;
    setError('');
    setDetalleError('');
    const emailEnviado = leerCampo(emailRef, email).trim();
    const passwordEnviada = leerCampo(passRef, password);
    if (!emailEnviado || !passwordEnviada) {
      setError('Rellena email y contraseña');
      return;
    }
    enCurso.current = true;
    setCargando(true);
    try {
      await entrarConReintento(iniciarSesion, emailEnviado, passwordEnviada);
      navigation.reset({ index: 0, routes: [{ name: 'Panel' }] });
    } catch (err) {
      setError(err.message || 'No se pudo iniciar sesión');
      // Qué se envió (sin la contraseña): ayuda a ver si el email lleva algo raro o la contraseña tiene caracteres de más.
      setDetalleError(describirEnvio(emailEnviado, passwordEnviada));
    } finally {
      enCurso.current = false;
      setCargando(false);
    }
  };

  return (
    <View style={styles.fondo}>
      <View style={styles.manchaVerde} />
      <View style={styles.manchaVerdeClara} />

      <KeyboardAvoidingView style={styles.contenedor} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.logo}>
            <Text style={styles.logoEmoji}>⚽</Text>
          </View>
          <Text style={styles.titulo}>Gestión de Equipo</Text>
          <Text style={styles.subtitulo}>Acceso del cuerpo técnico</Text>

          <View style={styles.caja}>
            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorTexto}>{error}</Text>
                {!!detalleError && <Text style={styles.errorDetalle}>{detalleError}</Text>}
              </View>
            ) : null}

            <Text style={styles.etiqueta}>Email</Text>
            <View style={styles.inputContenedor}>
              <Text style={styles.inputIcono}>✉️</Text>
              <TextInput
                style={styles.input}
                placeholder="tucorreo@club.com"
                placeholderTextColor="#9ca3af"
                ref={emailRef}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                autoComplete="username"
                textContentType="username"
                keyboardType="email-address"
                returnKeyType="next"
                onSubmitEditing={() => passRef.current && passRef.current.focus && passRef.current.focus()}
              />
            </View>

            <Text style={styles.etiqueta}>Contraseña</Text>
            <View style={styles.inputContenedor}>
              <Text style={styles.inputIcono}>🔒</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#9ca3af"
                ref={passRef}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!verPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={entrar}
              />
              <TouchableOpacity onPress={() => setVerPassword((v) => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.inputIconoOjo}>{verPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.boton} onPressIn={esSafariIOS ? entrar : undefined} onPress={entrar} disabled={cargando} activeOpacity={0.85}>
              {cargando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botonTexto}>Entrar</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('OlvidoPassword')} style={{ marginTop: 18 }}>
              <Text style={styles.enlaceOlvido}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.pie}>Conectado a tu club en tiempo real</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const VERDE = '#16a34a';

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: '#f8fafc' },
  manchaVerde: {
    position: 'absolute', width: 380, height: 380, borderRadius: 190,
    backgroundColor: '#dcfce7', top: -140, right: -120,
  },
  manchaVerdeClara: {
    position: 'absolute', width: 260, height: 260, borderRadius: 130,
    backgroundColor: '#f0fdf4', bottom: -100, left: -80,
  },
  contenedor: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logo: {
    width: 72, height: 72, borderRadius: 20, backgroundColor: VERDE, alignSelf: 'center',
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
    shadowColor: VERDE, shadowOpacity: 0.3, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 6,
  },
  logoEmoji: { fontSize: 34 },
  titulo: { fontSize: 26, fontWeight: '800', color: '#111827', textAlign: 'center', letterSpacing: 0.3 },
  subtitulo: { fontSize: 13, color: '#6b7280', textAlign: 'center', marginTop: 6, marginBottom: 28 },
  caja: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorDetalle: { color: '#9ca3af', fontSize: 11, marginTop: 4, textAlign: 'center' },
  errorTexto: { color: '#dc2626', fontSize: 13, textAlign: 'center' },
  etiqueta: { fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 6, marginTop: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputContenedor: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 14,
  },
  inputIcono: { fontSize: 15, marginRight: 10 },
  inputIconoOjo: { fontSize: 16, marginLeft: 8, opacity: 0.7 },
  input: { flex: 1, paddingVertical: 13, fontSize: 15, color: '#111827' },
  boton: {
    backgroundColor: VERDE,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 26,
    shadowColor: VERDE,
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  botonTexto: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  pie: { color: '#9ca3af', fontSize: 11, textAlign: 'center', marginTop: 24 },
  enlaceOlvido: { color: '#16a34a', fontSize: 13, textAlign: 'center', fontWeight: '600' },
});

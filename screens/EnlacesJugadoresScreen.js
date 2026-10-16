import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { confirmar } from '../data/confirmar';
import { generarEnlacesJugadoresApi } from '../data/apiClient';
import { compartirWhatsApp } from '../data/compartir';
import { urlJugador, textoEnlace } from '../data/jugadorPublico';

const ORIGEN = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : 'https://app.ecodubi.com';

// Genera y reparte el enlace personal de cada jugador. El código solo se ve en el momento de generarlo.
export default function EnlacesJugadoresScreen() {
  const [lista, setLista] = useState(null);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState('');
  const [copiado, setCopiado] = useState(null);

  const generar = useCallback(() => {
    confirmar('Generar enlaces', 'Se crea un enlace nuevo para cada jugador activo y los anteriores dejan de valer. ¿Seguro?', async () => {
      setTrabajando(true); setError('');
      try { setLista(await generarEnlacesJugadoresApi()); } catch (e) { setError(e.message); } finally { setTrabajando(false); }
    }, 'Generar');
  }, []);

  const renovar = async (j) => {
    setError('');
    try {
      const [nuevo] = await generarEnlacesJugadoresApi(j.jugador_id);
      setLista((l) => l.map((x) => (x.jugador_id === nuevo.jugador_id ? nuevo : x)));
    } catch (e) { setError(e.message); }
  };

  const copiar = async (j) => {
    const url = urlJugador(ORIGEN, j.token);
    try { if (Platform.OS === 'web' && navigator.clipboard) { await navigator.clipboard.writeText(url); setCopiado(j.jugador_id); } } catch { /* sin permiso */ }
  };

  return (
    <ScrollView style={styles.contenedor} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={styles.intro}>Cada jugador recibe un enlace personal para confirmar si va a los entrenos y contestar el cuestionario del día. Mándaselo por WhatsApp una vez; le sirve siempre.</Text>
      <TouchableOpacity style={styles.principal} onPress={generar} disabled={trabajando}>
        <Text style={styles.principalTexto}>{trabajando ? 'Generando…' : lista ? '🔄 Generar de nuevo para todos' : '🔗 Generar enlaces de todos'}</Text>
      </TouchableOpacity>
      {!!error && <Text style={styles.error}>{error}</Text>}
      {trabajando && <ActivityIndicator style={{ marginTop: 12 }} color="#16a34a" />}
      {lista && lista.map((j) => (
        <View key={j.jugador_id} style={styles.tarjeta}>
          <Text style={styles.nombre}>{j.nombre}</Text>
          <View style={styles.fila}>
            <TouchableOpacity style={styles.boton} onPress={() => compartirWhatsApp(textoEnlace(j.nombre, urlJugador(ORIGEN, j.token)))}><Text style={styles.botonTexto}>📲 WhatsApp</Text></TouchableOpacity>
            {Platform.OS === 'web' && <TouchableOpacity style={styles.botonGris} onPress={() => copiar(j)}><Text style={styles.botonGrisTexto}>{copiado === j.jugador_id ? 'Copiado ✔' : 'Copiar'}</Text></TouchableOpacity>}
            <TouchableOpacity style={styles.botonGris} onPress={() => renovar(j)}><Text style={styles.botonGrisTexto}>Renovar</Text></TouchableOpacity>
          </View>
        </View>
      ))}
      {lista && <Text style={styles.nota}>Estos enlaces solo se ven ahora. Si sales de esta pantalla, tendrás que generarlos otra vez (los anteriores dejan de valer).</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#f8fafc' },
  intro: { fontSize: 13, color: '#4b5563', marginBottom: 12, lineHeight: 19 },
  principal: { backgroundColor: '#16a34a', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 12 },
  principalTexto: { color: '#fff', fontWeight: '800' },
  error: { color: '#dc2626', marginVertical: 8 },
  tarjeta: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1.5, borderColor: '#e5e7eb' },
  nombre: { fontSize: 15, fontWeight: '800', color: '#111827' },
  fila: { flexDirection: 'row', gap: 8, marginTop: 8 },
  boton: { backgroundColor: '#dcfce7', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  botonTexto: { color: '#166534', fontWeight: '700', fontSize: 12 },
  botonGris: { backgroundColor: '#f3f4f6', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  botonGrisTexto: { color: '#374151', fontWeight: '700', fontSize: 12 },
  nota: { fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 10 },
});

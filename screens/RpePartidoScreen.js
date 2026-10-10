import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  obtenerUsuario,
  obtenerPartidoApi,
  obtenerConvocatoriaApi,
  listarEventosApi,
  obtenerRpePartidoApi,
  guardarRpePartidoApi,
} from '../data/apiClient';
import { calcularMinutosJugados } from '../data/minutos';
import { cargaPartido } from '../data/carga';
import { formatearFechaCorta } from '../data/fecha';

export default function RpePartidoScreen({ navigation, route }) {
  const { partidoId } = route.params;

  const [usuario, setUsuario] = useState(null);
  const [partido, setPartido] = useState(null);
  const [jugadores, setJugadores] = useState([]); // los que jugaron: { id, nombre, dorsal, minutos }
  const [valores, setValores] = useState({}); // { [jugadorId]: rpe }
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const puedeEditar = usuario?.role === 'preparador_fisico';

  const cargar = useCallback(async () => {
    setError('');
    try {
      const [u, p, conv, evs, guardado] = await Promise.all([
        obtenerUsuario(),
        obtenerPartidoApi(partidoId),
        obtenerConvocatoriaApi(partidoId),
        listarEventosApi(partidoId),
        obtenerRpePartidoApi(partidoId),
      ]);
      setUsuario(u);
      setPartido(p);
      const maxMinuto = evs.reduce((m, e) => Math.max(m, e.minuto || 0), 0);
      const minutoFinal = p.minuto_final ?? Math.max(maxMinuto, 1);
      const dorsalDe = Object.fromEntries(conv.map((c) => [c.jugador.id, c.jugador.dorsal]));
      const jugaron = calcularMinutosJugados(conv, evs, minutoFinal)
        .filter((m) => m.jugo && m.minutosJugados > 0)
        .map((m) => ({ id: m.id, nombre: m.nombre, dorsal: dorsalDe[m.id], minutos: m.minutosJugados }))
        .sort((a, b) => (a.dorsal ?? 999) - (b.dorsal ?? 999));
      setJugadores(jugaron);
      setValores(Object.fromEntries(guardado.map((g) => [g.jugador_id, g.rpe])));
    } catch (err) {
      setError(err.message || 'No se pudo cargar el partido');
    } finally {
      setCargando(false);
    }
  }, [partidoId]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  if (cargando) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.centrado}>
        <Text style={styles.error}>{error}</Text>
        <TouchableOpacity style={styles.botonReintentar} onPress={cargar}>
          <Text style={styles.botonReintentarTexto}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const rellenos = jugadores.filter((j) => valores[j.id] != null).length;
  const completo = jugadores.length > 0 && rellenos === jugadores.length;
  const sinMinutoFinal = partido.minuto_final == null;

  const guardar = async () => {
    setGuardando(true);
    try {
      await guardarRpePartidoApi(partidoId, jugadores.map((j) => ({ jugador_id: j.id, rpe: valores[j.id], minutos: j.minutos })));
      Alert.alert('Guardado', 'El RPE del partido ya está registrado.');
      navigation.goBack();
    } catch (err) {
      Alert.alert('No se pudo guardar', err.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <View style={styles.contenedor}>
      <LinearGradient colors={['#16a34a', '#0d9488']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cabecera}>
        <Text style={styles.cabeceraEmoji}>⚽</Text>
        <Text style={styles.cabeceraTitulo}>RPE del partido</Text>
        <Text style={styles.cabeceraSub}>
          {partido.equipo_local} vs {partido.equipo_visitante} · {formatearFechaCorta(String(partido.fecha).slice(0, 10))}
        </Text>
        <Text style={styles.cabeceraSub}>{rellenos}/{jugadores.length} jugadores</Text>
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingTop: 16, paddingBottom: 40 }}>
        {partido.estado !== 'finalizado' ? (
          <Text style={styles.aviso}>Este partido todavía no ha terminado. El RPE se registra cuando acaba.</Text>
        ) : (
          <>
            {puedeEditar ? (
              <Text style={styles.ayuda}>Los minutos ya están puestos. Marca el RPE (1-10) que te dice cada jugador. Si corriges los minutos del partido, vuelve aquí y guarda otra vez.</Text>
            ) : (
              <Text style={styles.ayuda}>Solo consulta: el RPE lo registra el preparador físico.</Text>
            )}
            {sinMinutoFinal && (
              <Text style={styles.avisoMinutos}>
                Este partido no tiene guardado el minuto final: los minutos se han calculado con el último evento apuntado. Corrígelo en el Resumen del partido y vuelve.
              </Text>
            )}
            {jugadores.length === 0 && <Text style={styles.aviso}>Nadie ha jugado minutos en este partido (¿falta la convocatoria o los titulares?).</Text>}

            {jugadores.map((j) => {
              const valor = valores[j.id];
              return (
                <View key={j.id} style={styles.tarjeta}>
                  <View style={styles.filaCabecera}>
                    <Text style={styles.nombre}>{j.dorsal ? `#${j.dorsal} ` : ''}{j.nombre}</Text>
                    <Text style={styles.minutos}>{j.minutos}'</Text>
                  </View>
                  <View style={styles.filaRpe}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <TouchableOpacity
                        key={n}
                        disabled={!puedeEditar}
                        style={[styles.chip, valor === n && styles.chipActivo]}
                        onPress={() => setValores((v) => ({ ...v, [j.id]: n }))}
                      >
                        <Text style={[styles.chipTexto, valor === n && styles.chipTextoActivo]}>{n}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {valor != null && <Text style={styles.carga}>Carga: {valor} × {j.minutos} = {cargaPartido(valor, j.minutos)}</Text>}
                </View>
              );
            })}

            {puedeEditar && (
              <TouchableOpacity style={[styles.botonGuardar, (!completo || guardando) && styles.botonDeshabilitado]} onPress={guardar} disabled={!completo || guardando}>
                {guardando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botonGuardarTexto}>Guardar RPE del partido</Text>}
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#f8fafc' },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', padding: 24 },
  error: { color: '#dc2626', textAlign: 'center', marginBottom: 14 },
  botonReintentar: { backgroundColor: '#16a34a', borderRadius: 10, paddingHorizontal: 22, paddingVertical: 12 },
  botonReintentarTexto: { color: '#fff', fontWeight: '700' },
  cabecera: { paddingTop: 28, paddingBottom: 20, paddingHorizontal: 24, alignItems: 'center' },
  cabeceraEmoji: { fontSize: 28, marginBottom: 4 },
  cabeceraTitulo: { color: '#fff', fontSize: 21, fontWeight: '800' },
  cabeceraSub: { color: 'rgba(255,255,255,0.88)', fontSize: 12, marginTop: 3, textAlign: 'center' },
  ayuda: { fontSize: 12, color: '#6b7280', marginBottom: 14 },
  aviso: { fontSize: 13, color: '#6b7280', backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', padding: 14, marginBottom: 12 },
  avisoMinutos: { fontSize: 11, color: '#92400e', backgroundColor: '#fef3c7', borderRadius: 8, padding: 10, marginBottom: 12 },
  tarjeta: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  filaCabecera: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  nombre: { fontSize: 14, fontWeight: '700', color: '#111827', flex: 1 },
  minutos: { fontSize: 13, fontWeight: '800', color: '#2563eb' },
  filaRpe: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center' },
  chipActivo: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  chipTexto: { fontSize: 12, fontWeight: '700', color: '#374151' },
  chipTextoActivo: { color: '#fff' },
  carga: { marginTop: 10, fontSize: 12, color: '#16a34a', fontWeight: '700' },
  botonGuardar: { backgroundColor: '#16a34a', borderRadius: 10, paddingVertical: 16, alignItems: 'center', marginTop: 10 },
  botonDeshabilitado: { backgroundColor: '#9ca3af' },
  botonGuardarTexto: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

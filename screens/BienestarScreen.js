import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { listarBienestarApi, listarJugadoresApi } from '../data/apiClient';
import { resumenBienestar } from '../data/jugadorPublico';
import { formatearFechaCorta } from '../data/fecha';

const nombreDe = (j) => (j ? `${j.apodo || j.nombre} ${j.apodo ? '' : j.apellidos || ''}`.trim() : 'Jugador');

export default function BienestarScreen() {
  const [filas, setFilas] = useState(null);
  const [jug, setJug] = useState({});
  const [error, setError] = useState('');

  useFocusEffect(useCallback(() => {
    Promise.all([listarBienestarApi(7), listarJugadoresApi()])
      .then(([b, j]) => { setFilas(resumenBienestar(b)); setJug(Object.fromEntries(j.map((x) => [x.id, x]))); })
      .catch((e) => setError(e.message || 'No se pudo cargar'));
  }, []));

  if (error) return <Text style={styles.error}>{error}</Text>;
  if (!filas) return <ActivityIndicator style={{ marginTop: 60 }} size="large" color="#16a34a" />;
  const conAlerta = filas.filter((f) => f.alertas.length).length;

  return (
    <ScrollView style={styles.contenedor} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={styles.intro}>Último cuestionario de cada jugador en los últimos 7 días. {filas.length === 0 ? '' : `${conAlerta} con algo a revisar.`}</Text>
      {filas.length === 0 && <Text style={styles.vacio}>Todavía nadie ha contestado. Los jugadores lo hacen desde su enlace personal.</Text>}
      {filas.map((f) => (
        <View key={f.jugador_id} style={[styles.tarjeta, f.alertas.length > 0 && { borderColor: '#f59e0b' }]}>
          <Text style={styles.nombre}>{nombreDe(jug[f.jugador_id])} <Text style={styles.fecha}>· {formatearFechaCorta(f.fecha).slice(0, 5)}</Text></Text>
          <Text style={styles.datos}>Sueño {f.sueno} · Cansancio {f.cansancio} · Dolor {f.dolor} · Ánimo {f.animo}</Text>
          {f.alertas.length > 0 && <Text style={styles.alerta}>⚠️ {f.alertas.join(' · ')}</Text>}
        </View>
      ))}
      <Text style={styles.nota}>Escala de 1 a 5. Los avisos son orientativos: la decisión es del preparador físico. Datos de salud: solo los ven el preparador físico y el delegado.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#f8fafc' },
  intro: { fontSize: 13, color: '#4b5563', marginBottom: 12 },
  vacio: { color: '#9ca3af', textAlign: 'center', marginTop: 20 },
  error: { color: '#dc2626', padding: 20 },
  tarjeta: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1.5, borderColor: '#e5e7eb' },
  nombre: { fontSize: 15, fontWeight: '800', color: '#111827' },
  fecha: { fontSize: 12, fontWeight: '400', color: '#6b7280' },
  datos: { fontSize: 13, color: '#4b5563', marginTop: 3 },
  alerta: { fontSize: 13, color: '#b45309', fontWeight: '700', marginTop: 4 },
  nota: { fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 12 },
});

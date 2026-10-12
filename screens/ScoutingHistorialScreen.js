import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { obtenerHistorialScoutingApi } from '../data/apiClient';
import { cambiosEntre, resumenInforme, jugadoresPorTipo, TIPOS_JUGADOR } from '../data/scouting';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const cuando = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getDate()} ${MESES[d.getMonth()]} · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const MARCA = { nuevo: { s: '+', c: '#15803d' }, cambiado: { s: '~', c: '#b45309' }, quitado: { s: '−', c: '#b91c1c' } };

// Todas las versiones guardadas del informe de un rival, de la más reciente a la más antigua, con lo que cambió en cada una.
export default function ScoutingHistorialScreen({ route }) {
  const equipo = route.params?.equipo || '';
  const [versiones, setVersiones] = useState(null);
  const [error, setError] = useState('');
  const [abierta, setAbierta] = useState(null);

  useEffect(() => {
    (async () => {
      try { setVersiones(await obtenerHistorialScoutingApi(equipo)); } catch (e) { setError(e.message || 'No se pudo cargar el historial'); }
    })();
  }, [equipo]);

  if (error) return <View style={styles.centrado}><Text style={styles.error}>{error}</Text></View>;
  if (!versiones) return <View style={styles.centrado}><ActivityIndicator size="large" color="#7c3aed" /></View>;

  return (
    <ScrollView style={styles.contenedor} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={styles.titulo}>Historial de {equipo}</Text>
      <Text style={styles.mini}>Cada vez que se guarda un cambio queda aquí una versión.</Text>
      {versiones.length === 0 && <Text style={[styles.mini, { marginTop: 16 }]}>Todavía no hay versiones guardadas.</Text>}
      {versiones.map((v, i) => {
        const cambios = cambiosEntre(versiones[i + 1] || null, v);
        const resumen = resumenInforme(v);
        const abierto = abierta === v.id;
        return (
          <View key={v.id} style={styles.tarjeta}>
            <TouchableOpacity onPress={() => setAbierta(abierto ? null : v.id)}>
              <View style={styles.cabecera}>
                <Text style={styles.fecha}>{cuando(v.creado)}{i === 0 ? ' · actual' : ''}</Text>
                <Text style={styles.mini}>{v.editado_por || ''} {abierto ? '▲' : '▼'}</Text>
              </View>
              {cambios.length > 0 ? (
                <View style={{ marginTop: 6 }}>
                  {cambios.slice(0, abierto ? 99 : 4).map((c, k) => (
                    <Text key={k} style={styles.texto}><Text style={{ color: MARCA[c.tipo].c, fontWeight: '900' }}>{MARCA[c.tipo].s} </Text>{c.etiqueta}</Text>
                  ))}
                  {!abierto && cambios.length > 4 && <Text style={styles.mini}>y {cambios.length - 4} más…</Text>}
                </View>
              ) : <Text style={[styles.mini, { marginTop: 6 }]}>Sin cambios en los campos.</Text>}
            </TouchableOpacity>
            {abierto && (
              <View style={styles.completo}>
                <Text style={styles.subtitulo}>Informe en esta versión</Text>
                {resumen.map((s) => (
                  <View key={s.id} style={{ marginTop: 8 }}>
                    <Text style={styles.etiqueta}>{s.icono} {s.titulo}</Text>
                    {s.lineas.map((l) => <Text key={l.id} style={styles.texto}><Text style={{ fontWeight: '700' }}>{l.etiqueta}: </Text>{l.valor}</Text>)}
                  </View>
                ))}
                {TIPOS_JUGADOR.map((tp) => {
                  const js = jugadoresPorTipo(v, tp.id);
                  return js.length === 0 ? null : (
                    <View key={tp.id} style={{ marginTop: 8 }}>
                      <Text style={[styles.etiqueta, { color: tp.color }]}>{tp.etiqueta}</Text>
                      {js.map((j, k) => <Text key={k} style={styles.texto}>{j.dorsal ? `#${j.dorsal} ` : ''}{j.nombre}{j.nota ? ` · ${j.nota}` : ''}</Text>)}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#f3f4f6' },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  error: { color: '#dc2626', textAlign: 'center' },
  titulo: { fontSize: 17, fontWeight: '800', color: '#111827' },
  mini: { fontSize: 11, color: '#6b7280' },
  tarjeta: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginTop: 12 },
  cabecera: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fecha: { fontSize: 14, fontWeight: '800', color: '#111827' },
  texto: { fontSize: 13, color: '#374151', marginTop: 2 },
  etiqueta: { fontSize: 11, fontWeight: '700', color: '#6b7280' },
  subtitulo: { fontSize: 12, fontWeight: '800', color: '#7c3aed' },
  completo: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
});

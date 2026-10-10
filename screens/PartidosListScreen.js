import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { listarPartidosApi, obtenerUsuario } from '../data/apiClient';

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

// "dom 05/10 · 12:00", en la hora del móvil
function textoFechaHora(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${DIAS[d.getDay()]} ${dd}/${mm} · ${d.toTimeString().slice(0, 5)}`;
}

const ROLES_GESTION = ['entrenador', 'segundo_entrenador'];

export default function PartidosListScreen({ navigation, route }) {
  const filtro = route.params?.filtro; // 'pendiente' | 'activo' | undefined (todos)

  const [partidos, setPartidos] = useState([]);
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setError('');
    try {
      const u = await obtenerUsuario();
      setUsuario(u);
      const lista = await listarPartidosApi();
      setPartidos(lista);
    } catch (err) {
      if (err.message?.includes('caducada')) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }
      setError(err.message || 'No se pudieron cargar los partidos');
    } finally {
      setCargando(false);
    }
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  const puedeCrear = usuario && ROLES_GESTION.includes(usuario.role);

  const partidosFiltrados = partidos.filter((p) => {
    // "Prepartido" es la entrada única de entrenador/segundo: tanto para
    // preparar partidos que no han empezado como para volver a uno que
    // ya está en marcha (si cerraron la app a mitad, por ejemplo).
    if (filtro === 'pendiente') return p.estado === 'pendiente' || p.estado === 'en_curso';
    // "Seguimiento en vivo" es solo del delegado: partidos ya en marcha o acabados.
    if (filtro === 'activo') return p.estado === 'en_curso' || p.estado === 'finalizado';
    return true;
  });

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
        data={partidosFiltrados}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
        refreshing={cargando}
        onRefresh={cargar}
        ListEmptyComponent={
          <Text style={styles.vacio}>
            {filtro === 'pendiente' ? 'No hay partidos pendientes' : filtro === 'activo' ? 'No hay partidos en curso ni finalizados' : 'Todavía no hay partidos creados'}
          </Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.tarjeta}
            onPress={() => {
              // Solo si el partido todavía no ha empezado y puedes
              // gestionarlo vas a elegir la convocatoria. Si ya está en
              // marcha (o solo puedes mirar), vas directo al directo,
              // que también tiene su pestaña de Convocatoria (de solo
              // lectura si no puedes editarla).
              if (item.estado === 'pendiente' && puedeCrear) {
                navigation.navigate('Plantilla', { partidoId: item.id });
              } else {
                navigation.navigate('RegistroEventos', { partidoId: item.id });
              }
            }}
          >
            <Text style={styles.equipos}>{item.equipo_local} vs {item.equipo_visitante}</Text>
            <Text style={styles.fechaHora}>{textoFechaHora(item.fecha)}</Text>
            <Text style={styles.detalle}>{item.lugar} · {item.estado}</Text>
            {item.estado === 'pendiente' && puedeCrear && <Text style={styles.pistaConvocatoria}>Toca el partido para elegir o cambiar la convocatoria</Text>}
            <Text style={styles.resultado}>
              {item.goles_local ?? '-'} - {item.goles_visitante ?? '-'}
            </Text>
            {item.estado === 'pendiente' && puedeCrear && (
              <TouchableOpacity style={styles.botonEditar} onPress={() => navigation.navigate('DatosPartido', { partidoId: item.id })}>
                <Text style={styles.botonEditarTexto}>✏️ Editar fecha, hora y campo</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        )}
      />

      {puedeCrear && filtro !== 'activo' && (
        <TouchableOpacity style={styles.botonNuevo} onPress={() => navigation.navigate('DatosPartido')}>
          <Text style={styles.botonNuevoTexto}>+ Nuevo partido</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#f8fafc' },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  error: { color: '#dc2626', textAlign: 'center', marginTop: 12 },
  vacio: { textAlign: 'center', color: '#9ca3af', marginTop: 40 },
  tarjeta: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10 },
  equipos: { fontSize: 15, fontWeight: '700', color: '#111827' },
  fechaHora: { fontSize: 13, fontWeight: '700', color: '#2563eb', marginTop: 4 },
  detalle: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  pistaConvocatoria: { fontSize: 11, color: '#16a34a', fontWeight: '600', marginTop: 4 },
  botonEditar: { marginTop: 10, paddingVertical: 9, borderRadius: 8, backgroundColor: '#eff6ff', alignItems: 'center' },
  botonEditarTexto: { color: '#2563eb', fontSize: 12, fontWeight: '700' },
  resultado: { fontSize: 18, fontWeight: '800', color: '#16a34a', marginTop: 6 },
  botonNuevo: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    left: 20,
    backgroundColor: '#16a34a',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  botonNuevoTexto: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

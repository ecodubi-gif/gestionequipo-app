import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Modal,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { confirmar } from '../data/confirmar';
import { CATEGORIAS_CANTERA, normalizarCantera, etiquetaCantera } from '../data/cantera';
import { GRUPOS_POSICIONES, POSICIONES, textoPosiciones } from '../data/posiciones';
import {
  listarJugadoresApi,
  crearJugadorApi,
  actualizarJugadorApi,
  eliminarJugadorApi,
  obtenerUsuario,
  obtenerNoDisponiblesApi,
} from '../data/apiClient';

// La plantilla del club la gestiona el delegado; entrenador, segundo
// entrenador y preparador físico solo la consultan.
const ROLES_GESTION = ['delegado'];
const PIERNAS = ['Diestro', 'Zurdo', 'Ambidiestro'];

function formVacio() {
  return { id: null, dorsal: '', nombre: '', apellidos: '', apodo: '', posicion: '', posicion_secundaria: '', pierna: '', estado: 'activo', cantera: '' };
}

function SelectorPosicion({ valor, onCambiar, excluida, permitirNinguna }) {
  return (
    <View>
      {permitirNinguna && (
        <TouchableOpacity
          style={[styles.chip, !valor && styles.chipActivo, { alignSelf: 'flex-start', marginBottom: 8 }]}
          onPress={() => onCambiar('')}
        >
          <Text style={[styles.chipTexto, !valor && styles.chipTextoActivo]}>Ninguna</Text>
        </TouchableOpacity>
      )}
      {GRUPOS_POSICIONES.map((g) => (
        <View key={g.linea} style={{ marginBottom: 8 }}>
          <Text style={styles.lineaPosicion}>{g.linea}</Text>
          <View style={styles.filaChips}>
            {g.posiciones.map((p) => {
              const bloqueada = p === excluida;
              return (
                <TouchableOpacity
                  key={p}
                  disabled={bloqueada}
                  style={[styles.chip, valor === p && styles.chipActivo, bloqueada && styles.chipBloqueado]}
                  onPress={() => onCambiar(p)}
                >
                  <Text style={[styles.chipTexto, valor === p && styles.chipTextoActivo, bloqueada && styles.chipTextoBloqueado]}>{p}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

export default function PlantillaClubScreen({ navigation }) {
  const [plantilla, setPlantilla] = useState([]);
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [verArchivados, setVerArchivados] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState(formVacio());
  const [guardando, setGuardando] = useState(false);
  const [noDisponibles, setNoDisponibles] = useState([]);

  const cargar = useCallback(async () => {
    setError('');
    try {
      const [u, lista, nd] = await Promise.all([obtenerUsuario(), listarJugadoresApi(), obtenerNoDisponiblesApi().catch(() => [])]);
      setUsuario(u);
      setNoDisponibles(nd);
      setPlantilla(lista);
    } catch (err) {
      setError(err.message || 'No se pudo cargar la plantilla');
    } finally {
      setCargando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  const puedeGestionar = usuario && ROLES_GESTION.includes(usuario.role);

  const abrirNuevo = () => {
    setForm(formVacio());
    setModalVisible(true);
  };

  const abrirEditar = (jugador) => {
    setForm({
      id: jugador.id,
      dorsal: jugador.dorsal ? String(jugador.dorsal) : '',
      nombre: jugador.nombre || '',
      apellidos: jugador.apellidos || '',
      apodo: jugador.apodo || '',
      posicion: jugador.posicion || '',
      posicion_secundaria: jugador.posicion_secundaria || '',
      pierna: jugador.pierna || '',
      estado: jugador.estado || 'activo',
      cantera: normalizarCantera(jugador.cantera) || '',
    });
    setModalVisible(true);
  };

  const guardar = async () => {
    if (!form.nombre.trim() || !form.apellidos.trim()) {
      Alert.alert('Faltan datos', 'Nombre y apellidos son obligatorios');
      return;
    }
    if (!POSICIONES.includes(form.posicion)) {
      Alert.alert('Falta la posición', 'Elige la posición principal de la lista.');
      return;
    }
    setGuardando(true);
    const datos = {
      dorsal: form.dorsal ? Number(form.dorsal) : null,
      nombre: form.nombre.trim(),
      apellidos: form.apellidos.trim(),
      apodo: form.apodo.trim() || null,
      posicion: form.posicion,
      posicion_secundaria: form.posicion_secundaria || null,
      pierna: form.pierna || null,
      estado: form.estado || null,
      cantera: normalizarCantera(form.cantera),
    };
    try {
      if (form.id) {
        await actualizarJugadorApi(form.id, datos);
      } else {
        await crearJugadorApi(datos);
      }
      setModalVisible(false);
      cargar();
    } catch (err) {
      Alert.alert('No se pudo guardar', err.message);
    } finally {
      setGuardando(false);
    }
  };

  const borrar = () => {
    confirmar(
      'Eliminar jugador',
      `¿Seguro que quieres quitar a ${form.nombre} ${form.apellidos} de la plantilla?`,
      async () => {
        setGuardando(true);
        try {
          await eliminarJugadorApi(form.id);
          setModalVisible(false);
          cargar();
        } catch (err) {
          Alert.alert('No se pudo eliminar', `${err.message}\n\nSi el jugador ya tiene partidos, entrenos o RPE guardados, no se puede borrar sin perder el historial: cámbiale el estado a "baja" y dejará de salir.`);
        } finally {
          setGuardando(false);
        }
      },
      'Eliminar'
    );
  };

  // Los jugadores dados de baja (el equipo anterior, por ejemplo) no salen salvo que se pidan; por dorsal.
  const archivados = plantilla.filter((j) => j.estado === 'baja');
  const visibles = (verArchivados ? plantilla : plantilla.filter((j) => j.estado !== 'baja'))
    .slice()
    .sort((a, b) => (a.dorsal ?? 999) - (b.dorsal ?? 999) || String(a.apellidos).localeCompare(String(b.apellidos)));

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
      {usuario && !puedeGestionar ? (
        <Text style={{ fontSize: 12, color: '#6b7280', textAlign: 'center', paddingTop: 10, paddingHorizontal: 16 }}>
          Solo se consulta: la plantilla la edita el delegado.
        </Text>
      ) : null}

      {usuario && ['delegado', 'entrenador', 'segundo_entrenador'].includes(usuario.role) && navigation && (
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12 }}>
          <TouchableOpacity style={styles.atajo} onPress={() => navigation.navigate('Enlaces')}><Text style={styles.atajoTexto}>🔗 Enlaces de jugadores</Text></TouchableOpacity>
          <TouchableOpacity style={styles.atajo} onPress={() => navigation.navigate('Multas')}><Text style={styles.atajoTexto}>💶 Multas</Text></TouchableOpacity>
          <TouchableOpacity style={styles.atajo} onPress={() => navigation.navigate('Tarjetas')}><Text style={styles.atajoTexto}>🟨 Tarjetas</Text></TouchableOpacity>
        </View>
      )}

      <FlatList
        data={visibles}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
        refreshing={cargando}
        onRefresh={cargar}
        ListEmptyComponent={<Text style={styles.vacio}>Todavía no hay jugadores en la plantilla</Text>}
        ListFooterComponent={
          archivados.length > 0 ? (
            <TouchableOpacity onPress={() => setVerArchivados((v) => !v)} style={{ paddingVertical: 14 }}>
              <Text style={{ textAlign: 'center', color: '#2563eb', fontWeight: '700', fontSize: 13 }}>
                {verArchivados ? 'Ocultar los jugadores dados de baja' : `Ver los ${archivados.length} jugadores dados de baja`}
              </Text>
            </TouchableOpacity>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.tarjeta}
            onPress={() => (puedeGestionar ? abrirEditar(item) : null)}
            activeOpacity={puedeGestionar ? 0.7 : 1}
          >
            <View style={styles.dorsalBadge}>
              <Text style={styles.dorsalTexto}>{item.dorsal || '—'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.nombreJugador}>
                {item.nombre} {item.apellidos} {item.apodo ? `"${item.apodo}"` : ''}
              </Text>
              <Text style={styles.detalleJugador}>
                {textoPosiciones(item)} {item.pierna ? `· ${item.pierna}` : ''} {item.estado && item.estado !== 'activo' ? `· ${item.estado}` : ''}
              </Text>
              {!!normalizarCantera(item.cantera) && <Text style={{ fontSize: 12, fontWeight: '700', color: '#15803d', marginTop: 2 }}>{etiquetaCantera(item.cantera)}</Text>}
              {noDisponibles.includes(item.id) && <Text style={{ fontSize: 12, fontWeight: '700', color: '#dc2626', marginTop: 2 }}>🩹 No disponible</Text>}
            </View>
            {puedeGestionar && <Text style={styles.flechaEditar}>✏️</Text>}
          </TouchableOpacity>
        )}
      />

      {puedeGestionar && (
        <TouchableOpacity style={styles.botonNuevo} onPress={abrirNuevo}>
          <Text style={styles.botonNuevoTexto}>+ Nuevo jugador</Text>
        </TouchableOpacity>
      )}

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalFondo}>
          <ScrollView style={styles.modalContenido} contentContainerStyle={{ paddingBottom: 10 }}>
            <Text style={styles.modalTitulo}>{form.id ? 'Editar jugador' : 'Nuevo jugador'}</Text>

            <View style={styles.filaDoble}>
              <View style={{ flex: 1 }}>
                <Text style={styles.etiqueta}>Dorsal</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={form.dorsal}
                  onChangeText={(t) => setForm((f) => ({ ...f, dorsal: t }))}
                />
              </View>
              <View style={{ flex: 2, marginLeft: 10 }}>
                <Text style={styles.etiqueta}>Apodo (opcional)</Text>
                <TextInput style={styles.input} value={form.apodo} onChangeText={(t) => setForm((f) => ({ ...f, apodo: t }))} />
              </View>
            </View>

            <Text style={styles.etiqueta}>Nombre</Text>
            <TextInput style={styles.input} value={form.nombre} onChangeText={(t) => setForm((f) => ({ ...f, nombre: t }))} />

            <Text style={styles.etiqueta}>Apellidos</Text>
            <TextInput style={styles.input} value={form.apellidos} onChangeText={(t) => setForm((f) => ({ ...f, apellidos: t }))} />

            <Text style={styles.etiqueta}>Posición principal</Text>
            <SelectorPosicion
              valor={form.posicion}
              onCambiar={(p) => setForm((f) => ({ ...f, posicion: p, posicion_secundaria: f.posicion_secundaria === p ? '' : f.posicion_secundaria }))}
            />

            <Text style={styles.etiqueta}>Segunda posición (opcional)</Text>
            <SelectorPosicion
              valor={form.posicion_secundaria}
              excluida={form.posicion}
              permitirNinguna
              onCambiar={(p) => setForm((f) => ({ ...f, posicion_secundaria: p }))}
            />

            <Text style={styles.etiqueta}>Pierna</Text>
            <View style={styles.filaChips}>
              {PIERNAS.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.chip, form.pierna === p && styles.chipActivo]}
                  onPress={() => setForm((f) => ({ ...f, pierna: p }))}
                >
                  <Text style={[styles.chipTexto, form.pierna === p && styles.chipTextoActivo]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.etiqueta}>Procede de la cantera</Text>
            <View style={styles.filaChips}>
              <TouchableOpacity style={[styles.chip, !form.cantera && styles.chipActivo]} onPress={() => setForm((f) => ({ ...f, cantera: '' }))}>
                <Text style={[styles.chipTexto, !form.cantera && styles.chipTextoActivo]}>No</Text>
              </TouchableOpacity>
              {CATEGORIAS_CANTERA.map((c) => (
                <TouchableOpacity key={c} style={[styles.chip, form.cantera === c && styles.chipActivo]} onPress={() => setForm((f) => ({ ...f, cantera: c }))}>
                  <Text style={[styles.chipTexto, form.cantera === c && styles.chipTextoActivo]}>{c.charAt(0).toUpperCase() + c.slice(1)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.etiqueta}>Estado</Text>
            <View style={styles.filaChips}>
              {['activo', 'lesionado', 'sancionado', 'baja'].map((e) => (
                <TouchableOpacity
                  key={e}
                  style={[styles.chip, form.estado === e && styles.chipActivo]}
                  onPress={() => setForm((f) => ({ ...f, estado: e }))}
                >
                  <Text style={[styles.chipTexto, form.estado === e && styles.chipTextoActivo]}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalBotones}>
              <TouchableOpacity style={styles.botonCancelar} onPress={() => setModalVisible(false)}>
                <Text style={styles.botonCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.botonConfirmar} onPress={guardar} disabled={guardando}>
                {guardando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botonConfirmarTexto}>Guardar</Text>}
              </TouchableOpacity>
            </View>

            {form.id && (
              <TouchableOpacity style={styles.botonEliminar} onPress={borrar} disabled={guardando}>
                <Text style={styles.botonEliminarTexto}>Eliminar de la plantilla</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  atajo: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  atajoTexto: { fontSize: 12, fontWeight: '700', color: '#374151' },
  lineaPosicion: { fontSize: 10, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  chipBloqueado: { opacity: 0.35 },
  chipTextoBloqueado: { textDecorationLine: 'line-through' },
  contenedor: { flex: 1, backgroundColor: '#f8fafc' },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  error: { color: '#dc2626', textAlign: 'center', marginTop: 12 },
  vacio: { textAlign: 'center', color: '#9ca3af', marginTop: 40 },
  tarjeta: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10 },
  dorsalBadge: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  dorsalTexto: { color: '#fff', fontWeight: '700', fontSize: 13 },
  nombreJugador: { fontSize: 14, fontWeight: '700', color: '#111827' },
  detalleJugador: { fontSize: 12, color: '#6b7280', marginTop: 2, textTransform: 'capitalize' },
  flechaEditar: { fontSize: 15, marginLeft: 8 },
  botonNuevo: { position: 'absolute', bottom: 24, right: 20, left: 20, backgroundColor: '#16a34a', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  botonNuevoTexto: { color: '#fff', fontWeight: '700', fontSize: 15 },
  modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContenido: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, maxHeight: '88%' },
  modalTitulo: { fontSize: 17, fontWeight: '700', marginBottom: 16, color: '#111827' },
  filaDoble: { flexDirection: 'row' },
  etiqueta: { fontSize: 12, fontWeight: '600', color: '#6b7280', marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#111827' },
  filaChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: '#d1d5db' },
  chipActivo: { backgroundColor: '#111827', borderColor: '#111827' },
  chipTexto: { fontSize: 12, fontWeight: '600', color: '#374151', textTransform: 'capitalize' },
  chipTextoActivo: { color: '#fff' },
  modalBotones: { flexDirection: 'row', gap: 10, marginTop: 20 },
  botonCancelar: { flex: 1, paddingVertical: 14, borderRadius: 8, backgroundColor: '#f3f4f6', alignItems: 'center' },
  botonCancelarTexto: { color: '#374151', fontWeight: '600' },
  botonConfirmar: { flex: 1, paddingVertical: 14, borderRadius: 8, backgroundColor: '#16a34a', alignItems: 'center' },
  botonConfirmarTexto: { color: '#fff', fontWeight: '700' },
  botonEliminar: { marginTop: 14, paddingVertical: 12, alignItems: 'center' },
  botonEliminarTexto: { color: '#dc2626', fontWeight: '700', fontSize: 13 },
});

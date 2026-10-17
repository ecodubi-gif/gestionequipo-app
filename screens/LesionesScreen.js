import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { confirmar } from '../data/confirmar';
import { listarJugadoresApi, listarLesionesApi, crearLesionApi, actualizarLesionApi, eliminarLesionApi } from '../data/apiClient';
import CampoFecha from '../components/CampoFecha';
import { estaActiva, diasDeBaja, textoVuelta, diasParaVuelta, activasOrdenadas } from '../data/lesiones';

function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const nombreDe = (j) => (j ? `${j.apodo || j.nombre} ${j.apodo ? '' : j.apellidos || ''}`.trim() : 'Jugador');
const vacio = () => ({ id: null, jugador_id: null, tipo: '', zona: '', fecha_inicio: hoyISO(), fecha_vuelta_estimada: '', fecha_alta: '', nota: '' });

export default function LesionesScreen() {
  const [lesiones, setLesiones] = useState([]);
  const [jugadores, setJugadores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(null);
  const [errorForm, setErrorForm] = useState('');
  const [guardando, setGuardando] = useState(false);
  const hoy = hoyISO();

  const cargar = useCallback(async () => {
    setError('');
    try {
      const [l, j] = await Promise.all([listarLesionesApi(), listarJugadoresApi()]);
      setLesiones(l);
      setJugadores(j.filter((x) => x.estado !== 'baja'));
    } catch (e) {
      setError(e.message || 'No se pudieron cargar las lesiones');
    } finally {
      setCargando(false);
    }
  }, []);
  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const porId = Object.fromEntries(jugadores.map((j) => [j.id, j]));
  const activas = activasOrdenadas(lesiones);
  const pasadas = lesiones.filter((l) => !estaActiva(l)).slice(0, 30);

  const guardar = async () => {
    if (!form.jugador_id) return setErrorForm('Elige el jugador.');
    if (!form.tipo.trim()) return setErrorForm('Pon qué lesión es.');
    const inicio = form.fecha_inicio;
    const fechas = { fecha_inicio: inicio };
    for (const c of ['fecha_vuelta_estimada', 'fecha_alta']) {
      fechas[c] = form[c] || null;
      if (fechas[c] && fechas[c] < inicio) return setErrorForm('Una fecha no puede ser anterior al inicio.');
    }
    const cuerpo = {
      tipo: form.tipo.trim(), zona: form.zona.trim() || null, fecha_inicio: fechas.fecha_inicio,
      fecha_vuelta_estimada: fechas.fecha_vuelta_estimada, fecha_alta: fechas.fecha_alta, nota: form.nota.trim() || null,
    };
    setGuardando(true);
    setErrorForm('');
    try {
      if (form.id) await actualizarLesionApi(form.id, cuerpo);
      else await crearLesionApi({ ...cuerpo, jugador_id: form.jugador_id });
      setForm(null);
      await cargar();
    } catch (e) {
      setErrorForm(e.message || 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  };

  const darAlta = (l) => actualizarLesionApi(l.id, { tipo: l.tipo, fecha_inicio: l.fecha_inicio, fecha_alta: hoy }).then(cargar).catch((e) => setError(e.message));
  const borrar = (l) => confirmar('Borrar lesión', '¿Seguro que quieres borrarla?', async () => {
    try { await eliminarLesionApi(l.id); setForm(null); await cargar(); } catch (e) { setError(e.message); }
  }, 'Borrar');

  const abrir = (l) => setForm({ id: l.id, jugador_id: l.jugador_id, tipo: l.tipo, zona: l.zona || '', fecha_inicio: l.fecha_inicio, fecha_vuelta_estimada: l.fecha_vuelta_estimada || '', fecha_alta: l.fecha_alta || '', nota: l.nota || '' });

  const Fila = ({ l }) => {
    const d = diasParaVuelta(l, hoy);
    const tarde = estaActiva(l) && d != null && d < 0;
    return (
      <TouchableOpacity style={[styles.tarjeta, tarde && { borderColor: '#f59e0b' }]} onPress={() => abrir(l)} activeOpacity={0.85}>
        <Text style={styles.nombre}>{nombreDe(porId[l.jugador_id])}</Text>
        <Text style={styles.detalle}>{l.tipo}{l.zona ? ` · ${l.zona}` : ''}</Text>
        <Text style={[styles.detalle, tarde && { color: '#b45309', fontWeight: '700' }]}>{textoVuelta(l, hoy)} · {diasDeBaja(l, hoy)} días de baja</Text>
        {estaActiva(l) && (
          <TouchableOpacity style={styles.botonAlta} onPress={() => darAlta(l)}><Text style={styles.botonAltaTexto}>Dar de alta hoy</Text></TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  if (cargando) return <ActivityIndicator style={{ marginTop: 60 }} size="large" color="#16a34a" />;

  return (
    <View style={styles.contenedor}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 90 }}>
        {!!error && <Text style={styles.error}>{error}</Text>}
        <Text style={styles.seccion}>Lesionados ahora ({activas.length})</Text>
        {activas.length === 0 && <Text style={styles.vacio}>Nadie lesionado. 🎉</Text>}
        {activas.map((l) => <Fila key={l.id} l={l} />)}
        {pasadas.length > 0 && <Text style={styles.seccion}>Con alta</Text>}
        {pasadas.map((l) => <Fila key={l.id} l={l} />)}
        <Text style={styles.nota}>Son datos de salud: solo los ven el preparador físico y el delegado. El resto del cuerpo técnico solo ve «no disponible».</Text>
      </ScrollView>
      <TouchableOpacity style={styles.fab} onPress={() => { setErrorForm(''); setForm(vacio()); }}>
        <Text style={styles.fabTexto}>＋ Nueva lesión</Text>
      </TouchableOpacity>

      <Modal visible={!!form} animationType="slide" onRequestClose={() => setForm(null)}>
        {form && (
          <ScrollView contentContainerStyle={{ padding: 18, paddingTop: 40 }} keyboardShouldPersistTaps="handled">
            <Text style={styles.titulo}>{form.id ? 'Editar lesión' : 'Nueva lesión'}</Text>
            <Text style={styles.etiqueta}>Jugador</Text>
            <View style={styles.chips}>
              {jugadores.map((j) => (
                <TouchableOpacity key={j.id} disabled={!!form.id} style={[styles.chip, form.jugador_id === j.id && styles.chipActivo]} onPress={() => setForm({ ...form, jugador_id: j.id })}>
                  <Text style={[styles.chipTexto, form.jugador_id === j.id && { color: '#fff' }]}>{nombreDe(j)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {[['tipo', 'Lesión (ej. esguince, sobrecarga)'], ['zona', 'Zona (ej. tobillo derecho)']].map(([c, t]) => (
              <View key={c}>
                <Text style={styles.etiqueta}>{t}</Text>
                <TextInput style={styles.input} value={form[c]} onChangeText={(v) => setForm({ ...form, [c]: v })} autoCapitalize="none" />
              </View>
            ))}
            <Text style={styles.etiqueta}>Desde</Text>
            <CampoFecha valor={form.fecha_inicio} onCambiar={(v) => v && setForm({ ...form, fecha_inicio: v })} />
            <Text style={styles.etiqueta}>Vuelta estimada</Text>
            <CampoFecha valor={form.fecha_vuelta_estimada} opcional textoVacio="Sin fecha de vuelta" onCambiar={(v) => setForm({ ...form, fecha_vuelta_estimada: v })} />
            <Text style={styles.etiqueta}>Alta (déjala sin fecha si sigue lesionado)</Text>
            <CampoFecha valor={form.fecha_alta} opcional textoVacio="Sigue lesionado" textoPoner="＋ Dar de alta" onCambiar={(v) => setForm({ ...form, fecha_alta: v })} />
            <Text style={styles.etiqueta}>Nota</Text>
            <TextInput style={styles.input} value={form.nota} onChangeText={(v) => setForm({ ...form, nota: v })} multiline />
            {!!errorForm && <Text style={styles.error}>{errorForm}</Text>}
            <TouchableOpacity style={styles.guardar} onPress={guardar} disabled={guardando}><Text style={styles.guardarTexto}>{guardando ? 'Guardando…' : 'Guardar'}</Text></TouchableOpacity>
            {!!form.id && <TouchableOpacity style={styles.borrar} onPress={() => borrar(form)}><Text style={styles.borrarTexto}>Borrar lesión</Text></TouchableOpacity>}
            <TouchableOpacity style={styles.cancelar} onPress={() => setForm(null)}><Text style={styles.cancelarTexto}>Cancelar</Text></TouchableOpacity>
          </ScrollView>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#f8fafc' },
  seccion: { fontSize: 12, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', marginTop: 8, marginBottom: 8 },
  vacio: { color: '#9ca3af', marginBottom: 10 },
  tarjeta: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1.5, borderColor: '#e5e7eb' },
  nombre: { fontSize: 15, fontWeight: '800', color: '#111827' },
  detalle: { fontSize: 13, color: '#4b5563', marginTop: 2 },
  botonAlta: { alignSelf: 'flex-start', marginTop: 8, backgroundColor: '#dcfce7', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  botonAltaTexto: { color: '#166534', fontWeight: '700', fontSize: 12 },
  nota: { fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 12 },
  error: { color: '#dc2626', marginVertical: 8, fontSize: 13 },
  fab: { position: 'absolute', right: 16, bottom: 20, backgroundColor: '#16a34a', borderRadius: 999, paddingHorizontal: 18, paddingVertical: 14 },
  fabTexto: { color: '#fff', fontWeight: '800' },
  titulo: { fontSize: 20, fontWeight: '800', marginBottom: 10 },
  etiqueta: { fontSize: 12, fontWeight: '700', color: '#6b7280', marginTop: 12, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 10, fontSize: 15, backgroundColor: '#fff' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#fff' },
  chipActivo: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  chipTexto: { fontSize: 12, color: '#374151' },
  guardar: { backgroundColor: '#16a34a', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 18 },
  guardarTexto: { color: '#fff', fontWeight: '800' },
  borrar: { padding: 12, alignItems: 'center' },
  borrarTexto: { color: '#dc2626', fontWeight: '700' },
  cancelar: { padding: 12, alignItems: 'center' },
  cancelarTexto: { color: '#6b7280' },
});

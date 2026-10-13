import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import StepperNumero from '../components/StepperNumero';
import { obtenerUsuario, listarCamposApi, crearCampoApi, actualizarCampoApi, eliminarCampoApi } from '../data/apiClient';
import { confirmar } from '../data/confirmar';
import { CAMPO_POR_DEFECTO, LIMITES_CAMPO } from '../data/pizarra';

const ROLES_EDITAR = ['entrenador', 'segundo_entrenador'];

// Campos de entrenamiento con sus medidas reales. La pizarra de cada tarea se dibuja dentro de uno de ellos.
export default function CamposScreen() {
  const [usuario, setUsuario] = useState(null);
  const [campos, setCampos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [editando, setEditando] = useState(null); // { id|null, nombre, largo, ancho }
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setError('');
    try {
      const [u, lista] = await Promise.all([obtenerUsuario(), listarCamposApi()]);
      setUsuario(u);
      setCampos(lista);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los campos');
    } finally {
      setCargando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  const puedeEditar = usuario && ROLES_EDITAR.includes(usuario.role);

  const guardar = async () => {
    const nombre = editando.nombre.trim();
    if (!nombre) {
      Alert.alert('Falta el nombre', 'Ponle un nombre al campo, por ejemplo "Campo 1".');
      return;
    }
    setGuardando(true);
    try {
      const datos = { nombre, largo: editando.largo, ancho: editando.ancho };
      if (editando.id) await actualizarCampoApi(editando.id, datos);
      else await crearCampoApi(datos);
      setEditando(null);
      await cargar();
    } catch (err) {
      Alert.alert('No se pudo guardar', err.message);
    } finally {
      setGuardando(false);
    }
  };

  const borrar = (c) => {
    confirmar('Borrar campo', `¿Borrar "${c.nombre}"? Las tareas que lo usaban pasarán a usar el primer campo de la lista.`, async () => {
      try {
        await eliminarCampoApi(c.id);
        await cargar();
      } catch (err) {
        Alert.alert('No se pudo borrar', err.message);
      }
    }, 'Borrar');
  };

  if (cargando) {
    return <View style={styles.centrado}><ActivityIndicator size="large" color="#7c3aed" /></View>;
  }

  return (
    <ScrollView style={styles.fondo} contentContainerStyle={{ padding: 20, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
      <Text style={styles.intro}>
        Da de alta cada campo en el que entrenáis con sus medidas reales. En la pizarra de cada tarea eliges en cuál se hace, y la zona de trabajo se coloca dentro.
      </Text>
      {!!error && <Text style={styles.error}>{error}</Text>}

      {campos.length === 0 && (
        <View style={styles.vacio}>
          <Text style={styles.vacioTexto}>Todavía no hay campos. Mientras tanto se usa un {CAMPO_POR_DEFECTO.nombre} de {CAMPO_POR_DEFECTO.largo} × {CAMPO_POR_DEFECTO.ancho} m.</Text>
        </View>
      )}

      {campos.map((c) => (
        <View key={c.id} style={styles.tarjeta}>
          <View style={{ flex: 1 }}>
            <Text style={styles.nombre}>{c.nombre}</Text>
            <Text style={styles.medidas}>{c.largo} × {c.ancho} m · {(c.largo * c.ancho).toLocaleString('es-ES')} m²</Text>
          </View>
          {puedeEditar && (
            <View style={styles.acciones}>
              <TouchableOpacity style={styles.botonPequeno} onPress={() => setEditando({ id: c.id, nombre: c.nombre, largo: c.largo, ancho: c.ancho })}>
                <Text style={styles.botonPequenoTexto}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.botonPequeno, styles.botonBorrar]} onPress={() => borrar(c)}>
                <Text style={[styles.botonPequenoTexto, { color: '#dc2626' }]}>Borrar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ))}

      {puedeEditar && !editando && (
        <TouchableOpacity
          style={styles.botonNuevo}
          onPress={() => setEditando({ id: null, nombre: '', largo: CAMPO_POR_DEFECTO.largo, ancho: CAMPO_POR_DEFECTO.ancho })}
        >
          <Text style={styles.botonNuevoTexto}>+ Nuevo campo</Text>
        </TouchableOpacity>
      )}
      {!puedeEditar && <Text style={styles.soloConsulta}>Solo consulta: los campos los gestionan el entrenador y el segundo.</Text>}

      {editando && (
        <View style={styles.formulario}>
          <Text style={styles.titulo}>{editando.id ? 'Editar campo' : 'Nuevo campo'}</Text>
          <Text style={styles.etiqueta}>Nombre</Text>
          <TextInput
            style={styles.input}
            value={editando.nombre}
            onChangeText={(t) => setEditando((e) => ({ ...e, nombre: t }))}
            placeholder="Campo 1, Fútbol 7, Medio campo…"
            placeholderTextColor="#9ca3af"
            maxLength={60}
          />
          <Text style={styles.etiqueta}>Largo (lado largo)</Text>
          <StepperNumero valor={editando.largo} pasos={[-5, -1, 1, 5]} min={LIMITES_CAMPO.largo[0]} max={LIMITES_CAMPO.largo[1]} formato={(v) => `${v} m`} onCambiar={(v) => setEditando((e) => ({ ...e, largo: v }))} />
          <Text style={styles.etiqueta}>Ancho</Text>
          <StepperNumero valor={editando.ancho} pasos={[-5, -1, 1, 5]} min={LIMITES_CAMPO.ancho[0]} max={LIMITES_CAMPO.ancho[1]} formato={(v) => `${v} m`} onCambiar={(v) => setEditando((e) => ({ ...e, ancho: v }))} />
          <Text style={styles.nota}>Nuestro campo, el Estadio Juan Benjumea: 100 × 60 m (medio campo: 50 × 60). Fútbol 7: unos 60 × 40 m.</Text>
          <View style={styles.botonesForm}>
            <TouchableOpacity style={styles.botonCancelar} onPress={() => setEditando(null)}>
              <Text style={styles.botonCancelarTexto}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.botonGuardar} onPress={guardar} disabled={guardando}>
              {guardando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botonGuardarTexto}>Guardar</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: '#f8fafc' },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  intro: { fontSize: 13, color: '#4b5563', marginBottom: 14, lineHeight: 19 },
  error: { color: '#dc2626', marginBottom: 10 },
  vacio: { backgroundColor: '#eff6ff', borderRadius: 12, padding: 14, marginBottom: 12 },
  vacioTexto: { color: '#1d4ed8', fontSize: 13 },
  tarjeta: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  nombre: { fontSize: 15, fontWeight: '700', color: '#111827' },
  medidas: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  acciones: { flexDirection: 'row', gap: 8 },
  botonPequeno: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 9, backgroundColor: '#f3f4f6' },
  botonBorrar: { backgroundColor: '#fef2f2' },
  botonPequenoTexto: { fontSize: 12, fontWeight: '700', color: '#374151' },
  botonNuevo: { backgroundColor: '#7c3aed', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 6 },
  botonNuevoTexto: { color: '#fff', fontWeight: '800', fontSize: 14 },
  soloConsulta: { fontSize: 11, color: '#2563eb', backgroundColor: '#eff6ff', borderRadius: 8, padding: 10, textAlign: 'center', marginTop: 8 },
  formulario: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginTop: 14, borderWidth: 1.5, borderColor: '#c4b5fd' },
  titulo: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 4 },
  etiqueta: { fontSize: 12, fontWeight: '700', color: '#6b7280', marginTop: 14, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: '#111827' },
  nota: { fontSize: 11, color: '#9ca3af', marginTop: 10 },
  botonesForm: { flexDirection: 'row', gap: 10, marginTop: 16 },
  botonCancelar: { flex: 1, paddingVertical: 13, borderRadius: 10, backgroundColor: '#f3f4f6', alignItems: 'center' },
  botonCancelarTexto: { color: '#374151', fontWeight: '600' },
  botonGuardar: { flex: 1, paddingVertical: 13, borderRadius: 10, backgroundColor: '#7c3aed', alignItems: 'center' },
  botonGuardarTexto: { color: '#fff', fontWeight: '700' },
});

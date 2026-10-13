import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { guardarScoutingApi } from '../data/apiClient';
import { confirmar } from '../data/confirmar';
import Formacion from '../components/Formacion';
import GolesRival from '../components/GolesRival';
import { hayGoles } from '../data/goles';
import { SECCIONES, TIPOS_JUGADOR, MAX_JUGADORES, limpiarInforme, progreso, lineasFormacion } from '../data/scouting';

const MORADO = '#7c3aed';

// Informe de scouting de un rival (lo rellenan el entrenador y el segundo). Se ve luego en la ficha del próximo rival.
export default function ScoutingScreen({ navigation, route }) {
  const equipo = route.params?.equipo || '';
  const inicial = route.params?.informe;
  const [datos, setDatos] = useState({ ...((inicial && inicial.datos) || {}) });
  const [jugadores, setJugadores] = useState(((inicial && inicial.jugadores) || []).map((j) => ({ ...j })));
  const [abierta, setAbierta] = useState('sistema');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [guardado, setGuardado] = useState(false);

  const cambiar = (id, valor) => { setDatos((d) => ({ ...d, [id]: valor })); setGuardado(false); };
  const elegir = (id, opcion) => cambiar(id, datos[id] === opcion ? '' : opcion);
  const cambiarJugador = (i, campo, valor) => { setJugadores((js) => js.map((j, k) => (k === i ? { ...j, [campo]: valor } : j))); setGuardado(false); };
  const quitarJugador = (i) => { setJugadores((js) => js.filter((_, k) => k !== i)); setGuardado(false); };
  const anadirJugador = () => {
    if (jugadores.length >= MAX_JUGADORES) return;
    setJugadores((js) => [...js, { nombre: '', dorsal: '', tipo: 'clave', nota: '' }]);
    setGuardado(false);
  };

  const p = progreso({ datos, jugadores });

  const guardar = async () => {
    setError('');
    setGuardando(true);
    try {
      await guardarScoutingApi(equipo, limpiarInforme({ datos, jugadores }));
      setGuardado(true);
      navigation.goBack();
    } catch (err) {
      setError(err.message || 'No se pudo guardar el informe');
    } finally {
      setGuardando(false);
    }
  };

  const borrarTodo = () => confirmar('Borrar el informe', `¿Borrar todo el informe de ${equipo}?`, async () => {
    setGuardando(true);
    try {
      await guardarScoutingApi(equipo, { datos: {}, jugadores: [] });
      navigation.goBack();
    } catch (err) {
      setError(err.message || 'No se pudo borrar');
    } finally {
      setGuardando(false);
    }
  }, 'Borrar');

  return (
    <KeyboardAvoidingView style={styles.contenedor} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.titulo}>{equipo}</Text>
        <Text style={styles.mini}>{p.hechos} de {p.total} campos rellenados · todo es opcional</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {SECCIONES.map((s) => {
          const abiertaEsta = abierta === s.id;
          const hechos = s.campos.filter((c) => String(datos[c.id] || '').trim() || (c.tipo === 'goles' && hayGoles(datos))).length;
          return (
            <View key={s.id} style={styles.seccion}>
              <TouchableOpacity style={styles.cabecera} onPress={() => setAbierta(abiertaEsta ? null : s.id)}>
                <Text style={styles.cabeceraTexto}>{s.icono} {s.titulo}</Text>
                <Text style={[styles.contador, hechos > 0 && { color: '#15803d' }]}>{hechos}/{s.campos.length} {abiertaEsta ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {abiertaEsta && (
                <View style={{ padding: 12, gap: 14 }}>
                  {s.campos.map((c) => (
                    <View key={c.id}>
                      {c.grupo ? <Text style={styles.grupo}>{c.grupo}</Text> : null}
                      <Text style={styles.etiqueta}>{c.etiqueta}</Text>
                      {c.ayuda ? <Text style={styles.ayuda}>{c.ayuda}</Text> : null}
                      {c.tipo === 'goles' ? (
                        <>
                          <GolesRival equipo={equipo} datos={datos} onCambiar={cambiar} incrustado />
                          <TextInput
                            style={[styles.input, styles.inputLargo]}
                            multiline
                            value={datos[c.id] || ''}
                            onChangeText={(t) => cambiar(c.id, t)}
                            maxLength={600}
                            placeholder="Comentario (opcional)"
                            placeholderTextColor="#9ca3af"
                            testID={`scout-${c.id}`}
                          />
                        </>
                      ) : c.tipo === 'opciones' ? (
                        <View style={styles.chips}>
                          {c.opciones.map((o) => (
                            <TouchableOpacity key={o} style={[styles.chip, datos[c.id] === o && styles.chipActivo]} onPress={() => elegir(c.id, o)}>
                              <Text style={[styles.chipTexto, datos[c.id] === o && styles.chipTextoActivo]}>{o}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      ) : (
                        <TextInput
                          style={[styles.input, c.tipo === 'largo' && styles.inputLargo]}
                          multiline={c.tipo === 'largo'}
                          value={datos[c.id] || ''}
                          onChangeText={(t) => cambiar(c.id, t)}
                          maxLength={600}
                          placeholderTextColor="#9ca3af"
                          testID={`scout-${c.id}`}
                        />
                      )}
                      {c.formacion && String(datos[c.id] || '').trim() ? (
                        lineasFormacion(datos[c.id])
                          ? <View style={{ alignSelf: 'flex-start', marginTop: 8 }}><Formacion texto={datos[c.id]} ancho={80} /></View>
                          : <Text style={styles.aviso}>No entiendo ese dibujo: escribe las líneas de la defensa al ataque, por ejemplo 1-4-4-2.</Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        <View style={styles.seccion}>
          <View style={styles.cabecera}>
            <Text style={styles.cabeceraTexto}>👤 Jugadores clave, puntos débiles y apercibidos</Text>
            <Text style={styles.contador}>{jugadores.length}</Text>
          </View>
          <View style={{ padding: 12, gap: 12 }}>
            <Text style={styles.ayuda}>Pie dominante, velocidad, desborde, disparo lejano… o dónde sufre (balones al espacio, 1 contra 1, espalda del lateral).</Text>
            {jugadores.map((j, i) => (
              <View key={i} style={styles.jugador}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput style={[styles.input, { width: 56 }]} value={j.dorsal} onChangeText={(t) => cambiarJugador(i, 'dorsal', t.replace(/\D/g, '').slice(0, 3))} placeholder="Nº" keyboardType="number-pad" placeholderTextColor="#9ca3af" />
                  <TextInput style={[styles.input, { flex: 1 }]} value={j.nombre} onChangeText={(t) => cambiarJugador(i, 'nombre', t)} placeholder="Nombre o apodo" placeholderTextColor="#9ca3af" maxLength={60} />
                  <TouchableOpacity style={styles.quitar} onPress={() => quitarJugador(i)}><Text style={{ color: '#dc2626', fontWeight: '800' }}>✕</Text></TouchableOpacity>
                </View>
                <View style={styles.chips}>
                  {TIPOS_JUGADOR.map((tp) => (
                    <TouchableOpacity key={tp.id} style={[styles.chip, j.tipo === tp.id && { backgroundColor: tp.fondo, borderColor: tp.color }]} onPress={() => cambiarJugador(i, 'tipo', tp.id)}>
                      <Text style={[styles.chipTexto, j.tipo === tp.id && { color: tp.color, fontWeight: '800' }]}>{tp.etiqueta}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput style={styles.input} value={j.nota} onChangeText={(t) => cambiarJugador(i, 'nota', t)} placeholder="Qué hay que saber de él" placeholderTextColor="#9ca3af" maxLength={300} />
              </View>
            ))}
            {jugadores.length < MAX_JUGADORES && (
              <TouchableOpacity style={styles.anadir} onPress={anadirJugador} testID="scout-anadir"><Text style={styles.anadirTexto}>+ Añadir jugador</Text></TouchableOpacity>
            )}
          </View>
        </View>

        {inicial && (
          <TouchableOpacity onPress={() => navigation.navigate('ScoutingHistorial', { equipo })} style={{ alignSelf: 'center', marginTop: 16 }}>
            <Text style={{ color: MORADO, fontSize: 12, fontWeight: '700' }}>🕘 Ver el historial de cambios</Text>
          </TouchableOpacity>
        )}
        {inicial && (
          <TouchableOpacity onPress={borrarTodo} style={{ alignSelf: 'center', marginTop: 16 }}>
            <Text style={{ color: '#dc2626', fontSize: 12, fontWeight: '700' }}>Borrar todo el informe</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <View style={styles.barra}>
        <TouchableOpacity style={[styles.guardar, guardando && { opacity: 0.5 }]} disabled={guardando} onPress={guardar} testID="scout-guardar">
          <Text style={styles.guardarTexto}>{guardando ? 'Guardando…' : guardado ? 'Guardado' : 'Guardar informe'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#f3f4f6' },
  titulo: { fontSize: 18, fontWeight: '800', color: '#111827' },
  mini: { fontSize: 11, color: '#6b7280', marginTop: 2, marginBottom: 10 },
  error: { color: '#dc2626', fontSize: 13, marginBottom: 10 },
  seccion: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 10, overflow: 'hidden' },
  cabecera: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, gap: 8 },
  cabeceraTexto: { fontSize: 14, fontWeight: '800', color: '#111827', flex: 1 },
  contador: { fontSize: 12, fontWeight: '700', color: '#6b7280' },
  etiqueta: { fontSize: 12, fontWeight: '700', color: '#374151' },
  grupo: { fontSize: 11, fontWeight: '800', color: MORADO, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4, marginBottom: 8, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: '#ede9fe' },
  aviso: { fontSize: 11, color: '#b45309', marginTop: 4 },
  ayuda: { fontSize: 11, color: '#6b7280', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, color: '#111827', backgroundColor: '#fff', marginTop: 4 },
  inputLargo: { minHeight: 70, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: 'transparent' },
  chipActivo: { backgroundColor: '#ede9fe', borderColor: MORADO },
  chipTexto: { fontSize: 13, color: '#374151' },
  chipTextoActivo: { color: MORADO, fontWeight: '800' },
  jugador: { backgroundColor: '#f9fafb', borderRadius: 10, padding: 10, gap: 4, borderWidth: 1, borderColor: '#e5e7eb' },
  quitar: { width: 40, alignItems: 'center', justifyContent: 'center' },
  anadir: { alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#ede9fe' },
  anadirTexto: { color: MORADO, fontWeight: '800', fontSize: 13 },
  barra: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  guardar: { backgroundColor: MORADO, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  guardarTexto: { color: '#fff', fontWeight: '800', fontSize: 15 },
});

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, TextInput, Keyboard, ActivityIndicator, Alert } from 'react-native';
import { confirmar } from '../data/confirmar';
import { CAMPOS_PERFIL } from '../data/semana';
import { FASES_JUEGO, ASPECTOS_FASE, limpiarPerfil, textosPerfil, perfilVacio, alternarFase, alternarAspecto } from '../data/programaSesion';

const nombreFase = (k) => (FASES_JUEGO.find((f) => f.clave === k) || { etiqueta: k }).etiqueta;

// Perfil del día de una sesión. Las orientaciones de la plantilla (los textos) se conservan; en la sesión se pueden cambiar,
// y además elegir una o varias fases del juego con sus aspectos. Guardar vale solo para esta sesión; los textos también se
// pueden guardar como nueva sugerencia de todos los entrenos de ese tipo.
export default function PerfilDia({ perfil, numeroEntreno, puedeSesion, puedePlantilla, onGuardarSesion, onGuardarPlantilla, onVolver }) {
  const [edicion, setEdicion] = useState(null); // valores en edición
  const [guardando, setGuardando] = useState(false);
  const puedeEditar = puedeSesion || puedePlantilla;
  const v = perfil.valores;

  const cerrar = () => { Keyboard.dismiss(); setEdicion(null); };
  const ejecutar = async (accion) => {
    if (guardando) return;
    setGuardando(true);
    try { await accion(); } catch (err) { Alert.alert('No se pudo guardar', err.message); } finally { setGuardando(false); }
  };
  const guardarSesion = () => ejecutar(async () => { await onGuardarSesion(limpiarPerfil(edicion)); cerrar(); });
  const guardarPlantilla = () => ejecutar(async () => {
    await onGuardarPlantilla(textosPerfil(edicion));
    cerrar();
    Alert.alert('Guardado', `Ya es el perfil de todos los Entreno ${numeroEntreno}.`);
  });
  const volver = () => confirmar('Volver a la sugerencia', `Se descartan los cambios del perfil de esta sesión y vuelve el perfil de los Entreno ${numeroEntreno}.`, () => ejecutar(onVolver), 'Volver');
  const cambiarTexto = (clave, texto) => setEdicion((e) => ({ ...e, [clave]: texto }));

  return (
    <View style={styles.perfil}>
      <TouchableOpacity activeOpacity={0.7} disabled={!puedeEditar} onPress={() => setEdicion(limpiarPerfil(v))} testID="perfil-editar">
        <Text style={styles.titulo}>Perfil del día · Entreno {numeroEntreno}</Text>
        {perfil.propio && <Text style={styles.propio}>✏️ Cambiado solo para esta sesión</Text>}
        {perfilVacio(perfil) && <Text style={styles.linea}>Sin perfil escrito.</Text>}
        {v.fases.length > 0 && (
          <Text style={styles.linea}><Text style={styles.etiqueta}>Fase del juego: </Text>{v.fases.map(nombreFase).join(' · ')}</Text>
        )}
        {v.fases.map((k) => !!(v.aspectos[k] || []).length && (
          <Text key={k} style={styles.linea}><Text style={styles.etiqueta}>{nombreFase(k)}: </Text>{v.aspectos[k].join(', ')}</Text>
        ))}
        {CAMPOS_PERFIL.map((c) => !!v[c.clave] && (
          <Text key={c.clave} style={styles.linea}><Text style={styles.etiqueta}>{c.clave === 'fase' ? 'Orientaciones de la fase' : c.etiqueta}: </Text>{v[c.clave]}</Text>
        ))}
        {puedeEditar && <Text style={styles.pie}>Toca para editar el perfil{puedeSesion ? ' (solo esta sesión)' : ''}</Text>}
      </TouchableOpacity>
      {perfil.propio && puedeSesion && (
        <TouchableOpacity style={styles.volver} onPress={volver}><Text style={styles.volverTexto}>↺ Volver a la sugerencia</Text></TouchableOpacity>
      )}

      <Modal visible={edicion !== null} transparent animationType="fade">
        <View style={styles.fondoModal}>
          <ScrollView style={styles.cajaModal} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 8 }}>
            {edicion && (
              <>
                <View style={styles.cabeceraModal}>
                  <TouchableOpacity onPress={cerrar}><Text style={styles.cancelar}>Cancelar</Text></TouchableOpacity>
                  <Text style={styles.tituloModal} numberOfLines={1}>Perfil del día</Text>
                  <TouchableOpacity onPress={puedeSesion ? guardarSesion : guardarPlantilla} disabled={guardando} testID="perfil-guardar">
                    {guardando ? <ActivityIndicator color="#16a34a" /> : <Text style={styles.guardar}>Guardar</Text>}
                  </TouchableOpacity>
                </View>
                <Text style={styles.notaModal}>{puedeSesion ? 'Guardar cambia solo esta sesión.' : `Se aplica a todos los Entreno ${numeroEntreno}.`}</Text>

                {puedeSesion && (
                  <>
                    <Text style={styles.etiquetaCampo}>Fase del juego (elige una o varias)</Text>
                    <View style={styles.chips}>
                      {FASES_JUEGO.map((f) => {
                        const activa = edicion.fases.includes(f.clave);
                        return (
                          <TouchableOpacity key={f.clave} style={[styles.chip, activa && styles.chipActivo]} onPress={() => setEdicion((e) => alternarFase(e, f.clave))} testID={`fase-${f.clave}`}>
                            <Text style={[styles.chipTexto, activa && styles.chipTextoActivo]}>{f.etiqueta}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    {edicion.fases.map((k) => (
                      <View key={k} style={styles.bloqueFase}>
                        <Text style={styles.tituloFase}>Aspectos · {nombreFase(k)}</Text>
                        <View style={styles.chips}>
                          {ASPECTOS_FASE[k].map((a) => {
                            const activo = (edicion.aspectos[k] || []).includes(a);
                            return (
                              <TouchableOpacity key={a} style={[styles.chipAspecto, activo && styles.chipAspectoActivo]} onPress={() => setEdicion((e) => alternarAspecto(e, k, a))}>
                                <Text style={[styles.chipAspectoTexto, activo && styles.chipTextoActivo]}>{a}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    ))}
                  </>
                )}

                {CAMPOS_PERFIL.map((c) => (
                  <View key={c.clave}>
                    <Text style={styles.etiquetaCampo}>{c.clave === 'fase' ? 'Orientaciones de la fase (propuesta del entreno)' : c.etiqueta}</Text>
                    <TextInput
                      style={[styles.input, c.multilinea && styles.inputMultilinea]}
                      value={edicion[c.clave]}
                      onChangeText={(t) => cambiarTexto(c.clave, t)}
                      multiline={!!c.multilinea}
                      maxLength={c.multilinea ? 1500 : 160}
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                ))}

                {puedeSesion && puedePlantilla && (
                  <TouchableOpacity style={styles.botonPlantilla} onPress={guardarPlantilla} disabled={guardando}>
                    <Text style={styles.botonPlantillaTexto}>Guardar los textos para todos los Entreno {numeroEntreno}</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  perfil: { backgroundColor: '#f5f3ff', borderRadius: 12, borderWidth: 1, borderColor: '#ddd6fe', padding: 14, marginTop: 16 },
  titulo: { fontSize: 13, fontWeight: '800', color: '#5b21b6', marginBottom: 6 },
  propio: { fontSize: 11, fontWeight: '700', color: '#b45309', backgroundColor: '#fef3c7', borderRadius: 8, paddingVertical: 3, paddingHorizontal: 8, alignSelf: 'flex-start', marginBottom: 4 },
  linea: { fontSize: 12, color: '#374151', lineHeight: 18, marginTop: 2 },
  etiqueta: { fontWeight: '700', color: '#6d28d9' },
  pie: { fontSize: 10, color: '#9ca3af', marginTop: 8 },
  volver: { marginTop: 8, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#fff' },
  volverTexto: { fontSize: 12, fontWeight: '700', color: '#374151' },
  fondoModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-start', paddingTop: 40, paddingHorizontal: 12 },
  cajaModal: { backgroundColor: '#fff', borderRadius: 16, padding: 16, maxHeight: '92%' },
  cabeceraModal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cancelar: { color: '#6b7280', fontWeight: '700', fontSize: 15 },
  tituloModal: { flex: 1, textAlign: 'center', fontWeight: '800', fontSize: 16, color: '#111827', marginHorizontal: 8 },
  guardar: { color: '#16a34a', fontWeight: '800', fontSize: 15 },
  notaModal: { fontSize: 12, color: '#6b7280', marginBottom: 6 },
  etiquetaCampo: { fontSize: 12, fontWeight: '700', color: '#6b7280', marginTop: 12, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#fff' },
  chipActivo: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  chipTexto: { fontSize: 13, fontWeight: '700', color: '#374151' },
  chipTextoActivo: { color: '#fff' },
  bloqueFase: { marginTop: 12, backgroundColor: '#faf5ff', borderRadius: 10, borderWidth: 1, borderColor: '#e9d5ff', padding: 10 },
  tituloFase: { fontSize: 12, fontWeight: '800', color: '#6d28d9', marginBottom: 8 },
  chipAspecto: { borderWidth: 1, borderColor: '#d8b4fe', borderRadius: 16, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#fff' },
  chipAspectoActivo: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  chipAspectoTexto: { fontSize: 12, fontWeight: '600', color: '#4b5563' },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 10, fontSize: 14, color: '#111827' },
  inputMultilinea: { minHeight: 80, textAlignVertical: 'top' },
  botonPlantilla: { marginTop: 16, borderWidth: 1, borderColor: '#c4b5fd', borderRadius: 10, paddingVertical: 12, alignItems: 'center', backgroundColor: '#f5f3ff' },
  botonPlantillaTexto: { color: '#6d28d9', fontWeight: '800' },
});

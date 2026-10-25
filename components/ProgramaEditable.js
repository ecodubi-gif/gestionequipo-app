import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, TextInput, Keyboard, ActivityIndicator, Alert } from 'react-native';
import { confirmar } from '../data/confirmar';
import { textoSeries } from '../data/planSesion';
import { CAMPOS_PROG, MAX_ITEMS, LIMITES_RUEDA, minutosRueda, itemVacio, limpiarPrograma, reemplazar, quitar, anadir, mover } from '../data/programaSesion';

const ASPECTO = {
  preventivo: { color: '#7c3aed', borde: '#ddd6fe', palabra: 'ejercicio', plural: 'ejercicios', titulo: 'Ejercicio' },
  movilidad: { color: '#2563eb', borde: '#bfdbfe', palabra: 'tramo', plural: 'tramos', titulo: 'Tramo' },
  rueda: { color: '#ea580c', borde: '#fed7aa', palabra: 'posta', plural: 'postas', titulo: 'Posta' },
};

// Preventivo o movilidad de una sesión: la sugerencia de la plantilla se puede cambiar solo para esta sesión
// (cambiar un ejercicio, quitar, poner otro, reordenar) o volver a ella. El preparador físico además puede
// guardar el cambio como nueva sugerencia de todos los entrenos de ese tipo.
export default function ProgramaEditable({ tipo, lista, propio, puedeEditar, puedePlantilla, numeroEntreno, onGuardarSesion, onGuardarPlantilla, tiempos, onCambiarTiempos }) {
  const [edicion, setEdicion] = useState(null); // { indice (-1 = nuevo), valores }
  const [guardando, setGuardando] = useState(false);
  const campos = CAMPOS_PROG[tipo];
  const { color, borde, palabra, plural, titulo: tituloItem } = ASPECTO[tipo];

  const cerrar = () => { Keyboard.dismiss(); setEdicion(null); };
  const completo = edicion ? campos.every((c) => !c.obligatorio || (edicion.valores[c.clave] || '').trim().length > 0) : false;

  const ejecutar = async (accion) => {
    if (guardando) return;
    setGuardando(true);
    try { await accion(); } catch (err) { Alert.alert('No se pudo guardar', err.message); } finally { setGuardando(false); }
  };

  const nuevaLista = () => (edicion.indice < 0 ? anadir(tipo, lista, edicion.valores) : reemplazar(tipo, lista, edicion.indice, edicion.valores));

  const guardarSesion = () => ejecutar(async () => { await onGuardarSesion(limpiarPrograma(tipo, nuevaLista())); cerrar(); });
  const guardarPlantilla = () => ejecutar(async () => {
    await onGuardarPlantilla(limpiarPrograma(tipo, nuevaLista()));
    cerrar();
    Alert.alert('Guardado', `Ya es la sugerencia de todos los Entreno ${numeroEntreno}.`);
  });

  const cambiarLista = (nueva) => ejecutar(() => onGuardarSesion(limpiarPrograma(tipo, nueva)));
  const volverASugerencia = () => confirmar('Volver a la sugerencia', `Se descartan los cambios de esta sesión y vuelve el programa de los Entreno ${numeroEntreno}.`, () => ejecutar(() => onGuardarSesion(null)), 'Volver');

  return (
    <View>
      {tipo === 'rueda' && tiempos && (
        <View style={styles.tiempos}>
          {[['posta', 'Tiempo por posta', LIMITES_RUEDA.postaMin, LIMITES_RUEDA.postaMax, 'rueda_posta_min'], ['rotacion', 'Rotación entre postas', LIMITES_RUEDA.rotMin, LIMITES_RUEDA.rotMax, 'rueda_rot_min']].map(([k, etiqueta, min, max, clave]) => (
            <View key={k} style={styles.tiempoFila}>
              <Text style={styles.tiempoEtiqueta}>{etiqueta}</Text>
              <TouchableOpacity style={[styles.mas, (!puedeEditar || tiempos[k] <= min) && { opacity: 0.3 }]} disabled={!puedeEditar || tiempos[k] <= min || guardando} onPress={() => ejecutar(() => onCambiarTiempos({ [clave]: tiempos[k] - 1 }))} testID={`rueda-${k}-menos`}><Text style={styles.masTexto}>−</Text></TouchableOpacity>
              <Text style={styles.tiempoValor}>{tiempos[k]}'</Text>
              <TouchableOpacity style={[styles.mas, (!puedeEditar || tiempos[k] >= max) && { opacity: 0.3 }]} disabled={!puedeEditar || tiempos[k] >= max || guardando} onPress={() => ejecutar(() => onCambiarTiempos({ [clave]: tiempos[k] + 1 }))} testID={`rueda-${k}-mas`}><Text style={styles.masTexto}>+</Text></TouchableOpacity>
            </View>
          ))}
          <Text style={styles.tiempoTotal} testID="rueda-total">
            {lista.length > 0 ? `${lista.length} ${lista.length === 1 ? 'posta' : 'postas'} → la rueda dura ${minutosRueda(lista.length, tiempos.posta, tiempos.rotacion)}'` : "Sin postas: la rueda dura 15'"}
          </Text>
        </View>
      )}
      {propio && <Text style={styles.propio}>✏️ Cambiado solo para esta sesión</Text>}
      {lista.length === 0 && <Text style={styles.vacio}>No hay {plural} en esta sesión.</Text>}
      {lista.map((it, i) => (
        <View key={i} style={[styles.fila, { borderColor: borde }]}>
          <TouchableOpacity style={styles.cuerpo} disabled={!puedeEditar} onPress={() => setEdicion({ indice: i, valores: { ...itemVacio(tipo), ...it } })} activeOpacity={0.7}>
            <View style={[styles.marca, { backgroundColor: color }]}><Text style={styles.marcaTexto}>{tipo === 'movilidad' ? it.tiempo : i + 1}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.zona}>{tipo === 'rueda' ? it.titulo : it.zona}</Text>
              {tipo === 'rueda' ? (
                <>
                  <Text style={styles.ejercicio}><Text style={styles.series}>Físico: </Text>{it.fisico}</Text>
                  {!!it.tecnico && <Text style={styles.ejercicio}><Text style={styles.series}>Técnico: </Text>{it.tecnico}</Text>}
                </>
              ) : <Text style={styles.ejercicio}>{tipo === 'preventivo' ? it.ejercicio : it.descripcion}</Text>}
              {tipo === 'preventivo' && textoSeries(it) !== '' && <Text style={styles.series}>{textoSeries(it)}</Text>}
            </View>
          </TouchableOpacity>
          {puedeEditar && (
            <View style={styles.acciones}>
              <TouchableOpacity style={[styles.mini, i === 0 && { opacity: 0.3 }]} disabled={i === 0 || guardando} onPress={() => cambiarLista(mover(lista, i, -1))}><Text style={styles.miniTexto}>▲</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.mini, i === lista.length - 1 && { opacity: 0.3 }]} disabled={i === lista.length - 1 || guardando} onPress={() => cambiarLista(mover(lista, i, 1))}><Text style={styles.miniTexto}>▼</Text></TouchableOpacity>
              <TouchableOpacity style={styles.mini} disabled={guardando} onPress={() => cambiarLista(quitar(lista, i))} testID={`programa-quitar-${i}`}><Text style={styles.miniTexto}>🗑</Text></TouchableOpacity>
            </View>
          )}
        </View>
      ))}

      {puedeEditar && (
        <View style={styles.pie}>
          {lista.length < MAX_ITEMS[tipo] && (
            <TouchableOpacity style={[styles.boton, { borderColor: color }]} onPress={() => setEdicion({ indice: -1, valores: itemVacio(tipo) })} testID={`programa-anadir-${tipo}`}>
              <Text style={[styles.botonTexto, { color }]}>＋ Añadir {palabra}</Text>
            </TouchableOpacity>
          )}
          {propio && (
            <TouchableOpacity style={styles.boton} onPress={volverASugerencia}>
              <Text style={styles.botonTexto}>↺ Volver a la sugerencia</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <Modal visible={edicion !== null} transparent animationType="fade">
        <View style={styles.fondoModal}>
          <ScrollView style={styles.cajaModal} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 8 }}>
            {edicion && (
              <>
                <View style={styles.cabeceraModal}>
                  <TouchableOpacity onPress={cerrar}><Text style={styles.cancelar}>Cancelar</Text></TouchableOpacity>
                  <Text style={styles.tituloModal} numberOfLines={1}>{edicion.indice < 0 ? `Nuevo ${palabra}` : `${tituloItem} ${edicion.indice + 1}`}</Text>
                  <TouchableOpacity onPress={guardarSesion} disabled={!completo || guardando} testID="programa-guardar">
                    {guardando ? <ActivityIndicator color="#16a34a" /> : <Text style={[styles.guardar, !completo && { color: '#9ca3af' }]}>Guardar</Text>}
                  </TouchableOpacity>
                </View>
                <Text style={styles.notaModal}>Se guarda solo para esta sesión.</Text>
                {campos.map((c) => (
                  <View key={c.clave}>
                    <Text style={styles.etiqueta}>{c.etiqueta}</Text>
                    <TextInput
                      style={[styles.input, c.multilinea && styles.inputMultilinea]}
                      value={edicion.valores[c.clave]}
                      onChangeText={(t) => setEdicion((e) => ({ ...e, valores: { ...e.valores, [c.clave]: t } }))}
                      multiline={!!c.multilinea}
                      maxLength={c.multilinea ? 1500 : 160}
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                ))}
                {puedePlantilla && (
                  <TouchableOpacity style={styles.botonPlantilla} onPress={guardarPlantilla} disabled={!completo || guardando}>
                    <Text style={[styles.botonPlantillaTexto, !completo && { color: '#9ca3af' }]}>Guardar para todos los Entreno {numeroEntreno}</Text>
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
  tiempos: { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa', borderRadius: 12, padding: 10, marginBottom: 8 },
  tiempoFila: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  tiempoEtiqueta: { flex: 1, fontSize: 13, fontWeight: '700', color: '#7c2d12' },
  tiempoValor: { minWidth: 38, textAlign: 'center', fontSize: 16, fontWeight: '800', color: '#111827' },
  mas: { width: 36, height: 32, borderRadius: 8, borderWidth: 1, borderColor: '#fdba74', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  masTexto: { fontSize: 18, fontWeight: '800', color: '#c2410c', lineHeight: 20 },
  tiempoTotal: { fontSize: 12, fontWeight: '700', color: '#9a3412' },
  propio: { fontSize: 12, fontWeight: '700', color: '#b45309', backgroundColor: '#fef3c7', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8, alignSelf: 'flex-start', marginBottom: 8 },
  vacio: { fontSize: 12, color: '#6b7280', backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', padding: 14, marginBottom: 8 },
  fila: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, padding: 10, marginBottom: 8 },
  cuerpo: { flex: 1, flexDirection: 'row', alignItems: 'flex-start' },
  marca: { minWidth: 28, height: 28, borderRadius: 14, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', marginRight: 10, marginTop: 2 },
  marcaTexto: { color: '#fff', fontWeight: '800', fontSize: 11 },
  zona: { fontSize: 13, fontWeight: '800', color: '#111827' },
  ejercicio: { fontSize: 13, color: '#374151', marginTop: 2, lineHeight: 18 },
  series: { fontSize: 12, color: '#6b7280', marginTop: 3, fontWeight: '600' },
  acciones: { marginLeft: 6, gap: 4 },
  mini: { width: 32, height: 28, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' },
  miniTexto: { fontSize: 12 },
  pie: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  boton: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingVertical: 9, paddingHorizontal: 12, backgroundColor: '#fff' },
  botonTexto: { fontSize: 13, fontWeight: '700', color: '#374151' },
  fondoModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-start', paddingTop: 40, paddingHorizontal: 12 },
  cajaModal: { backgroundColor: '#fff', borderRadius: 16, padding: 16, maxHeight: '90%' },
  cabeceraModal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cancelar: { color: '#6b7280', fontWeight: '700', fontSize: 15 },
  tituloModal: { flex: 1, textAlign: 'center', fontWeight: '800', fontSize: 16, color: '#111827', marginHorizontal: 8 },
  guardar: { color: '#16a34a', fontWeight: '800', fontSize: 15 },
  notaModal: { fontSize: 12, color: '#6b7280', marginBottom: 6 },
  etiqueta: { fontSize: 12, fontWeight: '700', color: '#6b7280', marginTop: 10, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 10, fontSize: 14, color: '#111827' },
  inputMultilinea: { minHeight: 80, textAlignVertical: 'top' },
  botonPlantilla: { marginTop: 16, borderWidth: 1, borderColor: '#c4b5fd', borderRadius: 10, paddingVertical: 12, alignItems: 'center', backgroundColor: '#f5f3ff' },
  botonPlantillaTexto: { color: '#6d28d9', fontWeight: '800' },
});

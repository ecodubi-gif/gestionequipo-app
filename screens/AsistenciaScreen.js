import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  obtenerEntrenamientoApi,
  listarJugadoresApi,
  obtenerAsistenciasApi,
  listarConfirmacionesApi,
  guardarAsistenciasApi,
  editarMaterialApi,
  obtenerUsuario,
} from '../data/apiClient';
import { compartirWhatsApp, generarDocumento } from '../data/compartir';
import { formatearFechaCorta } from '../data/fecha';
import { TARIFAS } from '../data/multas';
import { previoDeAviso, contarAvisos, textoAviso, textoRecordatorioEntreno } from '../data/jugadorPublico';
import { MOTIVOS_JUSTIFICADA, MAX_DETALLE, parsearMotivo, componerMotivo } from '../data/motivoAsistencia';

// Pasar lista y multas: entrenador, segundo entrenador y delegado.
const ROLES_GESTION = ['entrenador', 'segundo_entrenador', 'delegado'];
// Rellenar el material: entrenador, segundo entrenador y preparador físico.
const ROLES_MATERIAL = ['entrenador', 'segundo_entrenador', 'preparador_fisico'];

// Indicación fija: qué grupo de posiciones es responsable del material
// según el día de la semana de la sesión.
function indicacionDelDia(fechaTexto) {
  const dia = new Date(fechaTexto).getUTCDay(); // 0 domingo ... 6 sábado
  if (dia === 1) return 'Responsables del material: porteros y defensas';
  if (dia === 3) return 'Responsables del material: centrocampistas';
  if (dia === 5) return 'Responsables del material: delanteros';
  return null;
}

const PRESETS = {
  presente: { etiqueta: 'Presente', multa: 0, color: '#16a34a' },
  retraso: { etiqueta: 'Retraso', multa: TARIFAS.retraso.importe, color: '#ca8a04' },
  falta_justificada: { etiqueta: 'Justificada', multa: 0, color: '#6b7280' },
  falta_injustificada: { etiqueta: 'Falta (sin avisar)', multa: TARIFAS.falta.importe, color: '#dc2626' },
};

export default function AsistenciaScreen({ route, navigation }) {
  const { entrenamientoId } = route.params;
  const [entrenamiento, setEntrenamiento] = useState(null);
  const [plantilla, setPlantilla] = useState([]);
  const [registro, setRegistro] = useState({}); // { [jugadorId]: { estado, multa, motivo } }
  const [bocadillo, setBocadillo] = useState(null); // { jugadorId, nombre } mientras se escribe de qué es la lesión
  const [textoBocadillo, setTextoBocadillo] = useState('');
  const [avisos, setAvisos] = useState({}); // lo que han contestado los jugadores desde su enlace
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setError('');
    try {
      const [u, e, jugadores, asistencias, confirmaciones] = await Promise.all([
        obtenerUsuario(),
        obtenerEntrenamientoApi(entrenamientoId),
        listarJugadoresApi(),
        obtenerAsistenciasApi(entrenamientoId),
        listarConfirmacionesApi(entrenamientoId).catch(() => []),
      ]);
      setUsuario(u);
      setEntrenamiento(e);
      setPlantilla(jugadores);

      const nuevoRegistro = {};
      jugadores.forEach((j) => {
        nuevoRegistro[j.id] = { estado: 'presente', multa: 0, motivo: '' };
      });
      asistencias.forEach((a) => {
        nuevoRegistro[a.jugador.id] = { estado: a.estado, multa: a.multa, motivo: a.motivo || '' };
      });
      // Lo que avisaron los jugadores rellena la lista de quien aún no tiene asistencia guardada; el delegado corrige.
      const avisosPorJugador = Object.fromEntries(confirmaciones.map((c) => [c.jugador_id, c]));
      const guardados = new Set(asistencias.map((a) => a.jugador.id));
      jugadores.forEach((j) => {
        const previo = guardados.has(j.id) ? null : previoDeAviso(avisosPorJugador[j.id]);
        if (previo) nuevoRegistro[j.id] = previo;
      });
      setAvisos(avisosPorJugador);
      setRegistro(nuevoRegistro);
    } catch (err) {
      setError(err.message || 'No se pudo cargar');
    } finally {
      setCargando(false);
    }
  }, [entrenamientoId]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  const puedeGestionar = usuario && ROLES_GESTION.includes(usuario.role);

  const marcarEstado = (jugadorId, estado) => {
    const preset = PRESETS[estado];
    setRegistro((prev) => ({
      ...prev,
      [jugadorId]: { estado, multa: preset.multa, motivo: estado === 'presente' ? '' : prev[jugadorId]?.motivo || '' },
    }));
  };

  const cambiarMulta = (jugadorId, texto) => {
    const valor = parseFloat(texto.replace(',', '.')) || 0;
    setRegistro((prev) => ({ ...prev, [jugadorId]: { ...prev[jugadorId], multa: valor } }));
  };

  // Al pulsar un motivo. Con "Lesión" se abre un bocadillo para escribir de qué es (una palabra).
  const pulsarMotivo = (jugador, motivo, pm) => {
    if (motivo !== 'Lesión') {
      cambiarMotivo(jugador.id, motivo);
      return;
    }
    const detalleActual = pm.base === 'Lesión' ? pm.detalle : '';
    cambiarMotivo(jugador.id, componerMotivo('Lesión', detalleActual)); // queda marcada aunque se cierre el bocadillo
    setTextoBocadillo(detalleActual);
    setBocadillo({ jugadorId: jugador.id, nombre: `${jugador.nombre} ${jugador.apellidos || ''}`.trim() });
  };

  const aceptarBocadillo = () => {
    if (bocadillo) cambiarMotivo(bocadillo.jugadorId, componerMotivo('Lesión', textoBocadillo));
    setBocadillo(null);
  };

  const cambiarMotivo = (jugadorId, motivo) => {
    setRegistro((prev) => ({ ...prev, [jugadorId]: { ...prev[jugadorId], motivo } }));
  };

  const totalMultas = Object.values(registro).reduce((suma, r) => suma + (Number(r.multa) || 0), 0);

  const puedeEditarMaterial = usuario && ROLES_MATERIAL.includes(usuario.role);

  const guardar = async () => {
    setGuardando(true);
    try {
      const asistencias = plantilla.map((j) => {
        // El detalle de la lesión se limpia aquí (espacios sobrantes), no mientras se escribe.
        const pm = parsearMotivo(registro[j.id]?.motivo);
        const motivo = pm.base === 'Lesión' ? componerMotivo('Lesión', pm.detalle) : registro[j.id]?.motivo || null;
        return {
          jugador_id: j.id,
          estado: registro[j.id]?.estado || 'presente',
          multa: registro[j.id]?.multa || 0,
          motivo,
        };
      });
      await guardarAsistenciasApi(entrenamientoId, asistencias);
      Alert.alert('Guardado', 'Asistencia registrada correctamente');
    } catch (err) {
      Alert.alert('No se pudo guardar', err.message);
    } finally {
      setGuardando(false);
    }
  };

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
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView style={styles.contenedor} contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Text style={styles.titulo}>{formatearFechaCorta(entrenamiento.fecha)} · {entrenamiento.hora?.slice(0, 5)}</Text>
      <Text style={styles.subtitulo}>🏟️ {entrenamiento.lugar}</Text>

      <TouchableOpacity style={styles.enlacePreparacion} onPress={() => navigation.navigate('EntrenamientoDetalle', { entrenamientoId })}>
        <Text style={styles.enlacePreparacionTexto}>🏋️ Preparación: disponibilidad, plan de la sesión y notas</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.enlaceEntreno} onPress={() => navigation.navigate('EntrenoDirecto', { entrenamientoId })} testID="abrir-entreno-directo">
        <Text style={styles.enlaceEntrenoTexto}>🏃 Entreno: seguir cada tarea en el campo</Text>
      </TouchableOpacity>

      <SeccionMaterial
        entrenamiento={entrenamiento}
        setEntrenamiento={setEntrenamiento}
        puedeEditar={puedeEditarMaterial}
      />

      {Object.keys(avisos).length > 0 && (() => {
        const c = contarAvisos(avisos, plantilla.map((j) => j.id));
        return <Text style={styles.resumenAvisos}>📱 Según los jugadores: {c.voy} van · {c.no_voy} no van · {c.duda} con dudas · {c.sin} sin contestar</Text>;
      })()}
      {!!usuario && ['delegado', 'entrenador', 'segundo_entrenador'].includes(usuario.role) && !!textoRecordatorioEntreno(entrenamiento, plantilla, avisos) && (
        <TouchableOpacity style={styles.botonRecordar} onPress={() => compartirWhatsApp(textoRecordatorioEntreno(entrenamiento, plantilla, avisos))}>
          <Text style={styles.botonRecordarTexto}>💬 Recordar por WhatsApp a quien falta por confirmar</Text>
        </TouchableOpacity>
      )}

      {totalMultas > 0 && (
        <View style={styles.cajaTotal}>
          <Text style={styles.totalTexto}>Total multas de esta sesión: {totalMultas.toFixed(2)} €</Text>
        </View>
      )}

      {plantilla.map((j) => {
        const r = registro[j.id] || { estado: 'presente', multa: 0 };
        const pm = parsearMotivo(r.motivo); // { base, detalle, libre }
        return (
          <View key={j.id} style={styles.tarjetaJugador}>
            <Text style={styles.nombreJugador}>{j.nombre} {j.apellidos}</Text>
            {avisos[j.id] && (
              <Text style={styles.avisoJugador}>📱 Avisó: {textoAviso(avisos[j.id])}</Text>
            )}

            {puedeGestionar ? (
              <>
                <View style={styles.filaBotones}>
                  {Object.entries(PRESETS).map(([clave, preset]) => (
                    <TouchableOpacity
                      key={clave}
                      style={[styles.chipEstado, r.estado === clave && { backgroundColor: preset.color, borderColor: preset.color }]}
                      onPress={() => marcarEstado(j.id, clave)}
                    >
                      <Text style={[styles.chipEstadoTexto, r.estado === clave && styles.chipEstadoTextoActivo]}>{preset.etiqueta}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {r.multa > 0 && (
                  <View style={styles.filaMulta}>
                    <Text style={styles.etiquetaMulta}>Multa (€)</Text>
                    <TextInput
                      style={styles.inputMulta}
                      keyboardType="numeric"
                      value={String(r.multa)}
                      onChangeText={(t) => cambiarMulta(j.id, t)}
                    />
                  </View>
                )}

                {r.estado === 'falta_justificada' && (
                  <View style={styles.bloqueMotivo}>
                    <Text style={styles.etiquetaMulta}>Motivo</Text>
                    <View style={styles.filaBotones}>
                      {MOTIVOS_JUSTIFICADA.map((m) => (
                        <TouchableOpacity
                          key={m}
                          style={[styles.chipMotivo, pm.base === m && styles.chipMotivoActivo]}
                          onPress={() => pulsarMotivo(j, m, pm)}
                        >
                          <Text style={[styles.chipMotivoTexto, pm.base === m && styles.chipMotivoTextoActivo]}>
                            {m === 'Lesión' && pm.base === 'Lesión' && pm.detalle ? `Lesión: ${pm.detalle}` : m}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <TextInput
                      style={styles.inputMotivoLibre}
                      placeholder="Otro motivo (opcional)"
                      placeholderTextColor="#9aa0a6"
                      value={pm.libre}
                      onChangeText={(t) => cambiarMotivo(j.id, t)}
                    />
                  </View>
                )}

                {r.estado === 'falta_injustificada' && (
                  <TextInput
                    style={styles.inputMotivoLibre}
                    placeholder="Nota (opcional)"
                    placeholderTextColor="#9aa0a6"
                    value={r.motivo || ''}
                    onChangeText={(t) => cambiarMotivo(j.id, t)}
                  />
                )}
              </>
            ) : (
              <>
                <Text style={[styles.soloLectura, { color: PRESETS[r.estado]?.color || '#374151' }]}>
                  {PRESETS[r.estado]?.etiqueta} {r.multa > 0 ? `· ${r.multa}€` : ''}
                </Text>
                {r.motivo ? <Text style={styles.motivoSoloLectura}>{r.motivo}</Text> : null}
              </>
            )}
          </View>
        );
      })}

      {plantilla.length === 0 && <Text style={styles.vacio}>No hay jugadores en la plantilla todavía</Text>}

      {puedeGestionar && (
        <TouchableOpacity style={styles.botonGuardar} onPress={guardar} disabled={guardando}>
          {guardando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botonGuardarTexto}>Guardar asistencia</Text>}
        </TouchableOpacity>
      )}
    </ScrollView>

    {/* Bocadillo para escribir de qué es la lesión */}
    <Modal transparent animationType="fade" visible={!!bocadillo} onRequestClose={() => setBocadillo(null)}>
      <TouchableOpacity activeOpacity={1} style={styles.bocadilloFondo} onPress={() => setBocadillo(null)}>
        <TouchableOpacity activeOpacity={1} style={styles.bocadillo} onPress={() => {}}>
          <Text style={styles.bocadilloTitulo}>Lesión de {bocadillo?.nombre}</Text>
          <TextInput
            style={styles.bocadilloInput}
            value={textoBocadillo}
            onChangeText={setTextoBocadillo}
            placeholder="¿De qué? (una palabra)"
            placeholderTextColor="#9aa0a6"
            maxLength={MAX_DETALLE}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={aceptarBocadillo}
          />
          <View style={styles.bocadilloBotones}>
            <TouchableOpacity style={styles.bocadilloCancelar} onPress={() => setBocadillo(null)}>
              <Text style={styles.bocadilloCancelarTexto}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.bocadilloAceptar} onPress={aceptarBocadillo}>
              <Text style={styles.bocadilloAceptarTexto}>Listo</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
    </KeyboardAvoidingView>
  );
}

function SeccionMaterial({ entrenamiento, setEntrenamiento, puedeEditar }) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(entrenamiento.material || '');
  const [guardando, setGuardando] = useState(false);
  const [exportando, setExportando] = useState(false);

  const indicacion = indicacionDelDia(entrenamiento.fecha);

  const guardar = async () => {
    Keyboard.dismiss();
    setGuardando(true);
    try {
      const actualizado = await editarMaterialApi(entrenamiento.id, texto.trim() || null);
      setEntrenamiento(actualizado);
      setEditando(false);
    } catch (err) {
      Alert.alert('No se pudo guardar el material', err.message);
    } finally {
      setGuardando(false);
    }
  };

  const construirTexto = () => {
    let msg = `🎒 Material · ${formatearFechaCorta(entrenamiento.fecha)} ${entrenamiento.hora?.slice(0, 5)}h\n`;
    msg += `🏟️ ${entrenamiento.lugar}\n\n`;
    msg += entrenamiento.material || '(sin material indicado)';
    if (indicacion) msg += `\n\n📌 ${indicacion}`;
    return msg;
  };

  const enviarWhatsApp = () => compartirWhatsApp(construirTexto());

  const exportarPDF = async () => {
    setExportando(true);
    const html = `
      <html>
        <body style="font-family: -apple-system, sans-serif; padding: 24px;">
          <h2>Material del entrenamiento</h2>
          <p><strong>Fecha:</strong> ${formatearFechaCorta(entrenamiento.fecha)} · ${entrenamiento.hora?.slice(0, 5)}h</p>
          <p><strong>Campo:</strong> ${entrenamiento.lugar}</p>
          <h3>Material a llevar</h3>
          <p>${(entrenamiento.material || 'Sin material indicado').replace(/\n/g, '<br/>')}</p>
          ${indicacion ? `<p style="margin-top:20px; color:#2563eb;"><strong>${indicacion}</strong></p>` : ''}
        </body>
      </html>
    `;
    await generarDocumento(html, 'el PDF del material');
    setExportando(false);
  };

  return (
    <View style={styles.cajaMaterial}>
      <View style={styles.filaTituloMaterial}>
        <Text style={styles.tituloMaterial}>🎒 Material</Text>
        {puedeEditar && !editando && (
          <TouchableOpacity onPress={() => { setTexto(entrenamiento.material || ''); setEditando(true); }}>
            <Text style={styles.editarMaterial}>✏️ Editar</Text>
          </TouchableOpacity>
        )}
      </View>

      {editando ? (
        <>
          <TextInput
            style={styles.inputMaterial}
            placeholder="Ej: 20 balones, 12 petos, conos..."
            placeholderTextColor="#9ca3af"
            value={texto}
            onChangeText={setTexto}
            multiline
          />
          <View style={styles.filaBotonesMaterial}>
            <TouchableOpacity style={styles.botonCancelarMaterial} onPress={() => { Keyboard.dismiss(); setEditando(false); }}>
              <Text style={styles.botonCancelarMaterialTexto}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.botonGuardarMaterial} onPress={guardar} disabled={guardando}>
              {guardando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botonGuardarMaterialTexto}>Guardar</Text>}
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <>
          <Text style={styles.textoMaterial}>
            {entrenamiento.material || (puedeEditar ? 'Todavía no has indicado el material' : 'Sin material indicado')}
          </Text>
          {indicacion && <Text style={styles.indicacionDia}>📌 {indicacion}</Text>}

          {entrenamiento.material && (
            <View style={styles.filaBotonesMaterial}>
              <TouchableOpacity style={styles.botonWhatsapp} onPress={enviarWhatsApp}>
                <Text style={styles.botonWhatsappTexto}>💬 WhatsApp</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.botonPdf} onPress={exportarPDF} disabled={exportando}>
                {exportando ? <ActivityIndicator color="#374151" /> : <Text style={styles.botonPdfTexto}>📄 PDF</Text>}
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#f8fafc' },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  error: { color: '#dc2626', textAlign: 'center', padding: 20 },
  titulo: { fontSize: 22, fontWeight: '700', color: '#111827', textTransform: 'capitalize' },
  subtitulo: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  enlacePreparacion: { backgroundColor: '#f5f3ff', borderRadius: 10, padding: 12, marginTop: 10, marginBottom: 4, borderWidth: 1, borderColor: '#ddd6fe' },
  enlacePreparacionTexto: { color: '#6d28d9', fontSize: 14, textAlign: 'center', fontWeight: '800' },
  enlaceEntreno: { backgroundColor: '#f0fdf4', borderRadius: 10, padding: 14, marginTop: 8, marginBottom: 4, borderWidth: 1, borderColor: '#86efac' },
  enlaceEntrenoTexto: { color: '#15803d', fontSize: 14, textAlign: 'center', fontWeight: '800' },
  cajaMaterial: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginTop: 14, marginBottom: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  filaTituloMaterial: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tituloMaterial: { fontSize: 14, fontWeight: '700', color: '#111827' },
  editarMaterial: { fontSize: 12, color: '#2563eb', fontWeight: '600' },
  textoMaterial: { fontSize: 13, color: '#374151', marginTop: 8, lineHeight: 19 },
  indicacionDia: { fontSize: 12, color: '#2563eb', marginTop: 10, fontWeight: '600' },
  inputMaterial: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: '#111827', marginTop: 10, height: 90, textAlignVertical: 'top' },
  filaBotonesMaterial: { flexDirection: 'row', gap: 10, marginTop: 12 },
  botonCancelarMaterial: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#f3f4f6', alignItems: 'center' },
  botonCancelarMaterialTexto: { color: '#374151', fontWeight: '600', fontSize: 12 },
  botonGuardarMaterial: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#16a34a', alignItems: 'center' },
  botonGuardarMaterialTexto: { color: '#fff', fontWeight: '700', fontSize: 12 },
  botonWhatsapp: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#dcfce7', alignItems: 'center' },
  botonWhatsappTexto: { color: '#16a34a', fontWeight: '700', fontSize: 12 },
  botonPdf: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#f3f4f6', alignItems: 'center' },
  botonPdfTexto: { color: '#374151', fontWeight: '700', fontSize: 12 },
  cajaTotal: { backgroundColor: '#fef2f2', borderRadius: 8, padding: 12, marginTop: 10, marginBottom: 16 },
  totalTexto: { color: '#dc2626', fontWeight: '700', fontSize: 13, textAlign: 'center' },
  vacio: { textAlign: 'center', color: '#9ca3af', marginTop: 30 },
  tarjetaJugador: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 10 },
  avisoJugador: { fontSize: 12, color: '#6b7280', marginTop: -6, marginBottom: 8 },
  botonRecordar: { backgroundColor: '#16a34a', borderRadius: 10, padding: 11, alignItems: 'center', marginHorizontal: 16, marginBottom: 10 },
  botonRecordarTexto: { color: '#fff', fontWeight: '800', fontSize: 13 },
  resumenAvisos: { fontSize: 13, color: '#374151', backgroundColor: '#f3f4f6', borderRadius: 10, padding: 10, marginBottom: 10 },
  nombreJugador: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 10 },
  filaBotones: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chipEstado: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: '#d1d5db' },
  chipEstadoTexto: { fontSize: 11, fontWeight: '600', color: '#374151' },
  chipEstadoTextoActivo: { color: '#fff' },
  filaMulta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  etiquetaMulta: { fontSize: 12, color: '#6b7280' },
  inputMulta: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, width: 70, fontSize: 13 },
  soloLectura: { fontSize: 13, fontWeight: '700' },
  bocadilloFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', paddingTop: 110, paddingHorizontal: 24 },
  bocadillo: { width: '100%', maxWidth: 380, backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  bocadilloTitulo: { fontSize: 14, fontWeight: '800', color: '#111827', marginBottom: 10 },
  bocadilloInput: { borderWidth: 1.5, borderColor: '#dc2626', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: '#111827' },
  bocadilloBotones: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14 },
  bocadilloCancelar: { paddingHorizontal: 16, paddingVertical: 10 },
  bocadilloCancelarTexto: { color: '#6b7280', fontWeight: '700', fontSize: 13 },
  bocadilloAceptar: { backgroundColor: '#dc2626', borderRadius: 10, paddingHorizontal: 22, paddingVertical: 10 },
  bocadilloAceptarTexto: { color: '#fff', fontWeight: '800', fontSize: 13 },
  motivoSoloLectura: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  bloqueMotivo: { marginTop: 10 },
  chipMotivo: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: '#d1d5db' },
  chipMotivoActivo: { backgroundColor: '#374151', borderColor: '#374151' },
  chipMotivoTexto: { fontSize: 11, fontWeight: '600', color: '#374151' },
  chipMotivoTextoActivo: { color: '#fff' },
  inputMotivoLibre: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8, fontSize: 12, marginTop: 8, color: '#111827' },
  botonGuardar: { backgroundColor: '#16a34a', borderRadius: 10, paddingVertical: 16, alignItems: 'center', marginTop: 10 },
  botonGuardarTexto: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

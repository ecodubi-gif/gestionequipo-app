import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  Keyboard,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  obtenerUsuario,
  obtenerEntrenamientoApi,
  listarEntrenamientosApi,
  obtenerAsistenciasApi,
  listarJugadoresApi,
  listarPartidosApi,
  guardarNotaJugadorApi,
  listarPlantillasEntrenoApi,
  guardarPlantillaEntrenoApi,
  guardarBloquesEntrenamientoApi,
  guardarTipoSesionApi,
  listarTareasApi,
  crearTareaApi,
  guardarSemanaApi,
  listarBibliotecaApi,
  eliminarBibliotecaApi,
} from '../data/apiClient';
import { cargarPartidoPrevio } from '../data/contextoPartido';
import { formatearFechaCorta } from '../data/fecha';
import { confirmar } from '../data/confirmar';
import { tipoDeSesion, jugadoresPorGrupo } from '../data/planSesion';
import { tareaDesdePlantilla, tareasPorCargar, tareasParaPlantilla, MAX_TAREAS_PLANTILLA } from '../data/semana';
import { tareaDesdeBiblioteca } from '../data/biblioteca';
import PlanSesion from '../components/PlanSesion';

// Readaptación: solo el preparador físico. Observaciones: todo el cuerpo
// técnico. El resto de roles lo ve, sin poder tocarlo.
const ROLES_READAPTACION = ['preparador_fisico'];
const ROLES_OBSERVACIONES = ['entrenador', 'segundo_entrenador', 'preparador_fisico'];

const esPortero = (j) => (j.posicion || '').toLowerCase().startsWith('port');
const nombre = (j) => `${j.dorsal ? `#${j.dorsal} ` : ''}${j.nombre} ${j.apellidos || ''}`.trim();

export default function EntrenamientoDetalleScreen({ route, navigation }) {
  const { entrenamientoId } = route.params;

  const [usuario, setUsuario] = useState(null);
  const [entrenamiento, setEntrenamiento] = useState(null);
  const [asistencias, setAsistencias] = useState([]);
  const [jugadores, setJugadores] = useState([]);
  const [postPartido, setPostPartido] = useState(null);
  const [todosEntrenos, setTodosEntrenos] = useState([]);
  const [plantillas, setPlantillas] = useState([]);
  const [errorPlan, setErrorPlan] = useState(false);
  const [tareas, setTareas] = useState(null); // null = no disponible (sin permiso o sin servidor)
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState('');

  const cargar = useCallback(
    async (esRecarga = false) => {
      setError('');
      if (esRecarga) setActualizando(true);
      try {
        const [u, ent, entrenos, asist, jug, partidos, plantillasServidor, tareasServidor] = await Promise.all([
          obtenerUsuario(),
          obtenerEntrenamientoApi(entrenamientoId),
          listarEntrenamientosApi(),
          obtenerAsistenciasApi(entrenamientoId),
          listarJugadoresApi(),
          listarPartidosApi(),
          listarPlantillasEntrenoApi().catch(() => null), // el plan es secundario: si falla, no tumba la pantalla
          listarTareasApi(entrenamientoId).catch(() => null), // el delegado no tiene acceso: se queda en null
        ]);
        setUsuario(u);
        setEntrenamiento(ent);
        setTodosEntrenos(entrenos);
        setPlantillas(plantillasServidor || []);
        setErrorPlan(plantillasServidor === null);
        setTareas(tareasServidor);
        setAsistencias(asist);
        setJugadores(jug);

        setPostPartido(await cargarPartidoPrevio(ent, entrenos, partidos));
      } catch (err) {
        setError(err.message || 'No se pudo cargar el entrenamiento');
      } finally {
        setCargando(false);
        setActualizando(false);
      }
    },
    [entrenamientoId]
  );

  // Se recarga cada vez que entras: así, cuando el delegado guarda la
  // asistencia, aquí se ve actualizada sin hacer nada más.
  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  const guardarPlantilla = async (numero, datos) => {
    const actualizada = await guardarPlantillaEntrenoApi(numero, datos);
    setPlantillas((prev) => prev.map((p) => (p.numero === numero ? actualizada : p)));
  };

  const guardarSemana = async (numero, semana) => {
    const actualizada = await guardarSemanaApi(numero, semana);
    setPlantillas((prev) => prev.map((p) => (p.numero === numero ? actualizada : p)));
  };

  // Crea en esta sesión las tareas de la plantilla (las que aún no estén). Quedan como tareas normales, editables.
  const cargarTareasDePlantilla = async (numero) => {
    const semana = plantillas.find((p) => p.numero === numero)?.semana;
    const { nuevas, repetidas } = tareasPorCargar(semana, tareas);
    if (nuevas.length === 0) return { creadas: 0, repetidas };
    let creadas = 0;
    try {
      for (const t of nuevas) {
        await crearTareaApi(entrenamientoId, tareaDesdePlantilla(t));
        creadas += 1;
      }
    } finally {
      setTareas(await listarTareasApi(entrenamientoId).catch(() => tareas)); // se refresca aunque haya fallado a medias
    }
    return { creadas, repetidas };
  };

  // Guarda las tareas de esta sesión como la nueva plantilla del tipo de entreno.
  const guardarSesionComoPlantilla = async (numero) => {
    if ((tareas || []).length > MAX_TAREAS_PLANTILLA) throw new Error(`La plantilla admite hasta ${MAX_TAREAS_PLANTILLA} tareas.`);
    const actual = plantillas.find((p) => p.numero === numero)?.semana || {};
    await guardarSemana(numero, { ...actual, tareas: tareasParaPlantilla(tareas) });
  };

  // Añade a esta sesión una tarea de la biblioteca (sin jugadores; se asignan después).
  const anadirDeBiblioteca = async (bloqueClave, item) => {
    try {
      await crearTareaApi(entrenamientoId, tareaDesdeBiblioteca(item, bloqueClave));
    } finally {
      setTareas(await listarTareasApi(entrenamientoId).catch(() => tareas));
    }
  };

  const guardarBloques = async (bloques) => {
    const ent = await guardarBloquesEntrenamientoApi(entrenamientoId, bloques);
    setEntrenamiento(ent);
    setTodosEntrenos((prev) => prev.map((e) => (e.id === ent.id ? ent : e)));
  };

  const cambiarTipo = async (tipo) => {
    const ent = await guardarTipoSesionApi(entrenamientoId, tipo);
    setEntrenamiento(ent);
    setTodosEntrenos((prev) => prev.map((e) => (e.id === ent.id ? ent : e)));
  };

  const guardarNota = async (jugadorId, campo, texto) => {
    const actualizado = await guardarNotaJugadorApi(jugadorId, campo, texto);
    setJugadores((prev) => prev.map((j) => (j.id === jugadorId ? { ...j, ...actualizado } : j)));
  };

  if (cargando) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centrado}>
        <Text style={styles.error}>{error}</Text>
        <TouchableOpacity style={styles.botonReintentar} onPress={() => cargar()}>
          <Text style={styles.botonReintentarTexto}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- Disponibilidad según el pase de lista ---
  const activos = jugadores.filter((j) => j.estado !== 'baja');
  const asistPorId = Object.fromEntries(asistencias.map((a) => [a.jugador.id, a]));
  const listaPasada = asistencias.length > 0;
  const estan = activos.filter((j) => ['presente', 'retraso'].includes(asistPorId[j.id]?.estado));
  const faltan = activos.filter((j) => ['falta_justificada', 'falta_injustificada'].includes(asistPorId[j.id]?.estado));
  const sinLista = activos.filter((j) => !asistPorId[j.id]);
  const indisponibles = activos.filter((j) => ['lesionado', 'sancionado'].includes((j.estado || '').toLowerCase()));

  // --- Después del partido ---
  let grupos = null;
  if (postPartido) {
    const idsConvocados = new Set(postPartido.convocatoria.map((c) => c.jugador.id));
    const minutosPorId = Object.fromEntries(postPartido.minutos.map((m) => [m.id, m.minutosJugados]));
    const deCampo = activos.filter((j) => !esPortero(j));
    grupos = {
      mas60: deCampo
        .filter((j) => idsConvocados.has(j.id) && (minutosPorId[j.id] || 0) >= 60)
        .sort((a, b) => (minutosPorId[b.id] || 0) - (minutosPorId[a.id] || 0)),
      menos60: deCampo.filter((j) => idsConvocados.has(j.id) && (minutosPorId[j.id] || 0) < 60),
      noConvocados: deCampo.filter((j) => !idsConvocados.has(j.id)),
      minutosPorId,
    };
  }

  // Lo que el editor de tareas necesita saber del último partido: quién fue convocado y cuántos minutos jugó.
  const contextoTareas = {
    fecha: entrenamiento.fecha,
    tipo: tipoDeSesion(entrenamiento, todosEntrenos).tipo,
    minutosPartido: postPartido ? Object.fromEntries(postPartido.minutos.map((m) => [m.id, m.minutosJugados])) : null,
    convocados: postPartido ? postPartido.convocatoria.map((c) => c.jugador.id) : [],
  };

  const puedeReadaptacion = usuario && ROLES_READAPTACION.includes(usuario.role);
  const puedeObservaciones = usuario && ROLES_OBSERVACIONES.includes(usuario.role);

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <LinearGradient colors={['#2563eb', '#7c3aed']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cabecera}>
        <Text style={styles.cabeceraEmoji}>🏋️</Text>
        <Text style={styles.cabeceraTitulo}>Preparación del entreno</Text>
        <Text style={styles.cabeceraSub}>
          {formatearFechaCorta(entrenamiento.fecha)} · {entrenamiento.hora?.slice(0, 5)} · {entrenamiento.lugar}
        </Text>
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingTop: 16, paddingBottom: 40 }}>
        <TouchableOpacity style={styles.botonActualizar} onPress={() => cargar(true)} disabled={actualizando}>
          {actualizando ? <ActivityIndicator color="#374151" /> : <Text style={styles.botonActualizarTexto}>↻ Actualizar</Text>}
        </TouchableOpacity>

        {/* --- Disponibilidad --- */}
        <Text style={styles.tituloSeccion}>Disponibilidad (según el pase de lista)</Text>
        {!listaPasada ? (
          <View style={styles.cajaVacia}>
            <Text style={styles.cajaVaciaTexto}>El delegado todavía no ha pasado lista en este entrenamiento.</Text>
          </View>
        ) : (
          <>
            <View style={styles.filaContadores}>
              <Contador numero={estan.length} etiqueta="Están" color="#16a34a" fondo="#dcfce7" />
              <Contador numero={faltan.length} etiqueta="No están" color="#dc2626" fondo="#fee2e2" />
              <Contador numero={sinLista.length} etiqueta="Sin marcar" color="#6b7280" fondo="#f3f4f6" />
            </View>
            {estan.map((j) => (
              <Text key={j.id} style={styles.nombreListado}>
                ✓ {nombre(j)}
                {asistPorId[j.id]?.estado === 'retraso' ? ' · llegó tarde' : ''}
              </Text>
            ))}
            {faltan.map((j) => (
              <Text key={j.id} style={[styles.nombreListado, { color: '#dc2626' }]}>
                ✕ {nombre(j)}
                {asistPorId[j.id]?.motivo ? ` · ${asistPorId[j.id].motivo}` : ''}
              </Text>
            ))}
          </>
        )}
        {indisponibles.length > 0 && (
          <Text style={styles.notaPlantilla}>
            En la plantilla figuran como lesionados o sancionados: {indisponibles.map((j) => nombre(j)).join(', ')}.
          </Text>
        )}

        {/* --- Readaptación y observaciones --- */}
        <SeccionNotas
          titulo="En readaptación"
          campo="readaptacion"
          jugadores={activos}
          puedeEditar={puedeReadaptacion}
          onGuardar={guardarNota}
          colorTexto="#dc2626"
          colorFondo="#fef2f2"
          colorBorde="#fecaca"
          placeholder="Ej: sobrecarga en isquios, sin cambios de dirección"
          avisoSoloPF
        />
        <SeccionNotas
          titulo="Observaciones"
          campo="observaciones"
          jugadores={activos}
          puedeEditar={puedeObservaciones}
          onGuardar={guardarNota}
          colorTexto="#2563eb"
          colorFondo="#eff6ff"
          colorBorde="#bfdbfe"
          placeholder="Ej: comodín, no hacer series esta semana"
        />

        {/* --- Después del partido --- */}
        {grupos && (
          <>
            <Text style={styles.tituloSeccion}>
              Después del partido ({postPartido.partido.equipo_local} vs {postPartido.partido.equipo_visitante})
            </Text>
            <View style={styles.filaContadores}>
              <Contador numero={grupos.mas60.length} etiqueta="60' o más" color="#16a34a" fondo="#dcfce7" />
              <Contador numero={grupos.menos60.length} etiqueta="Menos de 60'" color="#ca8a04" fondo="#fef9c3" />
              <Contador numero={grupos.noConvocados.length} etiqueta="No convocados" color="#6b7280" fondo="#f3f4f6" />
            </View>
            <Text style={styles.notaPlantilla}>Solo jugadores de campo, sin porteros.</Text>
            {postPartido.sinMinutoFinal && (
              <Text style={styles.avisoMinutos}>
                Este partido no tiene guardado el minuto final; se ha usado el del último evento apuntado. Corrígelo en el Resumen del partido.
              </Text>
            )}
            <Text style={styles.subtituloLista}>Jugaron 60 minutos o más</Text>
            {grupos.mas60.length === 0 && <Text style={styles.nombreListado}>Nadie.</Text>}
            {grupos.mas60.map((j) => (
              <Text key={j.id} style={styles.nombreListado}>⚽ {nombre(j)} — {grupos.minutosPorId[j.id]}'</Text>
            ))}
            {grupos.menos60.length > 0 && (
              <>
                <Text style={styles.subtituloLista}>Menos de 60 minutos</Text>
                {grupos.menos60.map((j) => (
                  <Text key={j.id} style={styles.nombreListado}>• {nombre(j)} — {grupos.minutosPorId[j.id] || 0}'</Text>
                ))}
              </>
            )}
          </>
        )}

        <TouchableOpacity style={styles.botonSesion} onPress={() => navigation.navigate('SesionCompleta', { entrenamientoId })} activeOpacity={0.85}>
          <Text style={styles.botonSesionTexto}>📋  Ver la sesión completa · horario e impresión</Text>
        </TouchableOpacity>

        <PlanSesion
          entrenamiento={entrenamiento}
          {...tipoDeSesion(entrenamiento, todosEntrenos)}
          plantillas={plantillas}
          errorPlan={errorPlan}
          tareas={tareas}
          jugadoresGrupo={postPartido ? jugadoresPorGrupo(activos, contextoTareas.minutosPartido, contextoTareas.convocados) : null}
          onAbrirTarea={(bloque, tarea, objetivoInicial) => navigation.navigate('TareaEditor', { entrenamientoId, bloque, tarea, objetivoInicial, contexto: contextoTareas })}
          rol={usuario?.role}
          onCambiarTipo={cambiarTipo}
          onGuardarPlantilla={guardarPlantilla}
          onGuardarSemana={guardarSemana}
          onCargarBiblioteca={listarBibliotecaApi}
          onAnadirDeBiblioteca={anadirDeBiblioteca}
          onBorrarDeBiblioteca={(item) => eliminarBibliotecaApi(item.id)}
          onCargarTareasPlantilla={cargarTareasDePlantilla}
          onGuardarSesionComoPlantilla={guardarSesionComoPlantilla}
          onGuardarBloques={guardarBloques}
        />
      </ScrollView>
    </View>
  );
}

function Contador({ numero, etiqueta, color, fondo }) {
  return (
    <View style={[styles.contador, { backgroundColor: fondo, borderColor: color }]}>
      <Text style={[styles.contadorNumero, { color }]}>{numero}</Text>
      <Text style={[styles.contadorEtiqueta, { color }]}>{etiqueta}</Text>
    </View>
  );
}

function SeccionNotas({ titulo, campo, jugadores, puedeEditar, onGuardar, colorTexto, colorFondo, colorBorde, placeholder, avisoSoloPF }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [jugadorId, setJugadorId] = useState(null);
  const [texto, setTexto] = useState('');
  const [guardando, setGuardando] = useState(false);

  const conNota = jugadores.filter((j) => j[campo]);
  const sinNota = jugadores.filter((j) => !j[campo]);

  const abrirNuevo = () => {
    setJugadorId(null);
    setTexto('');
    setModalVisible(true);
  };

  const abrirEditar = (j) => {
    setJugadorId(j.id);
    setTexto(j[campo]);
    setModalVisible(true);
  };

  const cerrar = () => {
    Keyboard.dismiss();
    setModalVisible(false);
  };

  const puedeGuardar = jugadorId != null && texto.trim().length > 0 && !guardando;

  const guardar = async () => {
    if (!puedeGuardar) return;
    setGuardando(true);
    try {
      await onGuardar(jugadorId, campo, texto.trim());
      cerrar();
    } catch (err) {
      Alert.alert('No se pudo guardar', err.message);
    } finally {
      setGuardando(false);
    }
  };

  const quitar = (j) => {
    confirmar('Quitar', `¿Quitar la nota de ${j.nombre} ${j.apellidos || ''}?`, async () => {
      try {
        await onGuardar(j.id, campo, null);
      } catch (err) {
        Alert.alert('No se pudo quitar', err.message);
      }
    }, 'Quitar');
  };

  if (conNota.length === 0 && !puedeEditar) return null;

  return (
    <>
      <Text style={styles.tituloSeccion}>{titulo}</Text>
      {conNota.map((j) => (
        <View key={j.id} style={[styles.tarjetaNota, { backgroundColor: colorFondo, borderColor: colorBorde }]}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => puedeEditar && abrirEditar(j)} disabled={!puedeEditar}>
            <Text style={styles.tarjetaNotaNombre}>{nombre(j)}</Text>
            <Text style={[styles.tarjetaNotaTexto, { color: colorTexto }]}>{j[campo]}</Text>
          </TouchableOpacity>
          {puedeEditar && (
            <TouchableOpacity onPress={() => quitar(j)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.quitarNota}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
      {conNota.length === 0 && <Text style={styles.nombreListado}>Nadie por ahora.</Text>}
      {!puedeEditar && avisoSoloPF && conNota.length > 0 && (
        <Text style={styles.notaPlantilla}>Lo gestiona el preparador físico.</Text>
      )}

      {puedeEditar && (
        <TouchableOpacity style={styles.botonAnadirNota} onPress={abrirNuevo}>
          <Text style={styles.botonAnadirNotaTexto}>+ Añadir jugador</Text>
        </TouchableOpacity>
      )}

      {/* El cuadro va pegado ARRIBA (no abajo) para que el teclado nunca tape
          los botones, y el campo es de una línea con tecla "Hecho". */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalFondoArriba}>
          <ScrollView style={styles.modalCaja} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 6 }}>
            <Text style={styles.modalTitulo}>{titulo}</Text>

            {jugadorId == null ? (
              <>
                <Text style={styles.etiquetaModal}>Jugador</Text>
                <View style={styles.filaJugadoresModal}>
                  {sinNota.map((j) => (
                    <TouchableOpacity key={j.id} style={styles.chipJugadorModal} onPress={() => setJugadorId(j.id)}>
                      <Text style={styles.chipJugadorModalTexto}>{nombre(j)}</Text>
                    </TouchableOpacity>
                  ))}
                  {sinNota.length === 0 && <Text style={styles.nombreListado}>Todos los jugadores ya tienen nota.</Text>}
                </View>
              </>
            ) : (
              <Text style={styles.editandoA}>{nombre(jugadores.find((j) => j.id === jugadorId) || { nombre: '' })}</Text>
            )}

            <Text style={styles.etiquetaModal}>Motivo</Text>
            <TextInput
              style={styles.inputModal}
              placeholder={placeholder}
              placeholderTextColor="#9ca3af"
              value={texto}
              onChangeText={setTexto}
              maxLength={200}
              returnKeyType="done"
              onSubmitEditing={guardar}
            />

            <View style={styles.modalBotones}>
              <TouchableOpacity style={styles.botonCancelar} onPress={cerrar}>
                <Text style={styles.botonCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.botonGuardar, !puedeGuardar && styles.botonDeshabilitado]} onPress={guardar} disabled={!puedeGuardar}>
                {guardando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botonGuardarTexto}>Guardar</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', padding: 24 },
  error: { color: '#dc2626', textAlign: 'center', marginBottom: 14 },
  botonReintentar: { backgroundColor: '#7c3aed', borderRadius: 10, paddingHorizontal: 22, paddingVertical: 12 },
  botonReintentarTexto: { color: '#fff', fontWeight: '700' },
  cabecera: { paddingTop: 30, paddingBottom: 22, paddingHorizontal: 24, alignItems: 'center' },
  cabeceraEmoji: { fontSize: 28, marginBottom: 4 },
  cabeceraTitulo: { color: '#fff', fontSize: 21, fontWeight: '800' },
  cabeceraSub: { color: 'rgba(255,255,255,0.88)', fontSize: 12, marginTop: 4, textAlign: 'center' },
  botonSesion: { backgroundColor: '#7c3aed', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  botonSesionTexto: { color: '#fff', fontWeight: '700', fontSize: 13 },
  botonActualizar: { alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 18, borderRadius: 8, backgroundColor: '#e5e7eb', marginBottom: 4 },
  botonActualizarTexto: { color: '#374151', fontWeight: '700', fontSize: 12 },
  tituloSeccion: { fontSize: 14, fontWeight: '700', color: '#111827', marginTop: 22, marginBottom: 10 },
  subtituloLista: { fontSize: 12, fontWeight: '700', color: '#6b7280', marginTop: 14, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  cajaVacia: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', padding: 14 },
  cajaVaciaTexto: { fontSize: 13, color: '#6b7280', textAlign: 'center' },
  filaContadores: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  contador: { flex: 1, borderRadius: 10, borderWidth: 1, paddingVertical: 12, alignItems: 'center' },
  contadorNumero: { fontSize: 22, fontWeight: '800' },
  contadorEtiqueta: { fontSize: 10, fontWeight: '700', marginTop: 2, textAlign: 'center' },
  nombreListado: { fontSize: 13, color: '#374151', marginBottom: 4 },
  notaPlantilla: { fontSize: 11, color: '#9ca3af', marginTop: 8 },
  avisoMinutos: { fontSize: 11, color: '#92400e', backgroundColor: '#fef3c7', borderRadius: 8, padding: 10, marginTop: 8 },
  tarjetaNota: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 8 },
  tarjetaNotaNombre: { fontSize: 13, fontWeight: '700', color: '#111827' },
  tarjetaNotaTexto: { fontSize: 12, marginTop: 4 },
  quitarNota: { fontSize: 16, color: '#9ca3af', fontWeight: '700', paddingHorizontal: 6 },
  botonAnadirNota: { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db', borderStyle: 'dashed', paddingVertical: 10, alignItems: 'center', marginBottom: 8 },
  botonAnadirNotaTexto: { color: '#2563eb', fontSize: 12, fontWeight: '700' },
  modalFondoArriba: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-start', paddingTop: 50, paddingHorizontal: 16 },
  modalCaja: { backgroundColor: '#fff', borderRadius: 16, padding: 18, maxHeight: '75%' },
  modalTitulo: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 8 },
  etiquetaModal: { fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 6, marginTop: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  editandoA: { fontSize: 14, color: '#2563eb', fontWeight: '700' },
  filaJugadoresModal: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipJugadorModal: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: '#d1d5db' },
  chipJugadorModalTexto: { fontSize: 12, fontWeight: '600', color: '#374151' },
  inputModal: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#111827' },
  modalBotones: { flexDirection: 'row', gap: 10, marginTop: 16 },
  botonCancelar: { flex: 1, paddingVertical: 14, borderRadius: 8, backgroundColor: '#f3f4f6', alignItems: 'center' },
  botonCancelarTexto: { color: '#374151', fontWeight: '600' },
  botonGuardar: { flex: 1, paddingVertical: 14, borderRadius: 8, backgroundColor: '#16a34a', alignItems: 'center' },
  botonGuardarTexto: { color: '#fff', fontWeight: '700' },
  botonDeshabilitado: { backgroundColor: '#9ca3af' },
});

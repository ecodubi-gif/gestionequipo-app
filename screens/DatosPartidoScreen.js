import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import SelectorFecha from '../components/SelectorFecha';
import SelectorHora from '../components/SelectorHora';
import { crearPartidoApi, obtenerPartidoApi, actualizarPartidoApi } from '../data/apiClient';

export default function DatosPartidoScreen({ navigation, route }) {
  // Si viene un partidoId, esta pantalla EDITA un partido ya creado en vez de crear uno nuevo.
  const partidoId = route?.params?.partidoId;
  const editando = Boolean(partidoId);
  const [equipoLocal, setEquipoLocal] = useState('');
  const [equipoVisitante, setEquipoVisitante] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString());
  // En casa siempre jugamos en el mismo campo donde entrenamos.
  const CAMPO_CASA = 'Los Manantiales';
  const [lugar, setLugar] = useState(CAMPO_CASA);
  const [esLocal, setEsLocal] = useState(true);
  const [lugarCitacion, setLugarCitacion] = useState('');
  const [horaCitacion, setHoraCitacion] = useState(new Date().toISOString());
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState('');
  const [cargandoPartido, setCargandoPartido] = useState(editando);
  const [estadoPartido, setEstadoPartido] = useState(null);

  // Al editar: se cargan los datos que ya tiene el partido.
  useEffect(() => {
    if (!editando) return;
    (async () => {
      try {
        const p = await obtenerPartidoApi(partidoId);
        setEstadoPartido(p.estado);
        setEquipoLocal(p.equipo_local || '');
        setEquipoVisitante(p.equipo_visitante || '');
        setFecha(new Date(p.fecha).toISOString());
        setLugar(p.lugar || '');
        setEsLocal(Boolean(p.es_local));
        setLugarCitacion(p.lugar_citacion || '');
        if (p.hora_citacion) {
          const [h, m] = String(p.hora_citacion).split(':').map(Number);
          const d = new Date();
          d.setHours(h || 0, m || 0, 0, 0);
          setHoraCitacion(d.toISOString());
        }
      } catch (err) {
        setErrorGeneral(err.message || 'No se pudo cargar el partido');
      } finally {
        setCargandoPartido(false);
      }
    })();
  }, [editando, partidoId]);

  const cambiarHoraCitacion = (nuevaHora) => {
    const actual = new Date(horaCitacion);
    actual.setHours(nuevaHora.getHours(), nuevaHora.getMinutes());
    setHoraCitacion(actual.toISOString());
  };

  // Al marcar "en casa", ponemos el campo habitual por defecto (editable
  // igualmente); al marcar "fuera", lo dejamos en blanco para que se
  // escriba el campo del rival.
  const cambiarEsLocal = (nuevoValor) => {
    setEsLocal(nuevoValor);
    if (nuevoValor && !lugar.trim()) setLugar(CAMPO_CASA);
    if (!nuevoValor && lugar === CAMPO_CASA) setLugar('');
  };

  const cambiarFecha = (nuevaFecha) => {
    const actual = new Date(fecha);
    nuevaFecha.setHours(actual.getHours(), actual.getMinutes());
    setFecha(nuevaFecha.toISOString());
  };

  const cambiarHora = (nuevaHora) => {
    const actual = new Date(fecha);
    actual.setHours(nuevaHora.getHours(), nuevaHora.getMinutes());
    setFecha(actual.toISOString());
  };

  const validar = () => {
    const nuevosErrores = {};
    if (!equipoLocal.trim()) nuevosErrores.equipoLocal = 'Falta el equipo local';
    if (!equipoVisitante.trim()) nuevosErrores.equipoVisitante = 'Falta el equipo visitante';
    if (!lugar.trim()) nuevosErrores.lugar = 'Indica el campo';
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const continuar = async () => {
    setErrorGeneral('');
    if (!validar()) return;
    setGuardando(true);
    try {
      // La hora de citación hace falta siempre (en casa también se
      // queda antes); el lugar de citación solo tiene sentido si jugáis
      // fuera (en casa, el sitio de citación es el propio campo).
      const horaCitacionTexto = new Date(horaCitacion).toTimeString().slice(0, 5); // "HH:MM"

      const datos = {
        equipo_local: equipoLocal.trim(),
        equipo_visitante: equipoVisitante.trim(),
        fecha,
        lugar: lugar.trim(),
        es_local: esLocal,
        lugar_citacion: esLocal ? null : (lugarCitacion.trim() || null),
        hora_citacion: horaCitacionTexto,
      };

      if (editando) {
        await actualizarPartidoApi(partidoId, datos);
        Alert.alert(
          'Cambios guardados',
          'Si ya habías enviado la convocatoria a los jugadores, vuelve a enviarla: lleva la hora y el lugar anteriores.'
        );
        navigation.goBack();
        return;
      }

      const partido = await crearPartidoApi(datos);
      navigation.navigate('Plantilla', { partidoId: partido.id });
    } catch (err) {
      setErrorGeneral(err.message || (editando ? 'No se pudieron guardar los cambios' : 'No se pudo crear el partido'));
    } finally {
      setGuardando(false);
    }
  };

  if (editando && cargandoPartido) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  // Los datos solo se editan mientras el partido no ha empezado: una vez en marcha, cambiar quién es
  // el local o el rival descolocaría los eventos ya apuntados.
  if (editando && estadoPartido && estadoPartido !== 'pendiente') {
    return (
      <View style={styles.centrado}>
        <Text style={styles.avisoEstado}>Este partido ya ha empezado, así que sus datos no se pueden editar.</Text>
        <TouchableOpacity style={styles.boton} onPress={() => navigation.goBack()}>
          <Text style={styles.botonTexto}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.contenedor} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.titulo}>{editando ? 'Editar partido' : 'Nuevo partido'}</Text>
        <Text style={styles.subtitulo}>{editando ? 'Corrige la fecha, la hora, el campo o la citación' : 'Se guarda directamente en el servidor'}</Text>

        {errorGeneral ? <Text style={styles.errorGeneral}>{errorGeneral}</Text> : null}

        <Campo
          etiqueta="Equipo local"
          valor={equipoLocal}
          onCambiar={setEquipoLocal}
          placeholder="Ej: CD Nuestro Equipo"
          error={errores.equipoLocal}
        />

        <Campo
          etiqueta="Equipo visitante"
          valor={equipoVisitante}
          onCambiar={setEquipoVisitante}
          placeholder="Ej: Rival CF"
          error={errores.equipoVisitante}
        />

        <Text style={styles.etiqueta}>Fecha</Text>
        <SelectorFecha valor={fecha} onCambiar={cambiarFecha} />

        <Text style={styles.etiqueta}>Hora</Text>
        <SelectorHora valor={fecha} onCambiar={cambiarHora} />

        <Campo
          etiqueta="Campo / Estadio"
          valor={lugar}
          onCambiar={setLugar}
          placeholder="Ej: Campo Municipal"
          error={errores.lugar}
        />

        <Text style={styles.etiqueta}>¿Jugáis en casa o fuera?</Text>
        <View style={styles.filaChips}>
          <TouchableOpacity style={[styles.chip, esLocal && styles.chipActivo]} onPress={() => cambiarEsLocal(true)}>
            <Text style={[styles.chipTexto, esLocal && styles.chipTextoActivo]}>🏠 En casa</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.chip, !esLocal && styles.chipActivo]} onPress={() => cambiarEsLocal(false)}>
            <Text style={[styles.chipTexto, !esLocal && styles.chipTextoActivo]}>🚌 Fuera</Text>
          </TouchableOpacity>
        </View>

        {/* La citación hace falta siempre: en casa solo la hora (el
            sitio ya se sabe, es el campo); fuera, además el lugar. */}
        <View style={styles.cajaCitacion}>
          <Text style={styles.tituloCitacion}>
            {esLocal ? 'Citación antes del partido' : 'Citación para el desplazamiento'}
          </Text>
          {!esLocal && (
            <Campo
              etiqueta="Lugar de citación"
              valor={lugarCitacion}
              onCambiar={setLugarCitacion}
              placeholder="Ej: Aparcamiento del club"
            />
          )}
          <Text style={styles.etiqueta}>Hora de citación</Text>
          <SelectorHora valor={horaCitacion} onCambiar={cambiarHoraCitacion} />
        </View>

        <TouchableOpacity style={styles.boton} onPress={continuar} disabled={guardando}>
          {guardando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botonTexto}>{editando ? 'Guardar cambios' : 'Continuar'}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Campo({ etiqueta, valor, onCambiar, placeholder, error }) {
  return (
    <View style={styles.grupo}>
      <Text style={styles.etiqueta}>{etiqueta}</Text>
      <TextInput
        style={[styles.input, error && styles.inputError]}
        value={valor}
        onChangeText={onCambiar}
        placeholder={placeholder}
        placeholderTextColor="#9aa0a6"
      />
      {error ? <Text style={styles.textoError}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#f8fafc' },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', padding: 24 },
  avisoEstado: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 20 },
  scroll: { padding: 20, paddingBottom: 40 },
  titulo: { fontSize: 26, fontWeight: '700', color: '#1a1a1a' },
  subtitulo: { fontSize: 14, color: '#6b7280', marginTop: 4, marginBottom: 20 },
  errorGeneral: { color: '#dc2626', marginBottom: 14, fontSize: 13, textAlign: 'center' },
  grupo: { marginBottom: 18 },
  etiqueta: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  inputError: { borderColor: '#dc2626' },
  textoError: { color: '#dc2626', fontSize: 12, marginTop: 4 },
  filaChips: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  chip: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#d1d5db', alignItems: 'center', backgroundColor: '#ffffff' },
  chipActivo: { backgroundColor: '#111827', borderColor: '#111827' },
  chipTexto: { fontSize: 14, fontWeight: '600', color: '#374151' },
  chipTextoActivo: { color: '#ffffff' },
  cajaCitacion: { backgroundColor: '#eff6ff', borderRadius: 12, padding: 16, marginBottom: 18, borderWidth: 1, borderColor: '#bfdbfe' },
  tituloCitacion: { fontSize: 13, fontWeight: '700', color: '#1d4ed8', marginBottom: 12 },
  boton: {
    backgroundColor: '#16a34a',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  botonTexto: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
});

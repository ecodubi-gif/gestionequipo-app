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
import { MI_EQUIPO } from '../data/liga';
import { crearPartidoApi, obtenerPartidoApi, actualizarPartidoApi } from '../data/apiClient';

export default function DatosPartidoScreen({ navigation, route }) {
  // Si viene un partidoId, esta pantalla EDITA un partido ya creado en vez de crear uno nuevo.
  const partidoId = route?.params?.partidoId;
  const editando = Boolean(partidoId);
  // Si viene del calendario de la liga, ya traen los equipos, la fecha y si jugamos en casa.
  const previo = route?.params?.previo;
  const [equipoLocal, setEquipoLocal] = useState(previo ? (previo.local || '') : (editando ? '' : MI_EQUIPO));
  const [equipoVisitante, setEquipoVisitante] = useState(previo?.visitante || '');
  const [fecha, setFecha] = useState(previo?.fecha ? new Date(`${previo.fecha}T11:00:00`).toISOString() : new Date().toISOString());
  // En casa siempre jugamos en el mismo campo.
  const CAMPO_CASA = 'Estadio Juan Benjumea';
  const [lugar, setLugar] = useState(previo && !previo.esLocal ? '' : CAMPO_CASA);
  const [esLocal, setEsLocal] = useState(previo ? previo.esLocal : true);
  // Medidas del campo del rival (solo fuera). Se guardan al final del lugar: "Campo X · 100 × 62 m".
  const [largoCampo, setLargoCampo] = useState('');
  const [anchoCampo, setAnchoCampo] = useState('');
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
        const m = String(p.lugar || '').match(/^(.*?)\s*·\s*(\d{2,3})\s*[×x]\s*(\d{2,3})\s*m$/);
        setLugar(m ? m[1] : (p.lugar || ''));
        setLargoCampo(m ? m[2] : '');
        setAnchoCampo(m ? m[3] : '');
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
    // Nuestro equipo pasa al lado que toca; el rival que hubiera escrito se pasa al otro.
    if (nuevoValor) {
      if (equipoVisitante === MI_EQUIPO) { setEquipoVisitante(equipoLocal === MI_EQUIPO ? '' : equipoLocal); setEquipoLocal(MI_EQUIPO); }
      else if (!equipoLocal.trim()) setEquipoLocal(MI_EQUIPO);
    } else {
      if (equipoLocal === MI_EQUIPO) { setEquipoLocal(equipoVisitante === MI_EQUIPO ? '' : equipoVisitante); setEquipoVisitante(MI_EQUIPO); }
      else if (!equipoVisitante.trim()) setEquipoVisitante(MI_EQUIPO);
    }
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
    if (!esLocal && (largoCampo || anchoCampo)) {
      const l = Number(largoCampo); const a = Number(anchoCampo);
      if (!(l >= 20 && l <= 130 && a >= 15 && a <= 100)) nuevosErrores.medidas = 'Medidas no válidas (largo 20-130 m, ancho 15-100 m)';
    }
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
        lugar: lugar.trim() + (!esLocal && largoCampo && anchoCampo ? ` · ${largoCampo} × ${anchoCampo} m` : ''),
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
        {equipoLocal !== MI_EQUIPO && (
          <TouchableOpacity style={styles.chipNuestro} onPress={() => setEquipoLocal(MI_EQUIPO)}>
            <Text style={styles.chipNuestroTexto}>Poner {MI_EQUIPO}</Text>
          </TouchableOpacity>
        )}

        <Campo
          etiqueta="Equipo visitante"
          valor={equipoVisitante}
          onCambiar={setEquipoVisitante}
          placeholder="Ej: Rival CF"
          error={errores.equipoVisitante}
        />
        {equipoVisitante !== MI_EQUIPO && (
          <TouchableOpacity style={styles.chipNuestro} onPress={() => setEquipoVisitante(MI_EQUIPO)}>
            <Text style={styles.chipNuestroTexto}>Poner {MI_EQUIPO}</Text>
          </TouchableOpacity>
        )}

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

        {!esLocal && (
          <View style={styles.grupo}>
            <Text style={styles.etiqueta}>Dimensiones del campo (opcional)</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TextInput
                style={[styles.input, { flex: 1 }, errores.medidas && styles.inputError]}
                value={largoCampo}
                onChangeText={(t) => setLargoCampo(t.replace(/\D/g, '').slice(0, 3))}
                keyboardType="number-pad"
                placeholder="Largo"
                placeholderTextColor="#9aa0a6"
              />
              <Text style={{ color: '#6b7280', fontWeight: '700' }}>×</Text>
              <TextInput
                style={[styles.input, { flex: 1 }, errores.medidas && styles.inputError]}
                value={anchoCampo}
                onChangeText={(t) => setAnchoCampo(t.replace(/\D/g, '').slice(0, 3))}
                keyboardType="number-pad"
                placeholder="Ancho"
                placeholderTextColor="#9aa0a6"
              />
              <Text style={{ color: '#6b7280' }}>m</Text>
            </View>
            {errores.medidas ? <Text style={styles.textoError}>{errores.medidas}</Text> : null}
          </View>
        )}

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
  chipNuestro: { alignSelf: 'flex-start', marginTop: -8, marginBottom: 16, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: '#dcfce7' },
  chipNuestroTexto: { color: '#166534', fontWeight: '700', fontSize: 12 },
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

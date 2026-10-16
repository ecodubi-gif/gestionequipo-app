import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { estadoParaPartido, CICLO_POR_DEFECTO, CICLOS_POSIBLES } from '../data/tarjetas';
import { listarJugadoresApi, obtenerConvocatoriaApi, guardarConvocatoriaApi, estadoPublicacionApi, obtenerNoDisponiblesApi, cargarDatosTarjetasApi, publicarConvocatoriaApi, retirarConvocatoriaApi, obtenerPartidoApi, obtenerUsuario } from '../data/apiClient';
import { compartirWhatsApp } from '../data/compartir';
import { textoGrupoConvocatoria } from '../data/jugadorPublico';
import { diferenciasConvocatoria, resumenCambios, titularesDe, suplentesDe } from '../data/convocatoria';
import { textoPosiciones } from '../data/posiciones';

// Estado de un jugador para este partido concreto: 'no' | 'suplente' | 'titular'
// La plantilla en sí (altas/bajas de jugadores) la gestiona el delegado
// desde "Plantilla" en el Panel; aquí solo se elige quién va convocado.
export default function PlantillaScreen({ route, navigation }) {
  const { partidoId } = route.params;
  const [plantilla, setPlantilla] = useState([]);
  const [seleccion, setSeleccion] = useState({}); // { [jugadorId]: 'no' | 'suplente' | 'titular' }
  const [capitanId, setCapitanId] = useState(null);
  const [original, setOriginal] = useState({}); // lo que había guardado: { [jugadorId]: 'titular' | 'suplente' }
  const [capitanOriginal, setCapitanOriginal] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [publicacion, setPublicacion] = useState(null); // { publicada, vistos, convocados } o null si no se puede gestionar
  const [partido, setPartido] = useState(null);
  const [noDisponibles, setNoDisponibles] = useState([]);
  const [tarjetas, setTarjetas] = useState({}); // { [jugadorId]: { sancionado, motivo, apercibido } } para este partido

  const cargar = useCallback(async () => {
    setError('');
    try {
      const [jugadores, convocatoria] = await Promise.all([
        listarJugadoresApi(),
        obtenerConvocatoriaApi(partidoId),
      ]);
      setPlantilla(jugadores);
      obtenerNoDisponiblesApi().then(setNoDisponibles).catch(() => setNoDisponibles([]));
      // Apercibidos y sancionados para este partido (solo es un aviso; no impide convocar).
      Promise.all([cargarDatosTarjetasApi(), obtenerPartidoApi(partidoId), AsyncStorage.getItem('@ciclo_amarillas').catch(() => null)])
        .then(([datos, par, c]) => { const ciclo = CICLOS_POSIBLES.includes(Number(c)) ? Number(c) : CICLO_POR_DEFECTO; setTarjetas(estadoParaPartido(par, datos.todos, datos.eventos, datos.ajustes, ciclo)); })
        .catch(() => setTarjetas({}));
      try {
        const [u, pub, par] = await Promise.all([obtenerUsuario(), estadoPublicacionApi(partidoId), obtenerPartidoApi(partidoId)]);
        setPublicacion(['entrenador', 'segundo_entrenador'].includes(u?.role) ? pub : null);
        setPartido(par);
      } catch { setPublicacion(null); }
      const nuevaSeleccion = {};
      const guardada = {};
      let capitanEncontrado = null;
      convocatoria.forEach((c) => {
        const estado = c.titular ? 'titular' : 'suplente';
        nuevaSeleccion[c.jugador.id] = estado;
        guardada[c.jugador.id] = estado;
        if (c.capitan) capitanEncontrado = c.jugador.id;
      });
      setSeleccion(nuevaSeleccion);
      setCapitanId(capitanEncontrado);
      setOriginal(guardada);
      setCapitanOriginal(capitanEncontrado);
    } catch (err) {
      setError(err.message || 'No se pudo cargar la plantilla');
    } finally {
      setCargando(false);
    }
  }, [partidoId]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  const ciclarEstado = (jugadorId) => {
    setSeleccion((prev) => {
      const actual = prev[jugadorId] || 'no';
      const siguiente = actual === 'no' ? 'suplente' : actual === 'suplente' ? 'titular' : 'no';
      return { ...prev, [jugadorId]: siguiente };
    });
    // El capitán tiene que ser titular; si deja de serlo, se quita la marca.
    setCapitanId((prev) => {
      if (prev !== jugadorId) return prev;
      const actual = seleccion[jugadorId] || 'no';
      const siguiente = actual === 'no' ? 'suplente' : actual === 'suplente' ? 'titular' : 'no';
      return siguiente === 'titular' ? prev : null;
    });
  };

  const marcarCapitan = (jugadorId) => {
    setCapitanId((prev) => (prev === jugadorId ? null : jugadorId));
  };

  const titularesSeleccionados = titularesDe(seleccion);
  const suplentesSeleccionados = suplentesDe(seleccion);

  // ¿Ya había una convocatoria guardada? Entonces esto es una modificación (una baja de última hora, por ejemplo).
  const yaGuardada = Object.keys(original).length > 0;
  const nombrePorId = (id) => {
    const j = plantilla.find((x) => x.id === id);
    return j ? `${j.nombre} ${j.apellidos || ''}`.trim() : 'Jugador';
  };
  const cambios = diferenciasConvocatoria(original, seleccion, capitanOriginal, capitanId);
  const lineasCambios = resumenCambios(cambios, nombrePorId);

  // Sin dar de baja del club (los 'baja' no salen), salvo que ya estén en la convocatoria guardada. Por dorsal.
  const plantillaVisible = plantilla
    .filter((j) => j.estado !== 'baja' || original[j.id])
    .sort((a, b) => (a.dorsal ?? 999) - (b.dorsal ?? 999));

  const continuar = async () => {
    const jugadoresConvocados = Object.entries(seleccion)
      .filter(([, estado]) => estado !== 'no')
      .map(([jugadorId, estado]) => ({
        jugador_id: Number(jugadorId),
        titular: estado === 'titular',
        capitan: Number(jugadorId) === capitanId,
      }));

    setGuardando(true);
    try {
      await guardarConvocatoriaApi(partidoId, jugadoresConvocados);
      if (yaGuardada && cambios.hayCambios) {
        Alert.alert(
          'Convocatoria actualizada',
          `${lineasCambios.join('\n')}\n\nSi ya la habías enviado a los jugadores o al árbitro, vuelve a enviarla: lleva la lista anterior.`
        );
      }
      navigation.navigate('RegistroEventos', { partidoId });
    } catch (err) {
      Alert.alert('No se pudo guardar la convocatoria', err.message);
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

  return (
    <ScrollView style={styles.contenedor} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <Text style={styles.titulo}>{yaGuardada ? 'Cambiar la convocatoria' : 'Convocatoria'}</Text>
      <Text style={styles.subtitulo}>
        Toca un jugador para pasar de "no convocado" → "suplente" → "titular".
        Marca con 👑 quién es el capitán (solo entre los titulares).
      </Text>

      <View style={styles.resumenFila}>
        <Text style={styles.resumenTexto}>Titulares {titularesSeleccionados}/11</Text>
        <Text style={styles.resumenTexto}>Suplentes {suplentesSeleccionados}</Text>
        <Text style={styles.resumenTexto}>Convocados {titularesSeleccionados + suplentesSeleccionados}</Text>
      </View>

      {yaGuardada && cambios.hayCambios && (
        <View style={styles.cajaCambios}>
          <Text style={styles.cajaCambiosTitulo}>Cambios respecto a la convocatoria guardada</Text>
          {lineasCambios.map((l, i) => (
            <Text key={i} style={styles.cajaCambiosLinea}>• {l}</Text>
          ))}
          <Text style={styles.cajaCambiosPie}>Al guardar, acuérdate de volver a enviarla a jugadores y árbitro.</Text>
        </View>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.lista}>
        {plantillaVisible.map((j) => {
          const estado = seleccion[j.id] || 'no';
          const esCapitan = capitanId === j.id;
          return (
            <View
              key={j.id}
              style={[
                styles.fila,
                estado === 'titular' && styles.filaTitular,
                estado === 'suplente' && styles.filaSuplente,
              ]}
            >
              <TouchableOpacity style={styles.zonaNombre} onPress={() => ciclarEstado(j.id)}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.nombreJugador}>
                    {j.dorsal ? `#${j.dorsal} ` : ''}
                    {j.nombre} {j.apellidos}
                  </Text>
                  <Text style={styles.posicionJugador}>{textoPosiciones(j)}</Text>
                  {!!tarjetas[j.id] && tarjetas[j.id].sancionado && <Text style={[styles.avisoJugador, { color: '#dc2626', fontWeight: '700' }]}>⛔ Sancionado: {tarjetas[j.id].motivo}</Text>}
                  {!!tarjetas[j.id] && tarjetas[j.id].apercibido && <Text style={[styles.avisoJugador, { color: '#b45309', fontWeight: '700' }]}>🟨 Apercibido: una amarilla más cumple ciclo</Text>}
                  {noDisponibles.includes(j.id) && <Text style={[styles.avisoJugador, { color: '#dc2626', fontWeight: '700' }]}>🩹 No disponible</Text>}
                  {!!j.readaptacion && <Text style={styles.avisoJugador}>🩹 Readaptación: {j.readaptacion}</Text>}
                  {['lesionado', 'sancionado'].includes((j.estado || '').toLowerCase()) && (
                    <Text style={styles.avisoJugador}>⚠ Figura como {(j.estado || '').toLowerCase()} en la plantilla</Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.etiquetaEstado,
                    estado === 'titular' && styles.etiquetaTitular,
                    estado === 'suplente' && styles.etiquetaSuplente,
                  ]}
                >
                  {estado === 'titular' ? 'Titular' : estado === 'suplente' ? 'Suplente' : 'No convocado'}
                </Text>
              </TouchableOpacity>

              {estado === 'titular' && (
                <TouchableOpacity
                  style={[styles.botonCapitan, esCapitan && styles.botonCapitanActivo]}
                  onPress={() => marcarCapitan(j.id)}
                >
                  <Text style={styles.botonCapitanTexto}>{esCapitan ? '👑' : '☆'}</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
        {plantilla.length === 0 && (
          <Text style={styles.vacio}>
            Todavía no hay jugadores en la plantilla del club. Pídele al delegado que los dé de alta desde "Plantilla" en el Panel.
          </Text>
        )}
      </View>

      {yaGuardada && (
        <TouchableOpacity style={styles.botonSecundario} onPress={() => navigation.navigate('Alineacion', { partidoId })}>
          <Text style={styles.botonSecundarioTexto}>🧩 Alineación y cambios (sistema, 11 inicial)</Text>
        </TouchableOpacity>
      )}
      {yaGuardada && (
        <TouchableOpacity style={styles.botonSecundario} onPress={() => navigation.navigate('Abp', { partidoId })}>
          <Text style={styles.botonSecundarioTexto}>⚽ Balón parado (córners y faltas)</Text>
        </TouchableOpacity>
      )}

      {publicacion && yaGuardada && (
        <View style={styles.cajaPublicar}>
          <Text style={styles.cajaPublicarTitulo}>📣 Jugadores</Text>
          {publicacion.publicada ? (
            <>
              <Text style={styles.cajaPublicarTexto}>Publicada: cada jugador ve su situación en su enlace. La han visto {publicacion.vistos.filter((id) => publicacion.convocados.includes(id)).length} de {publicacion.convocados.length} convocados.</Text>
              <TouchableOpacity style={styles.botonSecundario} onPress={() => partido && compartirWhatsApp(textoGrupoConvocatoria(partido))}><Text style={styles.botonSecundarioTexto}>📲 Avisar al grupo</Text></TouchableOpacity>
              <TouchableOpacity style={styles.botonSecundario} onPress={async () => { try { setPublicacion({ ...publicacion, ...(await retirarConvocatoriaApi(partidoId)) }); } catch (e) { Alert.alert('No se pudo', e.message); } }}><Text style={styles.botonSecundarioTexto}>Retirar de los jugadores</Text></TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.cajaPublicarTexto}>Cuando la convocatoria esté cerrada, publícala: hasta entonces los jugadores no ven nada.</Text>
              <TouchableOpacity style={styles.botonSecundario} onPress={async () => { try { setPublicacion({ ...publicacion, ...(await publicarConvocatoriaApi(partidoId)) }); } catch (e) { Alert.alert('No se pudo publicar', e.message); } }}><Text style={styles.botonSecundarioTexto}>Publicar a los jugadores</Text></TouchableOpacity>
            </>
          )}
        </View>
      )}

      <TouchableOpacity style={styles.boton} onPress={continuar} disabled={guardando}>
        {guardando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botonTexto}>{yaGuardada ? 'Guardar cambios' : 'Continuar'}</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  cajaPublicar: { backgroundColor: '#f0fdf4', borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#bbf7d0' },
  cajaPublicarTitulo: { fontWeight: '800', color: '#166534', marginBottom: 4 },
  cajaPublicarTexto: { fontSize: 13, color: '#374151', marginBottom: 8, lineHeight: 18 },
  botonSecundario: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#16a34a', borderRadius: 10, padding: 10, alignItems: 'center', marginTop: 6 },
  botonSecundarioTexto: { color: '#166534', fontWeight: '700' },
  contenedor: { flex: 1, backgroundColor: '#f8fafc' },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  titulo: { fontSize: 24, fontWeight: '700', color: '#1a1a1a' },
  subtitulo: { fontSize: 13, color: '#6b7280', marginTop: 4, marginBottom: 16 },
  error: { color: '#dc2626', marginBottom: 12, fontSize: 13 },
  vacio: { fontSize: 13, color: '#9ca3af', textAlign: 'center', paddingVertical: 20 },
  lista: { marginBottom: 20 },
  fila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filaTitular: { backgroundColor: '#dcfce7', borderColor: '#86efac' },
  filaSuplente: { backgroundColor: '#fef9c3', borderColor: '#fde68a' },
  zonaNombre: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nombreJugador: { fontSize: 14, fontWeight: '600', color: '#111827' },
  posicionJugador: { fontSize: 11, color: '#6b7280', marginTop: 1 },
  avisoJugador: { fontSize: 11, color: '#dc2626', marginTop: 2 },
  resumenFila: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', paddingVertical: 10, paddingHorizontal: 14, marginBottom: 12 },
  resumenTexto: { fontSize: 12, fontWeight: '700', color: '#374151' },
  cajaCambios: { backgroundColor: '#fffbeb', borderRadius: 10, borderWidth: 1, borderColor: '#fde68a', padding: 12, marginBottom: 12 },
  cajaCambiosTitulo: { fontSize: 12, fontWeight: '800', color: '#92400e', marginBottom: 4 },
  cajaCambiosLinea: { fontSize: 12, color: '#78350f', marginTop: 2 },
  cajaCambiosPie: { fontSize: 11, color: '#92400e', marginTop: 8, fontStyle: 'italic' },
  botonCapitan: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#d1d5db',
    alignItems: 'center', justifyContent: 'center', marginLeft: 10, backgroundColor: '#ffffff',
  },
  botonCapitanActivo: { backgroundColor: '#fef9c3', borderColor: '#facc15' },
  botonCapitanTexto: { fontSize: 16 },
  etiquetaEstado: { fontSize: 11, fontWeight: '700', color: '#9ca3af' },
  etiquetaTitular: { color: '#16a34a' },
  etiquetaSuplente: { color: '#ca8a04' },
  boton: { backgroundColor: '#16a34a', borderRadius: 10, paddingVertical: 16, alignItems: 'center', marginTop: 10 },
  botonTexto: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  obtenerUsuario,
  obtenerSemanasCargaApi,
  listarJugadoresApi,
  guardarCargaEntrenamientoApi,
} from '../data/apiClient';
import { tipoDeSesion, lunesDeLaSemana } from '../data/planSesion';
import { cargaSesion, semanaCompleta, fatigaMediaEquipo } from '../data/carga';
import { formatearFechaCorta } from '../data/fecha';

const MINUTOS_ESPERA_RPE_PARTIDO = 5; // el RPE del partido se abre 5 min después de terminar
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function sumarDias(fechaISO, dias) {
  const [a, m, d] = fechaISO.split('-').map(Number);
  const f = new Date(Date.UTC(a, m - 1, d));
  f.setUTCDate(f.getUTCDate() + dias);
  return f.toISOString().slice(0, 10);
}

const nombreDia = (fechaISO) => {
  const [a, m, d] = fechaISO.split('-').map(Number);
  return DIAS[new Date(Date.UTC(a, m - 1, d)).getUTCDay()];
};

export default function RpeScreen({ navigation }) {
  const lunesActual = lunesDeLaSemana(hoyISO());
  const [lunes, setLunes] = useState(lunesActual);
  const [semanas, setSemanas] = useState([]);
  const [jugadores, setJugadores] = useState([]);
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [ahora, setAhora] = useState(Date.now());

  const [editando, setEditando] = useState(null); // entreno cuya carga se está editando
  const [duracion, setDuracion] = useState(75);
  const [rpe, setRpe] = useState(6);
  const [guardando, setGuardando] = useState(false);

  const puedeEditar = usuario?.role === 'preparador_fisico';

  const cargar = useCallback(async () => {
    setError('');
    try {
      const [u, sem, jug] = await Promise.all([obtenerUsuario(), obtenerSemanasCargaApi(lunes, 6), listarJugadoresApi()]);
      setUsuario(u);
      setSemanas(sem);
      setJugadores(jug);
    } catch (err) {
      setError(err.message || 'No se pudo cargar la carga semanal');
    } finally {
      setCargando(false);
    }
  }, [lunes]);

  // Se recarga al entrar y al volver de registrar el RPE de un partido.
  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  // Reloj para la espera de 5 minutos del partido
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const abrirCarga = (e) => {
    setDuracion(e.duracion_minutos || 75);
    setRpe(e.rpe_medio || 6);
    setEditando(e);
  };

  const guardarCarga = async (quitar = false) => {
    setGuardando(true);
    try {
      await guardarCargaEntrenamientoApi(editando.id, quitar ? null : duracion, quitar ? null : rpe);
      setEditando(null);
      await cargar();
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
  if (error || semanas.length === 0) {
    return (
      <View style={styles.centrado}>
        <Text style={styles.error}>{error || 'No hay datos'}</Text>
        <TouchableOpacity style={styles.botonReintentar} onPress={cargar}>
          <Text style={styles.botonReintentarTexto}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const semana = semanas[semanas.length - 1];
  const idsJugadores = jugadores.filter((j) => j.estado !== 'baja').map((j) => j.id);

  // Tarjetas de entreno: una por cada tipo (1, 2, 3); si no hay entreno de ese tipo, un hueco.
  const entrenos = semana.entrenamientos.map((e) => ({ ...e, tipo: tipoDeSesion(e, semana.entrenamientos).tipo }));
  const tarjetasEntreno = [];
  for (const n of [1, 2, 3]) {
    const de = entrenos.filter((e) => e.tipo === n);
    if (de.length === 0) tarjetasEntreno.push({ hueco: true, tipo: n });
    else de.forEach((e) => tarjetasEntreno.push(e));
  }

  const completa = semanaCompleta(semana);
  const faltan = [];
  if (semana.entrenamientos.length === 0) faltan.push('crear los entrenos de la semana');
  entrenos.filter((e) => cargaSesion(e.duracion_minutos, e.rpe_medio) == null).forEach((e) => faltan.push(`la carga del Entreno ${e.tipo}`));
  semana.partidos.filter((p) => p.estado === 'finalizado' && p.rpe.length === 0).forEach(() => faltan.push('el RPE del partido'));

  const casillas = semana.entrenamientos.length + semana.partidos.filter((p) => p.estado === 'finalizado').length;
  const rellenas =
    entrenos.filter((e) => cargaSesion(e.duracion_minutos, e.rpe_medio) != null).length +
    semana.partidos.filter((p) => p.estado === 'finalizado' && p.rpe.length > 0).length;

  const esActual = lunes === lunesActual;
  const domingo = sumarDias(lunes, 6);

  return (
    <View style={styles.contenedor}>
      <LinearGradient colors={['#16a34a', '#0d9488']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cabecera}>
        <Text style={styles.cabeceraTitulo}>RPE · carga semanal</Text>
        <View style={styles.filaSemana}>
          <TouchableOpacity style={styles.flecha} onPress={() => setLunes(sumarDias(lunes, -7))}>
            <Text style={styles.flechaTexto}>‹</Text>
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.semanaTexto}>{formatearFechaCorta(lunes).slice(0, 5)} – {formatearFechaCorta(domingo).slice(0, 5)}</Text>
            <Text style={styles.semanaSub}>{esActual ? 'Esta semana' : 'Semana pasada o anterior'} · {rellenas}/{casillas} casillas</Text>
          </View>
          <TouchableOpacity style={[styles.flecha, esActual && { opacity: 0.3 }]} disabled={esActual} onPress={() => setLunes(sumarDias(lunes, 7))}>
            <Text style={styles.flechaTexto}>›</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.barraProgreso}>
          <View style={[styles.barraProgresoRelleno, { width: `${casillas ? (rellenas / casillas) * 100 : 0}%` }]} />
        </View>
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingTop: 16, paddingBottom: 40 }}>
        {!puedeEditar && <Text style={styles.soloConsulta}>Solo consulta: la carga la registra el preparador físico.</Text>}

        <View style={styles.cuadricula}>
          {tarjetasEntreno.map((e) =>
            e.hueco ? (
              <View key={`hueco-${e.tipo}`} style={[styles.tarjeta, styles.tarjetaHueco]}>
                <Text style={styles.tarjetaEtiqueta}>Entreno {e.tipo}</Text>
                <Text style={styles.tarjetaDia}>Sin crear</Text>
              </View>
            ) : (
              <TarjetaEntreno key={e.id} e={e} puedeEditar={puedeEditar} onPress={() => abrirCarga(e)} />
            )
          )}
        </View>

        {semana.partidos.length === 0 ? (
          <View style={[styles.tarjetaAncha, styles.tarjetaHueco]}>
            <Text style={styles.tarjetaEtiqueta}>Partido</Text>
            <Text style={styles.tarjetaDia}>Sin partido esta semana</Text>
          </View>
        ) : (
          semana.partidos.map((p) => {
            const terminado = p.estado === 'finalizado';
            const espera = p.actualizado_en ? new Date(p.actualizado_en).getTime() + MINUTOS_ESPERA_RPE_PARTIDO * 60000 - ahora : 0;
            const registrado = p.rpe.length > 0;
            const abierto = terminado && espera <= 0;
            const puedeAbrir = abierto && (puedeEditar || registrado);
            let estado = 'Pendiente de terminar';
            if (terminado && espera > 0) estado = `Disponible en ${Math.ceil(espera / 60000)} min`;
            else if (abierto) estado = registrado ? `RPE de ${p.rpe.length} jugadores` : puedeEditar ? 'Toca para registrar el RPE' : 'Sin registrar todavía';
            return (
              <TouchableOpacity
                key={p.id}
                disabled={!puedeAbrir}
                style={[styles.tarjetaAncha, registrado && styles.tarjetaRellena, !puedeAbrir && styles.tarjetaHueco]}
                onPress={() => navigation.navigate('RpePartido', { partidoId: p.id })}
                activeOpacity={0.8}
              >
                <Text style={styles.tarjetaEmoji}>⚽</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tarjetaEtiqueta}>Partido · {formatearFechaCorta(p.fecha.slice(0, 10))}</Text>
                  <Text style={styles.tarjetaDia} numberOfLines={1}>{p.equipo_local} vs {p.equipo_visitante}</Text>
                  <Text style={[styles.tarjetaEstado, registrado && { color: '#16a34a' }]}>{estado}</Text>
                </View>
                {puedeAbrir && <Text style={styles.flechaTarjeta}>›</Text>}
              </TouchableOpacity>
            );
          })
        )}

        <LinearGradient
          colors={completa ? ['#16a34a', '#0d9488'] : ['#e5e7eb', '#e5e7eb']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cajaFatiga}
        >
          <Text style={[styles.fatigaTitulo, !completa && { color: '#6b7280' }]}>Fatiga media del equipo</Text>
          {completa ? (
            <Text style={styles.fatigaValor}>{fatigaMediaEquipo(semana, idsJugadores)}</Text>
          ) : (
            <Text style={styles.fatigaPendiente}>Falta: {faltan.length ? faltan.join(' · ') : 'completar la semana'}</Text>
          )}
        </LinearGradient>

        <TouchableOpacity style={styles.botonRiesgo} onPress={() => navigation.navigate('RpeRiesgo', { lunes })} activeOpacity={0.85}>
          <Text style={styles.botonRiesgoEmoji}>📊</Text>
          <Text style={styles.botonRiesgoTexto}>Ver riesgo de lesión por jugador</Text>
          <Text style={styles.botonRiesgoFlecha}>›</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={editando !== null} transparent animationType="slide">
        <View style={styles.modalFondo}>
          <View style={styles.modalContenido}>
            {editando && (
              <>
                <Text style={styles.modalTitulo}>Entreno {editando.tipo} · {nombreDia(editando.fecha)} {formatearFechaCorta(editando.fecha).slice(0, 5)}</Text>

                <Text style={styles.etiqueta}>Duración de la sesión</Text>
                <Ajuste valor={duracion} formato={(v) => `${v} min`} pasos={[-10, -5, 5, 10]} min={5} max={300} onCambiar={setDuracion} />

                <Text style={styles.etiqueta}>RPE medio del equipo (1-10)</Text>
                <Ajuste valor={rpe} formato={(v) => String(v)} pasos={[-1, -0.5, 0.5, 1]} min={0.5} max={10} onCambiar={setRpe} />

                <Text style={styles.previsualizacion}>Carga: {duracion} × {rpe} = {cargaSesion(duracion, rpe)}</Text>
                <Text style={styles.nota}>{editando.asistentes.length} jugadores asistieron según la lista del delegado; solo a ellos les cuenta esta carga.</Text>

                <View style={styles.modalBotones}>
                  <TouchableOpacity style={styles.botonCancelar} onPress={() => setEditando(null)}>
                    <Text style={styles.botonCancelarTexto}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.botonGuardar} onPress={() => guardarCarga(false)} disabled={guardando}>
                    {guardando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botonGuardarTexto}>Guardar</Text>}
                  </TouchableOpacity>
                </View>
                {cargaSesion(editando.duracion_minutos, editando.rpe_medio) != null && (
                  <TouchableOpacity onPress={() => guardarCarga(true)} disabled={guardando}>
                    <Text style={styles.quitar}>Quitar la carga registrada</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function TarjetaEntreno({ e, puedeEditar, onPress }) {
  const carga = cargaSesion(e.duracion_minutos, e.rpe_medio);
  return (
    <TouchableOpacity
      disabled={!puedeEditar}
      style={[styles.tarjeta, carga != null && styles.tarjetaRellena]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.tarjetaEtiqueta}>Entreno {e.tipo}</Text>
      <Text style={styles.tarjetaDia}>{nombreDia(e.fecha)} {formatearFechaCorta(e.fecha).slice(0, 5)}</Text>
      {carga != null ? <Text style={styles.tarjetaCarga}>{carga}</Text> : <Text style={styles.tarjetaPendiente}>Pendiente</Text>}
      <Text style={styles.tarjetaPie}>{e.asistentes.length} asistentes</Text>
    </TouchableOpacity>
  );
}

// Valor con botones de ajuste (sin teclado)
function Ajuste({ valor, formato, pasos, min, max, onCambiar }) {
  const mover = (p) => onCambiar(Math.min(max, Math.max(min, Math.round((valor + p) * 10) / 10)));
  return (
    <View style={styles.ajuste}>
      {pasos.slice(0, 2).map((p) => (
        <TouchableOpacity key={p} style={styles.ajusteBoton} onPress={() => mover(p)}>
          <Text style={styles.ajusteBotonTexto}>{p > 0 ? `+${p}` : `−${Math.abs(p)}`}</Text>
        </TouchableOpacity>
      ))}
      <Text style={styles.ajusteValor}>{formato(valor)}</Text>
      {pasos.slice(2).map((p) => (
        <TouchableOpacity key={p} style={styles.ajusteBoton} onPress={() => mover(p)}>
          <Text style={styles.ajusteBotonTexto}>{p > 0 ? `+${p}` : `−${Math.abs(p)}`}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#f8fafc' },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', padding: 24 },
  error: { color: '#dc2626', textAlign: 'center', marginBottom: 14 },
  botonReintentar: { backgroundColor: '#16a34a', borderRadius: 10, paddingHorizontal: 22, paddingVertical: 12 },
  botonReintentarTexto: { color: '#fff', fontWeight: '700' },
  cabecera: { paddingTop: 30, paddingBottom: 18, paddingHorizontal: 20 },
  cabeceraTitulo: { color: '#fff', fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 10 },
  filaSemana: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  flecha: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  flechaTexto: { color: '#fff', fontSize: 24, fontWeight: '700', marginTop: -2 },
  semanaTexto: { color: '#fff', fontSize: 17, fontWeight: '800' },
  semanaSub: { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 2 },
  barraProgreso: { height: 6, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 3, overflow: 'hidden' },
  barraProgresoRelleno: { height: '100%', backgroundColor: '#fff', borderRadius: 3 },
  soloConsulta: { fontSize: 11, color: '#2563eb', backgroundColor: '#eff6ff', borderRadius: 8, padding: 10, textAlign: 'center', marginBottom: 14 },
  cuadricula: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 },
  tarjeta: { width: '47%', backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1.5, borderColor: '#e5e7eb' },
  tarjetaAncha: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1.5, borderColor: '#bfdbfe', marginBottom: 16 },
  tarjetaRellena: { borderColor: '#86efac', backgroundColor: '#f0fdf4' },
  tarjetaHueco: { backgroundColor: '#f3f4f6', borderColor: '#e5e7eb', borderStyle: 'dashed' },
  tarjetaEmoji: { fontSize: 24, marginRight: 12 },
  tarjetaEtiqueta: { fontSize: 14, fontWeight: '800', color: '#111827' },
  tarjetaDia: { fontSize: 11, color: '#6b7280', marginTop: 1, marginBottom: 8, textTransform: 'capitalize' },
  tarjetaEstado: { fontSize: 12, fontWeight: '700', color: '#6b7280' },
  tarjetaCarga: { fontSize: 26, fontWeight: '800', color: '#16a34a' },
  tarjetaPendiente: { fontSize: 12, fontWeight: '700', color: '#9ca3af', marginTop: 4 },
  tarjetaPie: { fontSize: 10, color: '#9ca3af', marginTop: 4 },
  flechaTarjeta: { fontSize: 24, color: '#9ca3af' },
  cajaFatiga: { borderRadius: 18, padding: 22, alignItems: 'center', marginBottom: 16 },
  fatigaTitulo: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  fatigaValor: { color: '#fff', fontSize: 40, fontWeight: '800', marginTop: 6 },
  fatigaPendiente: { color: '#6b7280', fontSize: 12, marginTop: 8, textAlign: 'center' },
  botonRiesgo: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827', borderRadius: 14, paddingVertical: 16, paddingHorizontal: 18 },
  botonRiesgoEmoji: { fontSize: 18, marginRight: 10 },
  botonRiesgoTexto: { color: '#fff', fontWeight: '700', fontSize: 14, flex: 1 },
  botonRiesgoFlecha: { color: '#9ca3af', fontSize: 20 },
  modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContenido: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitulo: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 6 },
  etiqueta: { fontSize: 12, fontWeight: '600', color: '#6b7280', marginTop: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  ajuste: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 },
  ajusteBoton: { minWidth: 48, paddingVertical: 12, borderRadius: 10, backgroundColor: '#f3f4f6', alignItems: 'center' },
  ajusteBotonTexto: { fontWeight: '800', color: '#374151', fontSize: 14 },
  ajusteValor: { fontSize: 24, fontWeight: '800', color: '#111827', minWidth: 90, textAlign: 'center' },
  previsualizacion: { marginTop: 16, fontSize: 15, color: '#16a34a', fontWeight: '800', textAlign: 'center' },
  nota: { fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 6 },
  modalBotones: { flexDirection: 'row', gap: 10, marginTop: 18 },
  botonCancelar: { flex: 1, paddingVertical: 14, borderRadius: 10, backgroundColor: '#f3f4f6', alignItems: 'center' },
  botonCancelarTexto: { color: '#374151', fontWeight: '600' },
  botonGuardar: { flex: 1, paddingVertical: 14, borderRadius: 10, backgroundColor: '#16a34a', alignItems: 'center' },
  botonGuardarTexto: { color: '#fff', fontWeight: '700' },
  quitar: { color: '#dc2626', fontSize: 12, fontWeight: '700', textAlign: 'center', marginTop: 14 },
});

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { verPaginaJugadorApi, confirmarEntrenoJugadorApi, enviarBienestarJugadorApi, avisarRetrasoJugadorApi, vistoConvocatoriaJugadorApi } from '../data/apiClient';
import { formatearFechaCorta } from '../data/fecha';
import { RESPUESTAS, PREGUNTAS_BIENESTAR, MINUTOS_RETRASO } from '../data/jugadorPublico';

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const nombreDia = (f) => DIAS[new Date(`${f}T00:00:00Z`).getUTCDay()];
const COLOR = { voy: '#16a34a', no_voy: '#dc2626', duda: '#ca8a04' };

// Página del jugador (sin cuenta). Se abre con el enlace personal.
export default function JugadorPublicoScreen({ token }) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [motivos, setMotivos] = useState({});   // { [entrenoId]: texto }
  const [pidiendo, setPidiendo] = useState(null); // entreno al que se le está escribiendo el motivo
  const [bien, setBien] = useState({ sueno: 0, cansancio: 0, dolor: 0, animo: 0, molestias: '' });
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    try { setDatos(await verPaginaJugadorApi(token)); } catch (e) { setError(e.message); }
  }, [token]);
  useEffect(() => { cargar(); }, [cargar]);

  const responder = async (entreno, respuesta) => {
    setAviso('');
    if (respuesta !== 'voy' && pidiendo !== entreno.id) { setPidiendo(entreno.id); setMotivos((m) => ({ ...m, [entreno.id]: m[entreno.id] ?? entreno.motivo ?? '' })); return; }
    try {
      await confirmarEntrenoJugadorApi(token, entreno.id, respuesta, respuesta === 'voy' ? null : (motivos[entreno.id] || '').trim());
      setPidiendo(null);
      setAviso('Anotado ✔');
      await cargar();
    } catch (e) { setAviso(e.message); }
  };

  const completo = PREGUNTAS_BIENESTAR.every((p) => bien[p.campo] > 0);
  const avisarRetraso = async (entreno, minutos) => {
    setAviso('');
    try { await avisarRetrasoJugadorApi(token, entreno.id, entreno.retraso === minutos ? 0 : minutos); setAviso('Anotado ✔'); await cargar(); } catch (e) { setAviso(e.message); }
  };
  const marcarVisto = async (partido) => {
    setAviso('');
    try { await vistoConvocatoriaJugadorApi(token, partido.id); setAviso('Gracias, anotado ✔'); await cargar(); } catch (e) { setAviso(e.message); }
  };

  const enviarBienestar = async () => {
    setEnviando(true); setAviso('');
    try {
      await enviarBienestarJugadorApi(token, { sueno: bien.sueno, cansancio: bien.cansancio, dolor: bien.dolor, animo: bien.animo, molestias: bien.molestias.trim() || null });
      setAviso('Gracias, enviado ✔');
      await cargar();
    } catch (e) { setAviso(e.message); } finally { setEnviando(false); }
  };

  if (error) return <View style={styles.centrado}><Text style={styles.error}>{error}</Text></View>;
  if (!datos) return <View style={styles.centrado}><ActivityIndicator size="large" color="#16a34a" /></View>;

  return (
    <ScrollView style={styles.fondo} contentContainerStyle={{ padding: 18, paddingTop: 36, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
      <Text style={styles.hola}>Hola, {datos.nombre} 👋</Text>
      <Text style={styles.sub}>C.D. Herrera · tu página personal</Text>
      {!!aviso && <Text style={styles.aviso}>{aviso}</Text>}

      {datos.partidos && datos.partidos.length > 0 && <Text style={styles.seccion}>Partido</Text>}
      {(datos.partidos || []).map((p) => (
        <View key={p.id} style={[styles.tarjeta, { borderColor: p.convocado ? '#16a34a' : '#e5e7eb' }]}>
          <Text style={styles.titulo}>{nombreDia(p.fecha)} {formatearFechaCorta(p.fecha).slice(0, 5)} · vs {p.rival}</Text>
          <Text style={styles.detalle}>{p.es_local ? '🏠 En casa' : '🚌 Fuera'}{p.lugar ? ` · ${p.lugar}` : ''}</Text>
          <Text style={[styles.estado, { color: p.convocado ? '#166534' : '#6b7280' }]}>
            {p.convocado ? '✅ Estás convocado' : 'Esta vez no entras en la convocatoria'}
          </Text>
          {p.convocado && !!(p.hora_citacion || p.lugar_citacion) && (
            <Text style={styles.detalle}>🕒 Concentración {[p.hora_citacion, p.lugar_citacion].filter(Boolean).join(' · ')}</Text>
          )}
          <TouchableOpacity style={[styles.boton, p.visto && { backgroundColor: '#16a34a', borderColor: '#16a34a' }, { marginTop: 10 }]} onPress={() => !p.visto && marcarVisto(p)} disabled={p.visto}>
            <Text style={[styles.botonTexto, p.visto && { color: '#fff' }]}>{p.visto ? 'Visto ✔' : 'Marcar como visto'}</Text>
          </TouchableOpacity>
        </View>
      ))}

      <Text style={styles.seccion}>¿Vienes a entrenar?</Text>
      {datos.entrenos.length === 0 && <Text style={styles.vacio}>No hay entrenos programados.</Text>}
      {datos.entrenos.map((e) => (
        <View key={e.id} style={styles.tarjeta}>
          <Text style={styles.titulo}>{nombreDia(e.fecha)} {formatearFechaCorta(e.fecha).slice(0, 5)}{e.hora ? ` · ${e.hora}` : ''}</Text>
          {!!e.lugar && <Text style={styles.detalle}>🏟️ {e.lugar}</Text>}
          <View style={styles.fila}>
            {Object.entries(RESPUESTAS).map(([clave, texto]) => (
              <TouchableOpacity key={clave} style={[styles.boton, e.respuesta === clave && { backgroundColor: COLOR[clave], borderColor: COLOR[clave] }]} onPress={() => responder(e, clave)}>
                <Text style={[styles.botonTexto, e.respuesta === clave && { color: '#fff' }]}>{texto}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {e.fecha === datos.hoy && e.respuesta !== 'no_voy' && (
            <View style={{ marginTop: 10 }}>
              <Text style={styles.detalle}>¿Llegas tarde hoy?</Text>
              <View style={styles.fila}>
                {MINUTOS_RETRASO.map((m) => (
                  <TouchableOpacity key={m} style={[styles.boton, e.retraso === m && { backgroundColor: '#ca8a04', borderColor: '#ca8a04' }]} onPress={() => avisarRetraso(e, m)}>
                    <Text style={[styles.botonTexto, e.retraso === m && { color: '#fff' }]}>{m} min</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
          {e.respuesta && e.respuesta !== 'voy' && e.motivo && pidiendo !== e.id ? <Text style={styles.detalle}>Motivo: {e.motivo}</Text> : null}
          {pidiendo === e.id && (
            <View style={{ marginTop: 8 }}>
              <TextInput style={styles.input} placeholder="¿Por qué? (examen, lesión, trabajo…)" value={motivos[e.id] || ''} onChangeText={(t) => setMotivos((m) => ({ ...m, [e.id]: t }))} maxLength={120} />
              <View style={styles.fila}>
                <TouchableOpacity style={[styles.boton, { backgroundColor: COLOR.no_voy, borderColor: COLOR.no_voy }]} onPress={() => responder(e, 'no_voy')}><Text style={[styles.botonTexto, { color: '#fff' }]}>No voy</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.boton, { backgroundColor: COLOR.duda, borderColor: COLOR.duda }]} onPress={() => responder(e, 'duda')}><Text style={[styles.botonTexto, { color: '#fff' }]}>Tengo dudas</Text></TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      ))}

      <Text style={styles.seccion}>¿Cómo estás hoy?</Text>
      {datos.bienestar_hoy ? (
        <Text style={styles.vacio}>Hoy ya lo has contestado. Puedes cambiarlo si quieres.</Text>
      ) : null}
      <View style={styles.tarjeta}>
        {PREGUNTAS_BIENESTAR.map((p) => (
          <View key={p.campo} style={{ marginBottom: 12 }}>
            <Text style={styles.pregunta}>{p.texto}</Text>
            <View style={styles.fila}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity key={n} style={[styles.numero, bien[p.campo] === n && styles.numeroActivo]} onPress={() => setBien((b) => ({ ...b, [p.campo]: n }))}>
                  <Text style={[styles.numeroTexto, bien[p.campo] === n && { color: '#fff' }]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.extremos}><Text style={styles.extremo}>1 · {p.bajo}</Text><Text style={styles.extremo}>5 · {p.alto}</Text></View>
          </View>
        ))}
        <TextInput style={styles.input} placeholder="¿Alguna molestia? (opcional)" value={bien.molestias} onChangeText={(t) => setBien((b) => ({ ...b, molestias: t }))} maxLength={200} />
        <TouchableOpacity style={[styles.enviar, !completo && { opacity: 0.4 }]} disabled={!completo || enviando} onPress={enviarBienestar}>
          <Text style={styles.enviarTexto}>{enviando ? 'Enviando…' : 'Enviar'}</Text>
        </TouchableOpacity>
        <Text style={styles.privacidad}>Solo lo ven el entrenador, el segundo entrenador y el preparador físico, para cuidar tu carga de trabajo. Si prefieres no contestar, no pasa nada.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: '#f8fafc' },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#f8fafc' },
  error: { color: '#dc2626', textAlign: 'center', fontSize: 15 },
  hola: { fontSize: 24, fontWeight: '800', color: '#111827' },
  sub: { fontSize: 13, color: '#6b7280', marginBottom: 10 },
  aviso: { backgroundColor: '#dcfce7', color: '#166534', padding: 10, borderRadius: 10, marginVertical: 8, fontWeight: '700' },
  seccion: { fontSize: 12, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', marginTop: 18, marginBottom: 8 },
  vacio: { color: '#9ca3af', marginBottom: 8 },
  tarjeta: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1.5, borderColor: '#e5e7eb' },
  titulo: { fontSize: 16, fontWeight: '800', color: '#111827', textTransform: 'capitalize' },
  estado: { fontSize: 14, fontWeight: '700', marginTop: 6 },
  detalle: { fontSize: 13, color: '#6b7280', marginTop: 3 },
  fila: { flexDirection: 'row', gap: 8, marginTop: 10 },
  boton: { flex: 1, borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 10, paddingVertical: 12, alignItems: 'center', backgroundColor: '#fff' },
  botonTexto: { fontWeight: '800', color: '#374151' },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 10, fontSize: 15, backgroundColor: '#fff' },
  pregunta: { fontSize: 14, fontWeight: '700', color: '#111827' },
  numero: { flex: 1, borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  numeroActivo: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  numeroTexto: { fontWeight: '800', color: '#374151' },
  extremos: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 },
  extremo: { fontSize: 11, color: '#9ca3af' },
  enviar: { backgroundColor: '#16a34a', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 12 },
  enviarTexto: { color: '#fff', fontWeight: '800' },
  privacidad: { fontSize: 11, color: '#9ca3af', marginTop: 10, lineHeight: 15 },
});

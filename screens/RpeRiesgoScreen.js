import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { obtenerSemanasCargaApi, listarJugadoresApi } from '../data/apiClient';
import { riesgoJugador, semanaCompleta, ZONAS, MIN_SEMANAS_CRONICAS, SEMANAS_CRONICAS } from '../data/carga';
import { formatearFechaCorta } from '../data/fecha';

const ORDEN_ZONA = { riesgo: 0, atencion: 1, segura: 2, sin_datos: 3, semana_incompleta: 4 };
const ESCALA_MAXIMA = 2.0;

function sumarDias(fechaISO, dias) {
  const [a, m, d] = fechaISO.split('-').map(Number);
  const f = new Date(Date.UTC(a, m - 1, d));
  f.setUTCDate(f.getUTCDate() + dias);
  return f.toISOString().slice(0, 10);
}

export default function RpeRiesgoScreen({ route }) {
  const { lunes } = route.params;
  const [semanas, setSemanas] = useState([]);
  const [jugadores, setJugadores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setError('');
    try {
      const [sem, jug] = await Promise.all([obtenerSemanasCargaApi(lunes, 6), listarJugadoresApi()]);
      setSemanas(sem);
      setJugadores(jug);
    } catch (err) {
      setError(err.message || 'No se pudo cargar el riesgo');
    } finally {
      setCargando(false);
    }
  }, [lunes]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  if (cargando) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color="#dc2626" />
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

  const indice = semanas.length - 1;
  const completa = semanaCompleta(semanas[indice]);
  const filas = jugadores
    .filter((j) => j.estado !== 'baja')
    .map((j) => ({ jugador: j, ...riesgoJugador(semanas, indice, j.id) }));
  const conCarga = filas
    .filter((f) => f.carga > 0)
    .sort((a, b) => ORDEN_ZONA[a.zona] - ORDEN_ZONA[b.zona] || (b.ratio ?? -1) - (a.ratio ?? -1) || b.carga - a.carga);
  const sinCarga = filas.length - conCarga.length;
  const enRiesgo = conCarga.filter((f) => f.zona === 'riesgo').length;
  const semanasUsadas = filas.length ? filas[0].semanasUsadas : 0;
  const faltanSemanas = completa && semanasUsadas < MIN_SEMANAS_CRONICAS;
  const domingo = sumarDias(lunes, 6);

  return (
    <View style={styles.contenedor}>
      <LinearGradient colors={['#dc2626', '#ea580c']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cabecera}>
        <Text style={styles.cabeceraEmoji}>🩺</Text>
        <Text style={styles.cabeceraTitulo}>Riesgo de lesión</Text>
        <Text style={styles.cabeceraSub}>Semana {formatearFechaCorta(lunes).slice(0, 5)} – {formatearFechaCorta(domingo).slice(0, 5)}</Text>
        <Text style={styles.cabeceraSub}>
          {!completa ? 'Semana incompleta' : faltanSemanas ? 'Faltan semanas anteriores' : enRiesgo > 0 ? `${enRiesgo} jugador${enRiesgo > 1 ? 'es' : ''} en riesgo alto` : 'Nadie en riesgo alto'}
        </Text>
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingTop: 16, paddingBottom: 40 }}>
        {!completa && (
          <Text style={styles.avisoGris}>
            La semana todavía no está completa (faltan cargas de entrenos o el RPE del partido). Se muestra la carga de cada jugador; el semáforo aparece cuando esté completa.
          </Text>
        )}
        {faltanSemanas && (
          <Text style={styles.avisoGris}>
            Para calcular el riesgo hacen falta al menos {MIN_SEMANAS_CRONICAS} semanas completas anteriores (hay {semanasUsadas}). Se compara con la media de las últimas {SEMANAS_CRONICAS}.
          </Text>
        )}

        <View style={styles.leyenda}>
          <LeyendaItem color="#16a34a" texto="0.8 – 1.3 Zona segura" />
          <LeyendaItem color="#ca8a04" texto="Atención" />
          <LeyendaItem color="#dc2626" texto="> 1.5 Riesgo alto" />
        </View>

        {conCarga.length === 0 && <Text style={styles.avisoGris}>Todavía no hay carga registrada esta semana.</Text>}

        {conCarga.map(({ jugador: j, ratio, zona, carga }) => {
          const estilo = ZONAS[zona];
          const porcentaje = ratio != null ? Math.min(100, (ratio / ESCALA_MAXIMA) * 100) : 0;
          return (
            <View key={j.id} style={styles.tarjeta}>
              <View style={[styles.franja, { backgroundColor: estilo.color }]} />
              <View style={styles.tarjetaContenido}>
                <View style={styles.filaCabecera}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.nombre}>{j.dorsal ? `#${j.dorsal} ` : ''}{j.nombre} {j.apellidos}</Text>
                    <View style={[styles.pildora, { backgroundColor: estilo.fondo }]}>
                      <Text style={[styles.pildoraTexto, { color: estilo.color }]}>{estilo.texto}</Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.ratio, { color: estilo.color }]}>{ratio != null ? ratio.toFixed(2) : '—'}</Text>
                    <Text style={styles.cargaTexto}>carga {carga}</Text>
                  </View>
                </View>
                {ratio != null && (
                  <View style={styles.medidor}>
                    <View style={styles.medidorFondo}>
                      <View style={[styles.medidorSegura, { left: `${(0.8 / ESCALA_MAXIMA) * 100}%`, width: `${((1.3 - 0.8) / ESCALA_MAXIMA) * 100}%` }]} />
                    </View>
                    <View style={[styles.medidorMarcador, { left: `${porcentaje}%`, backgroundColor: estilo.color }]} />
                  </View>
                )}
              </View>
            </View>
          );
        })}

        {sinCarga > 0 && conCarga.length > 0 && <Text style={styles.pie}>{sinCarga} jugador{sinCarga > 1 ? 'es' : ''} sin carga esta semana (no entrenaron ni jugaron).</Text>}
        <Text style={styles.metodo}>
          Ratio = carga de esta semana ÷ media de la carga de las últimas {SEMANAS_CRONICAS} semanas completas. La carga de un entreno es duración × RPE medio (solo para quien asistió); la del partido, el RPE de cada jugador × sus minutos.
        </Text>
      </ScrollView>
    </View>
  );
}

function LeyendaItem({ color, texto }) {
  return (
    <View style={styles.leyendaItem}>
      <View style={[styles.leyendaPunto, { backgroundColor: color }]} />
      <Text style={styles.leyendaTexto}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#f8fafc' },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', padding: 24 },
  error: { color: '#dc2626', textAlign: 'center', marginBottom: 14 },
  botonReintentar: { backgroundColor: '#dc2626', borderRadius: 10, paddingHorizontal: 22, paddingVertical: 12 },
  botonReintentarTexto: { color: '#fff', fontWeight: '700' },
  cabecera: { paddingTop: 28, paddingBottom: 20, paddingHorizontal: 24, alignItems: 'center' },
  cabeceraEmoji: { fontSize: 28, marginBottom: 4 },
  cabeceraTitulo: { color: '#fff', fontSize: 21, fontWeight: '800' },
  cabeceraSub: { color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 3, fontWeight: '600' },
  avisoGris: { fontSize: 12, color: '#6b7280', backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', padding: 14, marginBottom: 12 },
  leyenda: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  leyendaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  leyendaPunto: { width: 8, height: 8, borderRadius: 4 },
  leyendaTexto: { fontSize: 10, color: '#6b7280', fontWeight: '600' },
  tarjeta: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#f3f4f6' },
  franja: { width: 6 },
  tarjetaContenido: { flex: 1, padding: 16 },
  filaCabecera: { flexDirection: 'row', alignItems: 'center' },
  nombre: { fontSize: 14, fontWeight: '800', color: '#111827' },
  pildora: { alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, marginTop: 5 },
  pildoraTexto: { fontSize: 10, fontWeight: '700' },
  ratio: { fontSize: 26, fontWeight: '800' },
  cargaTexto: { fontSize: 10, color: '#9ca3af', marginTop: 1 },
  medidor: { marginTop: 14, height: 8, justifyContent: 'center' },
  medidorFondo: { height: 6, backgroundColor: '#f3f4f6', borderRadius: 3, overflow: 'hidden' },
  medidorSegura: { position: 'absolute', height: 6, backgroundColor: '#dcfce7' },
  medidorMarcador: { position: 'absolute', width: 14, height: 14, borderRadius: 7, top: -4, marginLeft: -7, borderWidth: 2, borderColor: '#fff' },
  pie: { fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 4, marginBottom: 12 },
  metodo: { fontSize: 11, color: '#9ca3af', lineHeight: 16, marginTop: 8 },
});

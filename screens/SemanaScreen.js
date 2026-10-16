import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  listarEntrenamientosApi,
  listarJugadoresApi,
  listarPartidosApi,
  listarPlantillasEntrenoApi,
  listarTareasApi,
  obtenerSemanasCargaApi,
  obtenerAsistenciasApi,
  obtenerScoutingApi,
} from '../data/apiClient';
import { tipoDeSesion, lunesDeLaSemana } from '../data/planSesion';
import { construirSesion } from '../data/sesion';
import { cargarPartidoPrevio, minutosPorJugador } from '../data/contextoPartido';
import { pesosGrupos } from '../data/partidoPrevio';
import { cargaPrevista, formatoPct } from '../data/cargaPlanificada';
import { serieCarga, avisoSubida } from '../data/cargaSemanas';
import { construirVistaSemana, COLOR_VEREDICTO, ETIQUETA_VEREDICTO } from '../data/vistaSemana';
import { formatearFechaCorta } from '../data/fecha';
import { compartirWhatsApp } from '../data/compartir';
import { resumenAsistencia, proximoPartido, golesDelRival, textoResumenSemana } from '../data/resumenSemana';

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

export default function SemanaScreen({ navigation }) {
  const lunesActual = lunesDeLaSemana(hoyISO());
  const [lunes, setLunes] = useState(lunesActual);
  const [vista, setVista] = useState(null);
  const [rival, setRival] = useState(null);
  const [serie, setSerie] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setError('');
    try {
      const [todos, plantillas, semanas, jugadores, partidos] = await Promise.all([
        listarEntrenamientosApi(),
        listarPlantillasEntrenoApi().catch(() => null),
        obtenerSemanasCargaApi(lunes, 6),
        listarJugadoresApi().catch(() => []),
        listarPartidosApi().catch(() => []),
      ]);
      setSerie(serieCarga(semanas));
      const activos = jugadores.filter((j) => j.estado !== 'baja');
      const semana = semanas[semanas.length - 1];
      const anterior = semanas.length > 1 ? semanas[semanas.length - 2] : null;
      const deLaSemana = todos.filter((e) => lunesDeLaSemana(e.fecha) === lunes);
      const entrenos = await Promise.all(
        deLaSemana.map(async (e) => {
          const { tipo } = tipoDeSesion(e, todos);
          const tareas = await listarTareasApi(e.id).catch(() => null);
          const asistencia = resumenAsistencia(await obtenerAsistenciasApi(e.id).catch(() => null));
          const real = semana.entrenamientos.find((x) => x.id === e.id);
          let previsto = null;
          if (tareas && tareas.length > 0) {
            const plantilla = plantillas ? plantillas.find((p) => p.numero === tipo) : null;
            // Entreno 1: cada grupo pesa según la gente que lleva (minutos del partido anterior).
            let pesos = null;
            if (tipo === 1) pesos = pesosGrupos(activos, minutosPorJugador(await cargarPartidoPrevio(e, todos, partidos).catch(() => null)));
            previsto = cargaPrevista(construirSesion({ entrenamiento: e, plantilla, tareas, tipo }), pesos || undefined);
          }
          return {
            id: e.id, fecha: e.fecha, hora: (e.hora || '').slice(0, 5), tipo,
            duracion_minutos: real ? real.duracion_minutos : null,
            rpe_medio: real ? real.rpe_medio : null,
            previsto, asistencia,
          };
        })
      );
      const fechasPartidos = [...semana.partidos, ...(anterior ? anterior.partidos : [])].map((p) => p.fecha.slice(0, 10));
      setVista(construirVistaSemana({ entrenos, partidos: semana.partidos, fechasPartidos }));
      // Próximo rival y sus goles por tramos (solo tiene sentido en la semana actual).
      try {
        const prox = lunes === lunesDeLaSemana(hoyISO()) ? proximoPartido(partidos, hoyISO()) : null;
        if (prox) {
          const scouting = await obtenerScoutingApi().catch(() => ({}));
          setRival({ nombre: prox.rival, fecha: prox.fecha, goles: golesDelRival(scouting, prox.rival) });
        } else setRival(null);
      } catch { setRival(null); }
    } catch (err) {
      setError(err.message || 'No se pudo cargar la semana');
    } finally {
      setCargando(false);
    }
  }, [lunes]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  const cambiarSemana = (dias) => {
    setCargando(true);
    setLunes(sumarDias(lunes, dias));
  };

  const esActual = lunes === lunesActual;
  const domingo = sumarDias(lunes, 6);

  const cabecera = (
    <LinearGradient colors={['#2563eb', '#7c3aed']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cabecera}>
      <Text style={styles.cabeceraTitulo}>Semana · previsto y real</Text>
      <View style={styles.filaSemana}>
        <TouchableOpacity style={styles.flecha} onPress={() => cambiarSemana(-7)}>
          <Text style={styles.flechaTexto}>‹</Text>
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.semanaTexto}>{formatearFechaCorta(lunes).slice(0, 5)} – {formatearFechaCorta(domingo).slice(0, 5)}</Text>
          <Text style={styles.semanaSub}>{esActual ? 'Esta semana' : 'Otra semana'}</Text>
        </View>
        <TouchableOpacity style={[styles.flecha, esActual && { opacity: 0.3 }]} disabled={esActual} onPress={() => cambiarSemana(7)}>
          <Text style={styles.flechaTexto}>›</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );

  if (cargando) {
    return (
      <View style={styles.contenedor}>
        {cabecera}
        <View style={styles.centrado}><ActivityIndicator size="large" color="#7c3aed" /></View>
      </View>
    );
  }
  if (error || !vista) {
    return (
      <View style={styles.contenedor}>
        {cabecera}
        <View style={styles.centrado}>
          <Text style={styles.error}>{error || 'No hay datos'}</Text>
          <TouchableOpacity style={styles.botonReintentar} onPress={cargar}>
            <Text style={styles.botonReintentarTexto}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const { filas, partidos, escala, comparable, lectura, cargaRealSemana } = vista;
  const compartir = () => compartirWhatsApp(textoResumenSemana({ lunes, domingo, filas, partidos, cargaRealSemana, comparable, rival }));
  const conLista = filas.filter((f) => f.asistencia);
  const asistMedia = conLista.length ? Math.round((conLista.reduce((s, f) => s + f.asistencia.presentes, 0) / conLista.reduce((x, f) => x + f.asistencia.total, 0)) * 100) : null;
  const ancho = (valor) => `${Math.max(2, Math.round((valor / escala) * 100))}%`;

  return (
    <View style={styles.contenedor}>
      {cabecera}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {filas.length === 0 && partidos.length === 0 && (
          <Text style={styles.vacio}>No hay entrenos ni partido esta semana.</Text>
        )}

        <TouchableOpacity style={styles.botonCompartir} onPress={compartir} activeOpacity={0.85}>
          <Text style={styles.botonCompartirTexto}>📲  Compartir el resumen de la semana</Text>
        </TouchableOpacity>

        {asistMedia !== null && (
          <Text style={styles.pie}>Asistencia media a los entrenos con lista: {asistMedia} %</Text>
        )}

        {serie.some((x) => x.carga > 0) && (
          <View style={styles.resumen}>
            <Text style={styles.resumenTitulo}>Carga del equipo · últimas 6 semanas</Text>
            {serie.map((x) => {
              const max = Math.max(...serie.map((y) => y.carga), 1);
              return (
                <View key={x.lunes} style={styles.barraFila}>
                  <View style={styles.barraCabecera}>
                    <Text style={styles.barraNombre}>Semana del {formatearFechaCorta(x.lunes).slice(0, 5)}{x.lunes === lunes ? ' (esta)' : ''}</Text>
                    <Text style={styles.barraValor}>{x.carga || '—'}{x.subidaBrusca ? '  ⚠️' : ''}</Text>
                  </View>
                  <View style={styles.barraFondo}>
                    <View style={[styles.barraRelleno, { width: `${Math.max(2, Math.round((x.carga / max) * 100))}%`, backgroundColor: x.subidaBrusca ? '#f59e0b' : '#16a34a' }]} />
                  </View>
                </View>
              );
            })}
            {!!avisoSubida(serie) && serie[serie.length - 1].lunes === lunes && <Text style={styles.nota}>{avisoSubida(serie)}</Text>}
            <Text style={styles.nota}>Entrenos (duración × RPE) más el partido medio por jugador. ⚠️ = más de 1,3 veces la media de las 3 semanas anteriores.</Text>
          </View>
        )}

        {rival && (
          <View style={[styles.tarjeta, { borderColor: '#ddd6fe' }]}>
            <Text style={styles.tarjetaTitulo}>Próximo rival · {rival.nombre}</Text>
            <Text style={styles.tarjetaDia}>{nombreDia(rival.fecha)} {formatearFechaCorta(rival.fecha).slice(0, 5)}</Text>
            <Text style={styles.partidoDato}>{rival.goles && rival.goles.texto ? `Goles: ${rival.goles.texto}` : 'Todavía no hay goles por tramos en su informe.'}</Text>
          </View>
        )}

        {comparable && (
          <View style={styles.resumen}>
            <Text style={styles.resumenTitulo}>Carga de los entrenos con RPE ({comparable.sesiones})</Text>
            <View style={styles.resumenFila}>
              <Dato etiqueta="Previsto" valor={String(comparable.previsto)} />
              <Dato etiqueta="Real" valor={String(comparable.real)} />
              <Dato etiqueta="Diferencia" valor={formatoPct(comparable.pct) || '—'} destacado />
            </View>
          </View>
        )}

        {lectura.length > 0 && (
          <View style={styles.lectura}>
            {lectura.map((f, i) => <Text key={i} style={styles.lecturaTexto}>• {f}</Text>)}
          </View>
        )}

        {filas.map((f) => (
          <TouchableOpacity
            key={f.id}
            style={styles.tarjeta}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('SesionCompleta', { entrenamientoId: f.id })}
          >
            <View style={styles.tarjetaCabecera}>
              <View style={{ flex: 1 }}>
                <Text style={styles.tarjetaTitulo}>Entreno {f.tipo}{f.md ? ` · ${f.md}` : ''}</Text>
                <Text style={styles.tarjetaDia}>{nombreDia(f.fecha)} {formatearFechaCorta(f.fecha).slice(0, 5)}{f.hora ? ` · ${f.hora}` : ''}</Text>
              </View>
              <View style={[styles.etiqueta, { backgroundColor: COLOR_VEREDICTO[f.veredicto] }]}>
                <Text style={styles.etiquetaTexto}>{ETIQUETA_VEREDICTO[f.veredicto]}</Text>
              </View>
            </View>

            <Barra nombre="Previsto" valor={f.previsto ? f.previsto.carga : null} ancho={f.previsto ? ancho(f.previsto.carga) : '0%'} color="#a5b4fc"
              detalle={f.previsto ? `${f.previsto.minutos}' · RPE ${f.previsto.rpe ?? '—'}` : 'Sin tareas montadas'} />
            <Barra nombre="Real" valor={f.cargaReal} ancho={f.cargaReal ? ancho(f.cargaReal) : '0%'} color={COLOR_VEREDICTO[f.veredicto === 'sin_datos' ? 'en_linea' : f.veredicto]}
              detalle={f.real ? `${f.real.minutos}' · RPE ${f.real.rpe}` : 'Sin RPE todavía'} />
            <Text style={styles.partidoDato}>
              {f.asistencia ? `Asistencia: ${f.asistencia.presentes}/${f.asistencia.total} (${f.asistencia.pct} %)${f.asistencia.retrasos ? ` · ${f.asistencia.retrasos} con retraso` : ''}${f.asistencia.faltas ? ` · ${f.asistencia.faltas} faltas` : ''}` : 'Sin lista de asistencia'}
            </Text>
            {f.cmp && f.cmp.carga.pct != null && <Text style={styles.pct}>{formatoPct(f.cmp.carga.pct)} sobre lo previsto</Text>}
          </TouchableOpacity>
        ))}

        {partidos.map((p) => (
          <View key={p.id} style={[styles.tarjeta, { borderColor: '#bfdbfe' }]}>
            <Text style={styles.tarjetaTitulo}>⚽ Partido · {formatearFechaCorta(p.fecha.slice(0, 10)).slice(0, 5)}</Text>
            <Text style={styles.tarjetaDia}>{p.equipo_local} vs {p.equipo_visitante}</Text>
            {p.media ? (
              <Text style={styles.partidoDato}>Carga media por jugador: {p.media.carga} (RPE {p.media.rpe} × {p.media.minutos}') · {p.media.jugadores} jugadores</Text>
            ) : (
              <Text style={styles.partidoDato}>{p.estado === 'finalizado' ? 'Sin RPE registrado todavía' : 'Todavía no se ha jugado'}</Text>
            )}
          </View>
        ))}

        {cargaRealSemana > 0 && <Text style={styles.pie}>Suma de cargas reales de la semana (entrenos + media del partido): {cargaRealSemana}</Text>}
        <Text style={styles.nota}>Lo previsto sale de las tareas de cada sesión y de los RPE esperados por objetivo; lo real, del RPE que registra el preparador físico. Toca un entreno para ver su sesión.</Text>
      </ScrollView>
    </View>
  );
}

function Dato({ etiqueta, valor, destacado }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={[styles.datoValor, destacado && { color: '#7c3aed' }]}>{valor}</Text>
      <Text style={styles.datoEtiqueta}>{etiqueta}</Text>
    </View>
  );
}

function Barra({ nombre, valor, ancho, color, detalle }) {
  return (
    <View style={styles.barraFila}>
      <View style={styles.barraCabecera}>
        <Text style={styles.barraNombre}>{nombre}</Text>
        <Text style={styles.barraValor}>{valor != null ? valor : '—'} <Text style={styles.barraDetalle}>{detalle}</Text></Text>
      </View>
      <View style={styles.barraFondo}>
        <View style={[styles.barraRelleno, { width: ancho, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  botonCompartir: { backgroundColor: '#16a34a', borderRadius: 12, padding: 12, alignItems: 'center', marginBottom: 12 },
  botonCompartirTexto: { color: '#fff', fontWeight: '700', fontSize: 14 },
  contenedor: { flex: 1, backgroundColor: '#f8fafc' },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  error: { color: '#dc2626', textAlign: 'center', marginBottom: 14 },
  botonReintentar: { backgroundColor: '#7c3aed', borderRadius: 10, paddingHorizontal: 22, paddingVertical: 12 },
  botonReintentarTexto: { color: '#fff', fontWeight: '700' },
  cabecera: { paddingTop: 30, paddingBottom: 18, paddingHorizontal: 20 },
  cabeceraTitulo: { color: '#fff', fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 10 },
  filaSemana: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  flecha: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  flechaTexto: { color: '#fff', fontSize: 24, fontWeight: '700', marginTop: -2 },
  semanaTexto: { color: '#fff', fontSize: 17, fontWeight: '800' },
  semanaSub: { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 2 },
  vacio: { textAlign: 'center', color: '#9ca3af', marginTop: 30 },
  resumen: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  resumenTitulo: { fontSize: 12, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  resumenFila: { flexDirection: 'row' },
  datoValor: { fontSize: 24, fontWeight: '800', color: '#111827' },
  datoEtiqueta: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  lectura: { backgroundColor: '#faf5ff', borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#e9d5ff' },
  lecturaTexto: { fontSize: 13, color: '#4c1d95', marginBottom: 4 },
  tarjeta: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1.5, borderColor: '#e5e7eb' },
  tarjetaCabecera: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  tarjetaTitulo: { fontSize: 15, fontWeight: '800', color: '#111827' },
  tarjetaDia: { fontSize: 12, color: '#6b7280', marginTop: 1, textTransform: 'capitalize' },
  etiqueta: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  etiquetaTexto: { color: '#fff', fontSize: 11, fontWeight: '700' },
  barraFila: { marginTop: 6 },
  barraCabecera: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  barraNombre: { fontSize: 12, fontWeight: '700', color: '#374151' },
  barraValor: { fontSize: 13, fontWeight: '800', color: '#111827' },
  barraDetalle: { fontSize: 11, fontWeight: '400', color: '#6b7280' },
  barraFondo: { height: 10, backgroundColor: '#f3f4f6', borderRadius: 5, overflow: 'hidden' },
  barraRelleno: { height: '100%', borderRadius: 5 },
  pct: { marginTop: 8, fontSize: 12, fontWeight: '700', color: '#7c3aed', textAlign: 'right' },
  partidoDato: { fontSize: 13, color: '#374151', marginTop: 8 },
  pie: { fontSize: 12, color: '#6b7280', textAlign: 'center', marginTop: 8 },
  nota: { fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 10, lineHeight: 16 },
});

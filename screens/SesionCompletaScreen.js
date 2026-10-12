import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  obtenerEntrenamientoApi,
  listarEntrenamientosApi,
  listarPlantillasEntrenoApi,
  listarTareasApi,
  listarJugadoresApi,
  listarCamposApi,
  listarPartidosApi,
  obtenerAsistenciasApi,
  obtenerSemanasCargaApi,
} from '../data/apiClient';
import { tipoDeSesion, textoSeries, lunesDeLaSemana } from '../data/planSesion';
import { cargaPrevista, compararCarga, TEXTO_VEREDICTO, formatoPct } from '../data/cargaPlanificada';
import { construirSesion, sumarHora, htmlSesion } from '../data/sesion';
import { cargarPartidoPrevio, minutosPorJugador } from '../data/contextoPartido';
import { pesosGrupos } from '../data/partidoPrevio';
import { OBJETIVOS, formatoTarea, textoDimensiones, segundosDe, formatoDuracion } from '../data/tareas';
import { formatearFechaCorta } from '../data/fecha';
import { generarDocumento } from '../data/compartir';
import DibujoTarea from '../components/DibujoTarea';

// Tarjeta de una tarea dentro de la sesión (o de uno de sus grupos).
const tarjetaTarea = (t, campos) => (
  <View key={t.id} style={styles.tarea}>
    <View style={styles.tareaCabecera}>
                    <Text style={styles.tareaNombre} numberOfLines={2}>{t.nombre}</Text>
                    <Text style={styles.tareaMinutos}>{t.minutos}'</Text>
                  </View>
                  <Text style={styles.tareaFormato}>
                    {formatoTarea(t)} · {textoDimensiones(t)}{t.objetivo && OBJETIVOS[t.objetivo] ? ` · ${OBJETIVOS[t.objetivo].corto}` : ''}
                  </Text>
                  <Text style={styles.tareaTrabajo}>{t.series} × {formatoDuracion(segundosDe(t))}{t.pausa_seg ? ` · pausa ${t.pausa_seg} s` : ''} · {(t.jugadores || []).length} jugadores asignados</Text>
                  <DibujoTarea tarea={t} campos={campos} altoMax={170} />
                  {!!t.descripcion && <Text style={styles.tareaDescripcion}>{t.descripcion}</Text>}
                </View>
  );

export default function SesionCompletaScreen({ route }) {
  const { entrenamientoId } = route.params;
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setError('');
    try {
      const [ent, todos, plantillas, tareas, jugadores, asist, campos] = await Promise.all([
        obtenerEntrenamientoApi(entrenamientoId),
        listarEntrenamientosApi(),
        listarPlantillasEntrenoApi().catch(() => null),
        listarTareasApi(entrenamientoId).catch(() => null),
        listarJugadoresApi(),
        obtenerAsistenciasApi(entrenamientoId),
        listarCamposApi().catch(() => []),
      ]);
      const { tipo } = tipoDeSesion(ent, todos);
      // RPE real de esta sesión (lo pone el preparador físico). Si no hay permiso o no está puesto, se queda en null.
      const semanasCarga = await obtenerSemanasCargaApi(lunesDeLaSemana(ent.fecha), 1).catch(() => null);
      const entCarga = semanasCarga ? semanasCarga.flatMap((w) => w.entrenamientos).find((e) => e.id === ent.id) : null;
      const real = entCarga ? { minutos: entCarga.duracion_minutos, rpe: entCarga.rpe_medio } : null;
      const activos = jugadores.filter((j) => j.estado !== 'baja');
      // Entreno 1: la carga prevista pesa cada grupo por la gente que lleva (según los minutos del partido anterior).
      let pesos = null;
      if (tipo === 1) {
        try {
          const partidos = await listarPartidosApi();
          pesos = pesosGrupos(activos, minutosPorJugador(await cargarPartidoPrevio(ent, todos, partidos)));
        } catch (e) {
          pesos = null; // sin el partido anterior, los dos grupos cuentan por igual
        }
      }
      const presentes = asist.filter((a) => ['presente', 'retraso'].includes(a.estado)).map((a) => a.jugador.id);
      const hayLista = asist.length > 0;
      const trabajoAparte = activos.filter((j) => j.readaptacion && (!hayLista || presentes.includes(j.id)));
      setDatos({
        ent, tipo, real, pesos, campos, tareasDisponibles: tareas !== null,
        sesion: construirSesion({ entrenamiento: ent, plantilla: plantillas ? plantillas.find((p) => p.numero === tipo) : null, tareas: tareas || [], tipo }),
        jugadoresPorId: Object.fromEntries(jugadores.map((j) => [j.id, j])),
        trabajoAparte,
        asistentes: hayLista ? presentes.length : null,
      });
    } catch (err) {
      setError(err.message || 'No se pudo cargar la sesión');
    } finally {
      setCargando(false);
    }
  }, [entrenamientoId]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  if (cargando) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }
  if (error || !datos) {
    return (
      <View style={styles.centrado}>
        <Text style={styles.error}>{error || 'No hay datos'}</Text>
        <TouchableOpacity style={styles.botonReintentar} onPress={cargar}>
          <Text style={styles.botonReintentarTexto}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { ent, tipo, real, pesos, sesion, jugadoresPorId, trabajoAparte, asistentes, tareasDisponibles, campos } = datos;
  const hayTareas = sesion.items.some((it) => (it.tareas || []).length > 0 || (it.grupos || []).some((g) => g.tareas.length > 0));
  const comparacion = hayTareas ? compararCarga(cargaPrevista(sesion, pesos || undefined), real) : null;
  const hora = (ent.hora || '').slice(0, 5);

  const imprimir = () =>
    generarDocumento(htmlSesion({ entrenamiento: ent, tipo, sesion, jugadoresPorId, trabajoAparte, asistentes, lugar: ent.lugar, campos }), 'la sesión');

  return (
    <View style={styles.contenedor}>
      <LinearGradient colors={['#2563eb', '#7c3aed']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cabecera}>
        <Text style={styles.cabeceraTitulo}>Sesión completa</Text>
        <Text style={styles.cabeceraSub}>{formatearFechaCorta(ent.fecha)} · {hora} · Entreno {tipo}</Text>
        <View style={styles.resumen}>
          <Dato etiqueta="Inicio" valor={hora || '—'} />
          <Dato etiqueta="Fin previsto" valor={hora ? sumarHora(hora, sesion.total) : '—'} />
          <Dato etiqueta="Duración" valor={`${sesion.total}'`} />
          <Dato etiqueta="Asistentes" valor={asistentes === null ? '—' : String(asistentes)} />
        </View>
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingTop: 16, paddingBottom: 40 }}>
        <TouchableOpacity style={styles.botonImprimir} onPress={imprimir} activeOpacity={0.85}>
          <Text style={styles.botonImprimirTexto}>🖨️  Imprimir o guardar en PDF</Text>
        </TouchableOpacity>

        {!tareasDisponibles && <Text style={styles.aviso}>Las tareas no están disponibles ahora mismo: se muestra la sesión sin ellas.</Text>}

        {comparacion && (
          <View style={styles.cajaCarga}>
            <Text style={styles.cajaCargaTitulo}>Carga: previsto frente a real</Text>
            <FilaCarga etiqueta="Duración" unidad=" min" fila={comparacion.minutos} />
            <FilaCarga etiqueta="RPE medio" unidad="" fila={comparacion.rpe} />
            <FilaCarga etiqueta="Carga (min × RPE)" unidad=" u.a." fila={comparacion.carga} fuerte />
            <Text style={[styles.cajaCargaVeredicto, ['mas_dura', 'mucho_mas_dura', 'mucho_mas_suave'].includes(comparacion.veredicto) && { color: '#b45309' }]}>
              {TEXTO_VEREDICTO[comparacion.veredicto]}
            </Text>
            {tipo === 1 && (
              <Text style={styles.cajaCargaNota}>
                {pesos
                  ? `Entreno 1: Recuperación ${pesos.recuperacion} jugadores y Compensación ${pesos.compensacion} (según los minutos del partido anterior); cada grupo pesa en la carga según su gente.`
                  : 'Entreno 1: no hay partido anterior con minutos, así que los dos grupos cuentan por igual.'}
              </Text>
            )}
            <Text style={styles.cajaCargaNota}>
              Lo previsto sale del objetivo de cada tarea (Recuperación 3, Compensación 6, Fuerza 7, Puesta a punto 5 de RPE) y es una estimación inicial que valida el preparador físico.
            </Text>
          </View>
        )}

        {sesion.items.map((it) => (
          <View key={it.clave} style={styles.fila}>
            <View style={styles.columnaHora}>
              <Text style={styles.hora}>{hora ? sumarHora(hora, it.inicio) : `+${it.inicio}'`}</Text>
              <Text style={styles.minutos}>{it.minutos}'</Text>
            </View>
            <View style={styles.tarjeta}>
              <Text style={styles.titulo}>{it.titulo}</Text>
              <Text style={styles.responsable}>{it.responsable}</Text>

              {it.estaciones && it.estaciones.map((e, i) => (
                <Text key={i} style={styles.linea}><Text style={styles.negrita}>{i + 1}. {e.zona}.</Text> {e.ejercicio}{textoSeries(e) ? ` (${textoSeries(e)})` : ''}</Text>
              ))}
              {it.tramos && it.tramos.map((m, i) => (
                <Text key={i} style={styles.linea}><Text style={styles.negrita}>{m.tiempo} {m.zona}.</Text> {m.descripcion}</Text>
              ))}
              {it.sinPrograma && <Text style={styles.vacio}>Sin programa de preparación física para este tipo de entreno.</Text>}
              {!!it.texto && <Text style={styles.linea}>{it.texto}</Text>}
              {!!it.aviso && <Text style={styles.avisoBloque}>{it.aviso}</Text>}

              {(it.tareas || []).map((t) => tarjetaTarea(t, campos))}
              {(it.grupos || []).map((g) => (
                <View key={g.clave} style={styles.grupo}>
                  <Text style={styles.grupoTitulo}>{g.titulo} <Text style={styles.grupoCriterio}>· {g.criterio} · {g.minutos}'</Text></Text>
                  {g.tareas.map((t) => tarjetaTarea(t, campos))}
                  {g.tareas.length === 0 && <Text style={styles.vacio}>Sin tareas todavía.</Text>}
                </View>
              ))}
              {['parte_central', 'cierre_tactico'].includes(it.clave) && (it.tareas || []).length === 0 && !it.grupos && !it.texto && (
                <Text style={styles.vacio}>Sin tareas todavía.</Text>
              )}
            </View>
          </View>
        ))}

        {trabajoAparte.length > 0 && (
          <View style={styles.cajaAparte}>
            <Text style={styles.cajaAparteTitulo}>Trabajo aparte · readaptación</Text>
            {trabajoAparte.map((j) => (
              <Text key={j.id} style={styles.linea}><Text style={styles.negrita}>{j.dorsal ? `#${j.dorsal} ` : ''}{j.nombre} {j.apellidos}:</Text> {j.readaptacion}</Text>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function Dato({ etiqueta, valor }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={styles.datoValor}>{valor}</Text>
      <Text style={styles.datoEtiqueta}>{etiqueta}</Text>
    </View>
  );
}

function FilaCarga({ etiqueta, unidad, fila, fuerte }) {
  const dif = fila.pct;
  return (
    <View style={styles.filaCarga}>
      <Text style={[styles.filaCargaEtiqueta, fuerte && { fontWeight: '800', color: '#111827' }]}>{etiqueta}</Text>
      <Text style={styles.filaCargaValor}>
        {fila.previsto != null ? `${fila.previsto}${unidad}` : '—'}
        {'  →  '}
        <Text style={{ fontWeight: '800', color: '#111827' }}>{fila.real != null ? `${fila.real}${unidad}` : 'sin dato'}</Text>
        {dif != null ? <Text style={{ color: Math.abs(dif) <= 0.15 ? '#16a34a' : '#b45309' }}>{`  ${formatoPct(dif)}`}</Text> : null}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#f8fafc' },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', padding: 24 },
  error: { color: '#dc2626', textAlign: 'center', marginBottom: 14 },
  botonReintentar: { backgroundColor: '#7c3aed', borderRadius: 10, paddingHorizontal: 22, paddingVertical: 12 },
  botonReintentarTexto: { color: '#fff', fontWeight: '700' },
  cabecera: { paddingTop: 28, paddingBottom: 18, paddingHorizontal: 20 },
  cabeceraTitulo: { color: '#fff', fontSize: 21, fontWeight: '800', textAlign: 'center' },
  cabeceraSub: { color: 'rgba(255,255,255,0.88)', fontSize: 12, textAlign: 'center', marginTop: 3, marginBottom: 14 },
  resumen: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 12, paddingVertical: 10 },
  datoValor: { color: '#fff', fontSize: 17, fontWeight: '800' },
  datoEtiqueta: { color: 'rgba(255,255,255,0.8)', fontSize: 10, marginTop: 2 },
  botonImprimir: { backgroundColor: '#111827', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 16 },
  botonImprimirTexto: { color: '#fff', fontWeight: '700', fontSize: 14 },
  aviso: { fontSize: 12, color: '#92400e', backgroundColor: '#fef3c7', borderRadius: 8, padding: 10, marginBottom: 12 },
  fila: { flexDirection: 'row', marginBottom: 10 },
  columnaHora: { width: 52, alignItems: 'center', paddingTop: 12 },
  hora: { fontSize: 13, fontWeight: '800', color: '#7c3aed' },
  minutos: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  tarjeta: { flex: 1, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 12 },
  titulo: { fontSize: 14, fontWeight: '800', color: '#111827' },
  responsable: { fontSize: 10, color: '#9ca3af', marginBottom: 6 },
  linea: { fontSize: 12, color: '#374151', lineHeight: 17, marginTop: 3 },
  negrita: { fontWeight: '800', color: '#111827' },
  vacio: { fontSize: 11, color: '#9ca3af', fontStyle: 'italic', marginTop: 4 },
  avisoBloque: { fontSize: 11, color: '#92400e', backgroundColor: '#fef3c7', borderRadius: 6, padding: 6, marginTop: 6 },
  tarea: { backgroundColor: '#faf5ff', borderLeftWidth: 3, borderLeftColor: '#7c3aed', borderRadius: 8, padding: 10, marginTop: 8 },
  grupo: { borderWidth: 1, borderStyle: 'dashed', borderColor: '#a78bfa', borderRadius: 10, padding: 8, marginTop: 8 },
  grupoTitulo: { fontSize: 13, fontWeight: '800', color: '#6d28d9', marginBottom: 4 },
  grupoCriterio: { fontSize: 11, fontWeight: '600', color: '#6b7280' },
  tareaCabecera: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  tareaNombre: { flex: 1, fontSize: 13, fontWeight: '800', color: '#111827' },
  tareaMinutos: { fontSize: 13, fontWeight: '800', color: '#6d28d9' },
  tareaFormato: { fontSize: 12, color: '#6d28d9', fontWeight: '700', marginTop: 3 },
  tareaTrabajo: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  tareaDescripcion: { fontSize: 12, color: '#374151', marginTop: 5, lineHeight: 17 },
  cajaCarga: { backgroundColor: '#f0f9ff', borderRadius: 12, borderWidth: 1, borderColor: '#bae6fd', padding: 14, marginBottom: 12 },
  cajaCargaTitulo: { fontSize: 13, fontWeight: '800', color: '#0369a1', marginBottom: 6 },
  filaCarga: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, paddingVertical: 3 },
  filaCargaEtiqueta: { fontSize: 12, color: '#4b5563', flexShrink: 1 },
  filaCargaValor: { fontSize: 12, color: '#6b7280', textAlign: 'right' },
  cajaCargaVeredicto: { fontSize: 12, fontWeight: '700', color: '#374151', marginTop: 8 },
  cajaCargaNota: { fontSize: 10, color: '#9ca3af', marginTop: 6, lineHeight: 14 },
  cajaAparte: { backgroundColor: '#fef2f2', borderRadius: 12, borderWidth: 1, borderColor: '#fecaca', padding: 14, marginTop: 6 },
  cajaAparteTitulo: { fontSize: 13, fontWeight: '800', color: '#dc2626', marginBottom: 4 },
});

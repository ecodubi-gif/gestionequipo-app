import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, TextInput, Platform, Vibration } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  obtenerEntrenamientoApi, listarEntrenamientosApi, listarPlantillasEntrenoApi, listarTareasApi, listarJugadoresApi, listarCamposApi,
  obtenerUsuario, guardarBloquesEntrenamientoApi, guardarPlantillaEntrenoApi,
} from '../data/apiClient';
import { tipoDeSesion, posturasEstiramiento } from '../data/planSesion';
import { construirSesion } from '../data/sesion';
import { OBJETIVOS, ROLES, formatoTarea, textoDimensiones } from '../data/tareas';
import { formatearFechaCorta } from '../data/fecha';
import { confirmar } from '../data/confirmar';
import { compartirWhatsApp } from '../data/compartir';
import {
  pasosDeSesion, estadoVacio, datosPaso, ponerSeries, sumarSegundos, marcarHecho, ponerNota, normalizarEstado,
  resumenSeguimiento, textoSeguimiento, mmss, textoTrabajo,
} from '../data/seguimientoEntreno';
import DibujoTarea from '../components/DibujoTarea';
import ProgramaEditable from '../components/ProgramaEditable';
import { CLAVE_PROG } from '../data/programaSesion';

const clave = (id) => `entreno_directo_${id}`;

// Pitido corto en el navegador (hace falta haber tocado antes la pantalla, por eso se prepara al pulsar "Empezar").
let audio = null;
const prepararSonido = () => {
  try {
    if (Platform.OS !== 'web' || audio) return;
    const C = window.AudioContext || window.webkitAudioContext;
    if (C) audio = new C();
    if (audio && audio.state === 'suspended') audio.resume();
  } catch (e) { audio = null; }
};
const avisar = (largo = false) => {
  try { Vibration.vibrate(largo ? [0, 400, 150, 400] : [0, 250]); } catch (e) { /* sin vibración */ }
  try {
    if (Platform.OS !== 'web' || !audio) return;
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.frequency.value = largo ? 660 : 880;
    g.gain.value = 0.25;
    o.connect(g); g.connect(audio.destination);
    o.start(); o.stop(audio.currentTime + (largo ? 0.7 : 0.3));
  } catch (e) { /* sin sonido */ }
};

export default function EntrenoDirectoScreen({ route }) {
  const { entrenamientoId } = route.params;
  const [datos, setDatos] = useState(null);
  const [estado, setEstado] = useState(estadoVacio());
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [abierto, setAbierto] = useState(null); // índice del paso en pantalla, o null = lista

  const cargar = useCallback(async () => {
    setError('');
    try {
      const [ent, todos, plantillas, tareas, jugadores, campos, usuario] = await Promise.all([
        obtenerEntrenamientoApi(entrenamientoId),
        listarEntrenamientosApi(),
        listarPlantillasEntrenoApi().catch(() => null),
        listarTareasApi(entrenamientoId).catch(() => null),
        listarJugadoresApi().catch(() => []),
        listarCamposApi().catch(() => []),
        obtenerUsuario().catch(() => null),
      ]);
      const { tipo } = tipoDeSesion(ent, todos);
      const sesion = construirSesion({ entrenamiento: ent, plantilla: plantillas ? plantillas.find((p) => p.numero === tipo) : null, tareas: tareas || [], tipo });
      const pasos = pasosDeSesion(sesion);
      let guardado = null;
      try { guardado = JSON.parse(await AsyncStorage.getItem(clave(entrenamientoId))); } catch (e) { /* sin guardado */ }
      setEstado(normalizarEstado(guardado, pasos));
      setDatos({ ent, tipo, pasos, campos, rol: usuario ? usuario.role : null, hayPlantilla: Boolean(plantillas && plantillas.find((p) => p.numero === tipo)), tareasDisponibles: tareas !== null, jugadoresPorId: Object.fromEntries(jugadores.map((j) => [j.id, j])) });
    } catch (e) {
      setError(e.message || 'No se pudo cargar el entreno');
    } finally {
      setCargando(false);
    }
  }, [entrenamientoId]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  // Mantiene la pantalla encendida mientras se usa (en el navegador, si lo permite).
  useEffect(() => {
    let cerrojo = null;
    (async () => {
      try { if (Platform.OS === 'web' && navigator.wakeLock) cerrojo = await navigator.wakeLock.request('screen'); } catch (e) { cerrojo = null; }
    })();
    return () => { try { if (cerrojo) cerrojo.release(); } catch (e) { /* nada */ } };
  }, []);

  // Cambios de preventivo y movilidad: se guardan en el servidor y se vuelve a leer la sesión.
  const guardarProg = async (tipoProg, lista) => {
    await guardarBloquesEntrenamientoApi(entrenamientoId, { [CLAVE_PROG[tipoProg]]: lista });
    await cargar();
  };
  const guardarBloques = async (cambios) => {
    await guardarBloquesEntrenamientoApi(entrenamientoId, cambios);
    await cargar();
  };
  const guardarProgPlantilla = async (tipoProg, lista) => {
    if (lista.length === 0) throw new Error('La sugerencia necesita al menos un elemento.');
    await guardarPlantillaEntrenoApi(datos.tipo, { [tipoProg]: lista });
    await cargar();
  };

  const cambiar = (fn) => {
    setEstado((prev) => {
      const nuevo = fn(prev);
      AsyncStorage.setItem(clave(entrenamientoId), JSON.stringify(nuevo)).catch(() => {});
      return nuevo;
    });
  };

  if (cargando) return <View style={styles.centrado}><ActivityIndicator size="large" color="#7c3aed" /></View>;
  if (error || !datos) {
    return (
      <View style={styles.centrado}>
        <Text style={styles.error}>{error || 'No hay datos'}</Text>
        <TouchableOpacity style={styles.boton} onPress={cargar}><Text style={styles.botonTexto}>Reintentar</Text></TouchableOpacity>
      </View>
    );
  }

  const { ent, pasos } = datos;
  const titulo = `Entreno ${formatearFechaCorta(ent.fecha)} ${(ent.hora || '').slice(0, 5)}`;

  if (abierto !== null && pasos[abierto]) {
    return (
      <DetallePaso
        key={pasos[abierto].id}
        paso={pasos[abierto]}
        indice={abierto}
        total={pasos.length}
        datos={datos}
        estado={estado}
        cambiar={cambiar}
        guardarProg={guardarProg}
        guardarBloques={guardarBloques}
        guardarProgPlantilla={guardarProgPlantilla}
        alLista={() => setAbierto(null)}
        irA={(i) => setAbierto(Math.max(0, Math.min(pasos.length - 1, i)))}
      />
    );
  }

  const r = resumenSeguimiento(pasos, estado);
  const pct = r.total ? Math.round((r.hechos / r.total) * 100) : 0;
  let bloqueActual = '';
  const siguiente = pasos.findIndex((p) => !datosPaso(estado, p.id).hecha);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f8fafc' }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View style={styles.resumen}>
        <Text style={styles.resumenTitulo}>{titulo} · Entreno {datos.tipo}</Text>
        <View style={styles.barra}><View style={[styles.barraRelleno, { width: `${pct}%` }]} /></View>
        <Text style={styles.resumenTexto}>
          {r.hechos} de {r.total} hechos · previsto {mmss(r.previstoSeg)} · real {mmss(r.realSeg)}
        </Text>
      </View>

      {!datos.tareasDisponibles && <Text style={styles.aviso}>No tienes acceso a las tareas de este entreno; solo se ven los bloques.</Text>}
      {pasos.length === 0 && <Text style={styles.aviso}>Este entreno todavía no tiene tareas ni bloques. Prepáralo en la pantalla de Preparación.</Text>}

      {siguiente >= 0 && (
        <TouchableOpacity style={styles.botonGrande} onPress={() => setAbierto(siguiente)} activeOpacity={0.85} testID="entreno-continuar">
          <Text style={styles.botonGrandeTexto}>{r.hechos === 0 && r.realSeg === 0 ? '▶ Empezar el entreno' : '▶ Continuar: ' + pasos[siguiente].titulo}</Text>
        </TouchableOpacity>
      )}
      {r.completo && <Text style={styles.completo}>✅ Entreno completo</Text>}

      {pasos.map((p, i) => {
        const d = datosPaso(estado, p.id);
        const cab = p.bloque !== bloqueActual;
        bloqueActual = p.bloque;
        const icono = d.hecha ? '✅' : d.series_hechas > 0 || d.seg_reales > 0 ? '🟡' : '⬜';
        return (
          <View key={p.id}>
            {cab && <Text style={styles.bloqueTitulo}>{p.bloque}</Text>}
            <TouchableOpacity style={[styles.fila, d.hecha && styles.filaHecha]} onPress={() => setAbierto(i)} activeOpacity={0.8}>
              <Text style={styles.filaIcono}>{icono}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.filaTitulo} numberOfLines={2}>{p.grupo ? `[${p.grupo}] ` : ''}{p.titulo}</Text>
                <Text style={styles.filaSub}>
                  {p.tipo === 'tarea' ? `${textoTrabajo(p)} · ${d.series_hechas}/${p.series} series` : mmss(p.previstoSeg)}
                  {d.seg_reales > 0 ? ` · real ${mmss(d.seg_reales)}` : ''}
                </Text>
              </View>
              <Text style={styles.filaFlecha}>›</Text>
            </TouchableOpacity>
          </View>
        );
      })}

      {pasos.length > 0 && (
        <View style={{ marginTop: 16, gap: 8 }}>
          <TouchableOpacity style={styles.botonSec} onPress={() => compartirWhatsApp(textoSeguimiento({ titulo, pasos, estado }))}>
            <Text style={styles.botonSecTexto}>💬 Compartir resumen por WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.botonSec}
            onPress={() => confirmar('Reiniciar el seguimiento', 'Se borran las series, los tiempos y las notas de este entreno en este dispositivo.', () => cambiar(() => estadoVacio()), 'Reiniciar')}
          >
            <Text style={[styles.botonSecTexto, { color: '#dc2626' }]}>↺ Reiniciar el seguimiento</Text>
          </TouchableOpacity>
          <Text style={styles.nota}>El seguimiento se guarda en este dispositivo.</Text>
        </View>
      )}
    </ScrollView>
  );
}

// Un paso (tarea o bloque) en pantalla grande, con el cronómetro de series y pausas.
function DetallePaso({ paso, indice, total, datos, estado, cambiar, guardarProg, guardarBloques, guardarProgPlantilla, alLista, irA }) {
  const d = datosPaso(estado, paso.id);
  const [fase, setFase] = useState('parado'); // 'parado' | 'trabajo' | 'pausa' | 'detenido'
  const [fin, setFin] = useState(0);
  const [restante, setRestante] = useState(0); // segundos, cuando está detenido
  const [ahora, setAhora] = useState(Date.now());
  const [inicioFase, setInicioFase] = useState(0);
  const [destello, setDestello] = useState(false);
  const faseAntes = useRef('parado');
  const t = paso.tarea;

  useEffect(() => {
    if (fase !== 'trabajo' && fase !== 'pausa') return undefined;
    const id = setInterval(() => setAhora(Date.now()), 250);
    return () => clearInterval(id);
  }, [fase]);

  const quedan = fase === 'trabajo' || fase === 'pausa' ? Math.max(0, Math.ceil((fin - ahora) / 1000)) : fase === 'detenido' ? restante : 0;
  const hechas = d.series_hechas;
  const todas = hechas >= paso.series;

  const flash = () => { setDestello(true); setTimeout(() => setDestello(false), 900); };

  const empezarTrabajo = (seg = paso.segundos) => {
    prepararSonido();
    const n = Date.now();
    setInicioFase(n);
    setFin(n + seg * 1000);
    setAhora(n);
    setFase('trabajo');
  };

  // Al llegar a cero.
  useEffect(() => {
    if (fase === 'trabajo' && quedan === 0 && Date.now() >= fin) {
      const nuevasHechas = Math.min(paso.series, hechas + 1);
      cambiar((e) => ponerSeries(sumarSegundos(e, paso.id, (Date.now() - inicioFase) / 1000), paso, nuevasHechas));
      flash();
      if (nuevasHechas >= paso.series) { avisar(true); setFase('parado'); } else if (paso.pausa > 0) {
        avisar(false);
        const n = Date.now();
        setInicioFase(n); setFin(n + paso.pausa * 1000); setAhora(n); setFase('pausa');
      } else { avisar(false); setFase('parado'); }
    } else if (fase === 'pausa' && quedan === 0 && Date.now() >= fin) {
      avisar(false); flash(); setFase('parado');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quedan, fase]);

  const detener = () => { faseAntes.current = fase; setRestante(Math.max(0, Math.ceil((fin - Date.now()) / 1000))); setFase('detenido'); };
  const reanudar = () => { const n = Date.now(); setInicioFase(n); setFin(n + restante * 1000); setAhora(n); setFase(faseAntes.current); };
  const saltar = () => {
    if (fase === 'trabajo') {
      const seg = (Date.now() - inicioFase) / 1000;
      cambiar((e) => ponerSeries(sumarSegundos(e, paso.id, seg), paso, hechas + 1));
    }
    setFase('parado');
  };
  const sumar = (seg) => { setFin((f) => f + seg * 1000); if (fase === 'detenido') setRestante((r) => Math.max(0, r + seg)); };

  const roles = ['ataque', 'defensa', 'comodin', 'portero'];
  const nombreJ = (j) => (j ? `${j.dorsal ? `#${j.dorsal} ` : ''}${j.apodo || j.nombre}` : '?');
  const bloque = paso.bloqueDatos;
  const tipoPrograma = bloque ? { preventivo: 'preventivo', movilidad: 'movilidad', rueda_perfiles: 'rueda' }[bloque.clave] : null;
  const esPrograma = Boolean(tipoPrograma);
  const posturas = bloque && bloque.clave === 'estiramientos' && bloque.texto ? posturasEstiramiento(bloque.texto) : null;

  const colorFase = fase === 'trabajo' ? '#16a34a' : fase === 'pausa' ? '#ca8a04' : fase === 'detenido' ? '#6b7280' : '#2563eb';
  const textoFase = fase === 'trabajo' ? `SERIE ${hechas + 1} DE ${paso.series}` : fase === 'pausa' ? 'PAUSA' : fase === 'detenido' ? 'EN PAUSA' : todas ? 'TODAS LAS SERIES HECHAS' : `LISTO · SERIE ${hechas + 1} DE ${paso.series}`;
  const mostrado = fase === 'parado' ? paso.segundos : quedan;

  return (
    <View style={{ flex: 1, backgroundColor: destello ? '#fef3c7' : '#f8fafc' }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
        <View style={styles.cabeceraPaso}>
          <TouchableOpacity onPress={alLista} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}><Text style={styles.enlace}>‹ Lista</Text></TouchableOpacity>
          <Text style={styles.contadorPaso}>{indice + 1} / {total}</Text>
        </View>
        <Text style={styles.bloqueTitulo}>{paso.bloque}{paso.grupo ? ` · ${paso.grupo}` : ''}</Text>
        <Text style={styles.tituloPaso}>{paso.titulo}</Text>

        {t && (
          <Text style={styles.datosTarea}>
            {formatoTarea(t)} · {textoDimensiones(t)}{t.objetivo && OBJETIVOS[t.objetivo] ? ` · ${OBJETIVOS[t.objetivo].corto}` : ''}
          </Text>
        )}

        <View style={[styles.reloj, { borderColor: colorFase }]}>
          <Text style={[styles.relojFase, { color: colorFase }]}>{textoFase}</Text>
          <Text style={[styles.relojTiempo, { color: colorFase }]} testID="entreno-reloj">{mmss(mostrado)}</Text>
          <Text style={styles.relojSub}>{textoTrabajo(paso)} · previsto {mmss(paso.previstoSeg)}</Text>
          {paso.tipo === 'tarea' && (
            <View style={styles.puntos}>
              {Array.from({ length: paso.series }, (_, i) => (
                <TouchableOpacity key={i} onPress={() => cambiar((e) => ponerSeries(e, paso, i + 1 === hechas ? i : i + 1))} style={[styles.punto, i < hechas && styles.puntoHecho, i === hechas && fase === 'trabajo' && styles.puntoActual]}>
                  <Text style={[styles.puntoTexto, i < hechas && { color: '#fff' }]}>{i + 1}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <View style={styles.controles}>
            {fase === 'parado' && !todas && (
              <TouchableOpacity style={[styles.botonReloj, { backgroundColor: '#16a34a' }]} onPress={() => empezarTrabajo()} testID="entreno-empezar">
                <Text style={styles.botonRelojTexto}>▶ {paso.tipo === 'tarea' ? `Serie ${hechas + 1}` : 'Empezar'}</Text>
              </TouchableOpacity>
            )}
            {(fase === 'trabajo' || fase === 'pausa') && (
              <>
                <TouchableOpacity style={[styles.botonReloj, { backgroundColor: '#6b7280' }]} onPress={detener}><Text style={styles.botonRelojTexto}>⏸ Parar</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.botonReloj, { backgroundColor: '#374151' }]} onPress={saltar}><Text style={styles.botonRelojTexto}>⏭ {fase === 'trabajo' ? 'Dar por hecha' : 'Saltar pausa'}</Text></TouchableOpacity>
              </>
            )}
            {fase === 'detenido' && (
              <TouchableOpacity style={[styles.botonReloj, { backgroundColor: '#16a34a' }]} onPress={reanudar}><Text style={styles.botonRelojTexto}>▶ Seguir</Text></TouchableOpacity>
            )}
          </View>
          {(fase === 'trabajo' || fase === 'pausa' || fase === 'detenido') && (
            <View style={styles.controles}>
              <TouchableOpacity style={styles.botonMini} onPress={() => sumar(-30)}><Text style={styles.botonMiniTexto}>−30 s</Text></TouchableOpacity>
              <TouchableOpacity style={styles.botonMini} onPress={() => sumar(30)}><Text style={styles.botonMiniTexto}>+30 s</Text></TouchableOpacity>
            </View>
          )}
          <Text style={styles.relojSub}>Tiempo real trabajado: {mmss(d.seg_reales)}</Text>
        </View>

        {t && <DibujoTarea tarea={t} campos={datos.campos} altoMax={300} />}
        {!!(t && t.descripcion) && <Text style={styles.descripcion}>{t.descripcion}</Text>}

        {t && roles.map((r) => {
          const lista = (t.jugadores || []).filter((a) => a.rol === r);
          return lista.length ? (
            <Text key={r} style={styles.rolLinea}>
              <Text style={{ color: ROLES[r].color, fontWeight: '800' }}>{ROLES[r].etiqueta} ({lista.length}): </Text>
              {lista.map((a) => nombreJ(datos.jugadoresPorId[a.jugador_id])).join(', ')}
            </Text>
          ) : null;
        })}

        {bloque && (
          <View style={{ marginTop: 8 }}>
            {esPrograma && (
              <ProgramaEditable
                tipo={tipoPrograma} lista={(tipoPrograma === 'preventivo' ? bloque.estaciones : tipoPrograma === 'movilidad' ? bloque.tramos : bloque.postas) || []} propio={Boolean(bloque.propio)}
                puedeEditar={tipoPrograma === 'rueda' ? ['entrenador', 'segundo_entrenador'].includes(datos.rol) : ['entrenador', 'segundo_entrenador', 'preparador_fisico'].includes(datos.rol)}
                puedePlantilla={tipoPrograma !== 'rueda' && datos.rol === 'preparador_fisico' && datos.hayPlantilla} numeroEntreno={datos.tipo}
                tiempos={tipoPrograma === 'rueda' ? { posta: bloque.postaMin, rotacion: bloque.rotacionMin } : undefined}
                onCambiarTiempos={(c) => guardarBloques(c)}
                onGuardarSesion={(lista) => guardarProg(tipoPrograma, lista)} onGuardarPlantilla={(lista) => guardarProgPlantilla(tipoPrograma, lista)}
              />
            )}
            {posturas ? posturas.posturas.map((x, i) => <Text key={i} style={styles.rolLinea}>• {x}</Text>) : !!bloque.texto && <Text style={styles.rolLinea}>{bloque.texto}</Text>}
            {posturas && !!posturas.nota && <Text style={styles.nota}>{posturas.nota}</Text>}
            {bloque.sinPrograma && <Text style={styles.nota}>Sin programa para este tipo de entreno.</Text>}
          </View>
        )}

        <Text style={styles.etiquetaNota}>Nota de esta tarea</Text>
        <TextInput
          style={styles.entrada}
          value={d.nota}
          onChangeText={(x) => cambiar((e) => ponerNota(e, paso.id, x))}
          placeholder="Ej: faltó un jugador, se alargó 2 minutos…"
          placeholderTextColor="#9ca3af"
          multiline
        />
      </ScrollView>

      <View style={styles.pie}>
        <TouchableOpacity style={[styles.botonNav, indice === 0 && { opacity: 0.35 }]} disabled={indice === 0} onPress={() => irA(indice - 1)}><Text style={styles.botonNavTexto}>‹ Anterior</Text></TouchableOpacity>
        <TouchableOpacity
          style={[styles.botonHecho, d.hecha && { backgroundColor: '#6b7280' }]}
          onPress={() => { cambiar((e) => marcarHecho(e, paso, !d.hecha)); if (!d.hecha) { if (indice < total - 1) irA(indice + 1); else alLista(); } }}
          testID="entreno-hecho"
        >
          <Text style={styles.botonHechoTexto}>{d.hecha ? '↺ Desmarcar' : indice < total - 1 ? '✓ Hecho · siguiente' : '✓ Terminar'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.botonNav, indice >= total - 1 && { opacity: 0.35 }]} disabled={indice >= total - 1} onPress={() => irA(indice + 1)}><Text style={styles.botonNavTexto}>Siguiente ›</Text></TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  error: { color: '#dc2626', textAlign: 'center', marginBottom: 12 },
  boton: { backgroundColor: '#7c3aed', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 18 },
  botonTexto: { color: '#fff', fontWeight: '700' },
  resumen: { backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 12 },
  resumenTitulo: { fontSize: 16, fontWeight: '800', color: '#111827' },
  resumenTexto: { fontSize: 13, color: '#4b5563', marginTop: 6 },
  barra: { height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, marginTop: 10, overflow: 'hidden' },
  barraRelleno: { height: 8, backgroundColor: '#16a34a' },
  aviso: { color: '#92400e', backgroundColor: '#fef3c7', borderRadius: 10, padding: 10, marginBottom: 10, fontSize: 13 },
  botonGrande: { backgroundColor: '#16a34a', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 8 },
  botonGrandeTexto: { color: '#fff', fontWeight: '800', fontSize: 16, textAlign: 'center', paddingHorizontal: 8 },
  completo: { textAlign: 'center', fontWeight: '800', color: '#15803d', marginVertical: 8, fontSize: 16 },
  bloqueTitulo: { fontSize: 12, fontWeight: '800', color: '#6b7280', textTransform: 'uppercase', marginTop: 14, marginBottom: 6 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 6 },
  filaHecha: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  filaIcono: { fontSize: 18 },
  filaTitulo: { fontSize: 15, fontWeight: '700', color: '#111827' },
  filaSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  filaFlecha: { fontSize: 22, color: '#9ca3af' },
  botonSec: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12, paddingVertical: 12, alignItems: 'center', backgroundColor: '#fff' },
  botonSecTexto: { fontWeight: '700', color: '#374151' },
  nota: { fontSize: 12, color: '#6b7280', textAlign: 'center', marginTop: 4 },
  cabeceraPaso: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  enlace: { color: '#2563eb', fontWeight: '800', fontSize: 16 },
  contadorPaso: { color: '#6b7280', fontWeight: '700' },
  tituloPaso: { fontSize: 22, fontWeight: '800', color: '#111827' },
  datosTarea: { fontSize: 13, color: '#4b5563', marginTop: 4 },
  reloj: { backgroundColor: '#fff', borderWidth: 2, borderRadius: 14, padding: 10, alignItems: 'center', marginVertical: 10 },
  relojFase: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  relojTiempo: { fontSize: 38, fontWeight: '800', fontVariant: ['tabular-nums'] },
  relojSub: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  puntos: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginVertical: 6 },
  punto: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  puntoHecho: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  puntoActual: { borderColor: '#16a34a' },
  puntoTexto: { fontWeight: '800', color: '#374151' },
  controles: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' },
  botonReloj: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16 },
  botonRelojTexto: { color: '#fff', fontWeight: '800', fontSize: 14 },
  botonMini: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingVertical: 6, paddingHorizontal: 14 },
  botonMiniTexto: { fontWeight: '700', color: '#374151' },
  descripcion: { fontSize: 14, color: '#374151', marginTop: 8, lineHeight: 20 },
  rolLinea: { fontSize: 13, color: '#374151', marginTop: 6, lineHeight: 19 },
  etiquetaNota: { fontSize: 12, fontWeight: '800', color: '#6b7280', textTransform: 'uppercase', marginTop: 16, marginBottom: 6 },
  entrada: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 10, minHeight: 60, fontSize: 14, color: '#111827' },
  pie: { flexDirection: 'row', gap: 8, padding: 10, borderTopWidth: 1, borderTopColor: '#e5e7eb', backgroundColor: '#fff' },
  botonNav: { paddingVertical: 14, paddingHorizontal: 10, justifyContent: 'center' },
  botonNavTexto: { fontWeight: '800', color: '#2563eb' },
  botonHecho: { flex: 1, backgroundColor: '#16a34a', borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  botonHechoTexto: { color: '#fff', fontWeight: '800', fontSize: 15 },
});

import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Pressable, StyleSheet, ScrollView, ActivityIndicator, useWindowDimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { confirmar } from '../data/confirmar';
import { generarDocumento } from '../data/compartir';
import { obtenerPartidoApi, obtenerConvocatoriaApi, obtenerAlineacionApi, guardarAlineacionApi, obtenerNoDisponiblesApi, obtenerUsuario } from '../data/apiClient';
import {
  OPCIONES_SISTEMA, opcionActiva, MAX_MOMENTOS, momentoInicial, copiaComoNuevo, suplentesDe, cambiarSistema, asignar, intercambiar, moverHueco,
  etiquetasSistema, frasesDeCambios, limpiarMomentos, htmlMomento,
} from '../data/alineacion';

const corto = (j) => (j ? (j.apodo || j.nombre || '—') : '—');

// Alineación del partido por momentos: el 11 inicial y cada cambio (puede mover a varios jugadores o cambiar el sistema).
// Toca un jugador y luego otro para intercambiarlos, o toca un punto del campo para moverlo allí.
export default function AlineacionScreen({ route }) {
  const { partidoId } = route.params;
  const { width } = useWindowDimensions();
  const ancho = Math.min(width - 32, 400);
  const alto = Math.round(ancho * 1.3);
  const [partido, setPartido] = useState(null);
  const [convocados, setConvocados] = useState([]);
  const [noDisponibles, setNoDisponibles] = useState([]);
  const [momentos, setMomentos] = useState([]);
  const [activoId, setActivoId] = useState(null);
  const [seleccion, setSeleccion] = useState(null); // { tipo: 'hueco', i } | { tipo: 'banquillo', id }
  const [puedeEditar, setPuedeEditar] = useState(false);
  const [sucio, setSucio] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [nuevo, setNuevo] = useState(null); // { etiqueta, minuto } mientras se crea un momento

  const cargar = useCallback(async () => {
    setError('');
    try {
      const [p, conv, mom, u, nd] = await Promise.all([obtenerPartidoApi(partidoId), obtenerConvocatoriaApi(partidoId), obtenerAlineacionApi(partidoId), obtenerUsuario(), obtenerNoDisponiblesApi().catch(() => [])]);
      setNoDisponibles(nd);
      const js = conv.map((c) => ({ ...c.jugador, titular: c.titular }));
      setPartido(p); setConvocados(js);
      setPuedeEditar(['entrenador', 'segundo_entrenador'].includes(u?.role));
      let lista = limpiarMomentos({ momentos: mom });
      if (lista.length === 0 && js.some((j) => j.titular)) { lista = [momentoInicial('4-3-3', js.filter((j) => j.titular))]; setSucio(true); }
      setMomentos(lista); setActivoId(lista[0] ? lista[0].id : null);
    } catch (e) { setError(e.message || 'No se pudo cargar'); } finally { setCargando(false); }
  }, [partidoId]);
  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const porId = useMemo(() => Object.fromEntries(convocados.map((j) => [j.id, j])), [convocados]);
  const idx = Math.max(0, momentos.findIndex((m) => m.id === activoId));
  const activo = momentos[idx];
  const anterior = idx > 0 ? momentos[idx - 1] : null;

  const cambiarActivo = (f) => { setMomentos((ms) => ms.map((m, i) => (i === idx ? f(m) : m))); setSucio(true); };
  const tocarHueco = (i) => {
    if (!puedeEditar) return;
    if (!seleccion) return setSeleccion({ tipo: 'hueco', i });
    if (seleccion.tipo === 'hueco') { if (seleccion.i !== i) cambiarActivo((m) => intercambiar(m, seleccion.i, i)); return setSeleccion(null); }
    cambiarActivo((m) => asignar(m, i, seleccion.id)); setSeleccion(null);
  };
  const tocarBanquillo = (id) => {
    if (!puedeEditar) return;
    if (seleccion && seleccion.tipo === 'hueco') { cambiarActivo((m) => asignar(m, seleccion.i, id)); return setSeleccion(null); }
    setSeleccion(seleccion && seleccion.id === id ? null : { tipo: 'banquillo', id });
  };
  const tocarCampo = (e) => {
    if (!puedeEditar || !seleccion || seleccion.tipo !== 'hueco') return;
    const { locationX, locationY } = e.nativeEvent;
    cambiarActivo((m) => moverHueco(m, seleccion.i, locationX / ancho, locationY / alto));
    setSeleccion(null);
  };

  const crearMomento = () => {
    if (momentos.length >= MAX_MOMENTOS) return setError(`Máximo ${MAX_MOMENTOS} momentos.`);
    const m = copiaComoNuevo(activo, (nuevo.etiqueta || '').trim() || 'Cambio', nuevo.minuto);
    setMomentos((ms) => [...ms.slice(0, idx + 1), m, ...ms.slice(idx + 1)]); setActivoId(m.id); setNuevo(null); setSucio(true); setSeleccion(null);
  };
  const borrarMomento = () => confirmar('Borrar momento', `¿Borrar «${activo.etiqueta}»?`, () => {
    const resto = momentos.filter((m) => m.id !== activo.id);
    setMomentos(resto); setActivoId(resto[Math.max(0, idx - 1)] ? resto[Math.max(0, idx - 1)].id : null); setSucio(true); setSeleccion(null);
  }, 'Borrar');

  const guardar = async () => {
    setGuardando(true); setError('');
    try { setMomentos(await guardarAlineacionApi(partidoId, momentos)); setSucio(false); } catch (e) { setError(e.message || 'No se pudo guardar'); } finally { setGuardando(false); }
  };

  const jugadoresImpresion = Object.fromEntries(convocados.map((j) => [j.id, { dorsal: j.dorsal, nombre: corto(j) }]));
  // En la cabecera del PDF, primero el que juega en casa.
  const datosPartido = { equipo: 'C.D. Herrera', rival: partido ? (partido.es_local ? partido.equipo_visitante : partido.equipo_local) : '', local: partido ? partido.equipo_local : '', visitante: partido ? partido.equipo_visitante : '' };
  const imprimir = (todos) => {
    const lista = todos ? momentos : [activo];
    const html = `<html><body>${lista.map((m, k) => htmlMomento(m, momentos[momentos.findIndex((x) => x.id === m.id) - 1] || null, jugadoresImpresion, datosPartido, k > 0)).join('')}</body></html>`;
    generarDocumento(html, 'la alineación');
  };

  if (cargando) return <ActivityIndicator style={{ marginTop: 60 }} size="large" color="#16a34a" />;
  if (error && !activo) return <Text style={styles.error}>{error}</Text>;
  if (!activo) return <Text style={styles.vacio}>Primero guarda la convocatoria con los titulares: de ahí sale el 11 inicial.</Text>;

  const etiquetas = etiquetasSistema(activo.sistema);
  const suplentes = suplentesDe(activo, convocados);
  const frases = frasesDeCambios(anterior, activo, (id) => corto(porId[id]));
  const enCampoNoDisponibles = activo.huecos.filter((h) => h.jugador_id != null && noDisponibles.includes(h.jugador_id)).map((h) => corto(porId[h.jugador_id]));
  const selHueco = seleccion && seleccion.tipo === 'hueco' ? seleccion.i : null;

  return (
    <ScrollView style={styles.contenedor} contentContainerStyle={{ padding: 16, paddingBottom: 60, alignItems: 'center' }} keyboardShouldPersistTaps="handled">
      <View style={{ width: ancho }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
          {momentos.map((m) => (
            <TouchableOpacity key={m.id} style={[styles.chip, m.id === activo.id && styles.chipActivo]} onPress={() => { setActivoId(m.id); setSeleccion(null); }}>
              <Text style={[styles.chipTexto, m.id === activo.id && { color: '#fff' }]}>{m.etiqueta}{m.minuto != null ? ` ${m.minuto}'` : ''}</Text>
            </TouchableOpacity>
          ))}
          {puedeEditar && <TouchableOpacity style={[styles.chip, { borderStyle: 'dashed' }]} onPress={() => setNuevo({ etiqueta: 'Cambio', minuto: '' })}><Text style={styles.chipTexto}>＋ Nuevo momento</Text></TouchableOpacity>}
        </ScrollView>

        {nuevo && (
          <View style={styles.caja}>
            <Text style={styles.cajaTitulo}>Nuevo momento (parte de una copia del actual)</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput style={[styles.input, { flex: 1 }]} value={nuevo.etiqueta} onChangeText={(t) => setNuevo({ ...nuevo, etiqueta: t })} placeholder="Nombre (ej. Cambio 60')" maxLength={40} />
              <TextInput style={[styles.input, { width: 70 }]} value={String(nuevo.minuto)} onChangeText={(t) => setNuevo({ ...nuevo, minuto: t.replace(/\D/g, '').slice(0, 3) })} placeholder="Min." keyboardType="number-pad" />
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <TouchableOpacity style={styles.botonVerde} onPress={crearMomento}><Text style={styles.botonVerdeTexto}>Crear</Text></TouchableOpacity>
              <TouchableOpacity style={styles.botonGris} onPress={() => setNuevo(null)}><Text style={styles.botonGrisTexto}>Cancelar</Text></TouchableOpacity>
            </View>
          </View>
        )}

        {puedeEditar && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
            {OPCIONES_SISTEMA.map((s) => (
              <TouchableOpacity key={s} style={[styles.chipSistema, s === opcionActiva(activo) && styles.chipSistemaActivo]} onPress={() => { cambiarActivo((m) => cambiarSistema(m, s)); setSeleccion(null); }}>
                <Text style={[styles.chipTexto, s === opcionActiva(activo) && { color: '#fff' }]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <Pressable onPress={tocarCampo} style={[styles.campo, { width: ancho, height: alto }]}>
          <View style={[styles.lineaCampo, { top: alto / 2 }]} />
          <View style={[styles.circuloCentro, { left: ancho / 2 - 38, top: alto / 2 - 38 }]} />
          <View style={[styles.area, { left: ancho / 2 - 70, bottom: 0, width: 140, height: 62 }]} />
          <View style={[styles.area, { left: ancho / 2 - 70, top: 0, width: 140, height: 62 }]} />
          {activo.huecos.map((h, i) => {
            const j = porId[h.jugador_id];
            const sel = selHueco === i;
            return (
              <TouchableOpacity key={i} activeOpacity={0.8} onPress={() => tocarHueco(i)} style={[styles.disco, { left: h.x * ancho - 22, top: h.y * alto - 22 }, sel && styles.discoSel]}>
                <Text style={styles.discoTexto}>{j ? (j.dorsal ?? '') : etiquetas[i]}</Text>
                <Text style={styles.discoNombre} numberOfLines={1}>{j ? corto(j) : '—'}{j && noDisponibles.includes(j.id) ? ' 🩹' : ''}</Text>
              </TouchableOpacity>
            );
          })}
        </Pressable>
        {puedeEditar
          ? <Text style={styles.ayuda}>{seleccion ? (seleccion.tipo === 'hueco' ? 'Toca otro jugador para intercambiarlos, un suplente para sustituirlo, o un punto del campo para moverlo allí.' : 'Toca el jugador del campo al que sustituye.') : 'Toca un jugador para moverlo o cambiarlo.'}</Text>
          : <Text style={styles.ayuda}>Solo el entrenador y el segundo pueden cambiar la alineación.</Text>}

        {puedeEditar && (
          <View style={styles.caja}>
            <Text style={styles.cajaTitulo}>Este momento</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput style={[styles.input, { flex: 1 }]} value={activo.etiqueta} onChangeText={(t) => cambiarActivo((m) => ({ ...m, etiqueta: t.slice(0, 40) }))} placeholder="Nombre" />
              <TextInput style={[styles.input, { width: 70 }]} value={activo.minuto == null ? '' : String(activo.minuto)} onChangeText={(t) => cambiarActivo((m) => ({ ...m, minuto: t ? Math.min(130, Number(t.replace(/\D/g, '')) || 0) : null }))} placeholder="Min." keyboardType="number-pad" />
            </View>
          </View>
        )}

        {enCampoNoDisponibles.length > 0 && <Text style={styles.aviso}>🩹 En el campo hay jugadores no disponibles: {enCampoNoDisponibles.join(', ')}</Text>}

        {frases.length > 0 && (
          <View style={styles.cajaCambios}>
            <Text style={styles.cajaTitulo}>Cambios respecto a «{anterior.etiqueta}»</Text>
            {frases.map((f, i) => <Text key={i} style={styles.frase}>• {f}</Text>)}
          </View>
        )}

        <Text style={styles.seccion}>Suplentes ({suplentes.length})</Text>
        <View style={styles.fila}>
          {suplentes.map((j) => (
            <TouchableOpacity key={j.id} style={[styles.chip, seleccion && seleccion.tipo === 'banquillo' && seleccion.id === j.id && styles.chipActivo]} onPress={() => tocarBanquillo(j.id)}>
              <Text style={[styles.chipTexto, seleccion && seleccion.tipo === 'banquillo' && seleccion.id === j.id && { color: '#fff' }]}>{j.dorsal != null && j.dorsal !== '' ? `${j.dorsal} ` : ''}{corto(j)}{noDisponibles.includes(j.id) ? ' 🩹' : ''}</Text>
            </TouchableOpacity>
          ))}
          {suplentes.length === 0 && <Text style={styles.ayuda}>No quedan suplentes.</Text>}
        </View>

        {!!error && <Text style={styles.error}>{error}</Text>}
        {sucio && puedeEditar && <Text style={styles.aviso}>⚠️ Hay cambios sin guardar</Text>}
        <View style={styles.fila}>
          {puedeEditar && <TouchableOpacity style={[styles.botonVerde, !sucio && { opacity: 0.5 }]} onPress={guardar} disabled={guardando || !sucio}><Text style={styles.botonVerdeTexto}>{guardando ? 'Guardando…' : 'Guardar'}</Text></TouchableOpacity>}
          <TouchableOpacity style={styles.botonGris} onPress={() => imprimir(false)}><Text style={styles.botonGrisTexto}>🖨️ Imprimir este</Text></TouchableOpacity>
          {momentos.length > 1 && <TouchableOpacity style={styles.botonGris} onPress={() => imprimir(true)}><Text style={styles.botonGrisTexto}>🖨️ Imprimir todos</Text></TouchableOpacity>}
          {puedeEditar && momentos.length > 1 && <TouchableOpacity style={styles.botonRojo} onPress={borrarMomento}><Text style={styles.botonRojoTexto}>Borrar momento</Text></TouchableOpacity>}
        </View>
        {sucio && <Text style={styles.ayuda}>Imprimir usa lo que ves ahora, aunque aún no lo hayas guardado.</Text>}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#f8fafc' },
  error: { color: '#dc2626', marginVertical: 8, textAlign: 'center' },
  vacio: { color: '#6b7280', textAlign: 'center', padding: 30 },
  chip: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#fff', marginRight: 6, marginBottom: 6 },
  chipActivo: { backgroundColor: '#111827', borderColor: '#111827' },
  chipSistema: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#fff', marginRight: 6 },
  chipSistemaActivo: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  chipTexto: { fontSize: 12, fontWeight: '700', color: '#374151' },
  campo: { backgroundColor: '#4d9a3b', borderRadius: 8, borderWidth: 2, borderColor: '#fff', overflow: 'hidden' },
  lineaCampo: { position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: '#fff', opacity: 0.8 },
  circuloCentro: { position: 'absolute', width: 76, height: 76, borderRadius: 38, borderWidth: 2, borderColor: '#fff', opacity: 0.8 },
  area: { position: 'absolute', borderWidth: 2, borderColor: '#fff', opacity: 0.8 },
  disco: { position: 'absolute', width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', borderWidth: 2, borderColor: '#111827', alignItems: 'center', justifyContent: 'center' },
  discoSel: { borderColor: '#f59e0b', borderWidth: 4 },
  discoTexto: { fontSize: 14, fontWeight: '800', color: '#111827' },
  discoNombre: { position: 'absolute', top: 46, width: 70, textAlign: 'center', fontSize: 10, fontWeight: '800', color: '#fff', textShadowColor: '#14532d', textShadowRadius: 3 },
  ayuda: { fontSize: 12, color: '#6b7280', marginTop: 8, marginBottom: 4, textAlign: 'center' },
  caja: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginTop: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  cajaCambios: { backgroundColor: '#fffbeb', borderRadius: 12, padding: 12, marginTop: 10, borderWidth: 1, borderColor: '#fde68a' },
  cajaTitulo: { fontSize: 12, fontWeight: '800', color: '#374151', marginBottom: 6 },
  frase: { fontSize: 13, color: '#374151', marginBottom: 2 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 9, fontSize: 14, backgroundColor: '#fff' },
  seccion: { fontSize: 12, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', marginTop: 14, marginBottom: 6 },
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  aviso: { color: '#b45309', fontWeight: '700', marginTop: 10, textAlign: 'center' },
  botonVerde: { backgroundColor: '#16a34a', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 11 },
  botonVerdeTexto: { color: '#fff', fontWeight: '800' },
  botonGris: { backgroundColor: '#f3f4f6', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11 },
  botonGrisTexto: { color: '#374151', fontWeight: '700' },
  botonRojo: { backgroundColor: '#fef2f2', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11 },
  botonRojoTexto: { color: '#dc2626', fontWeight: '700' },
});

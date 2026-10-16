import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, useWindowDimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import DibujoSvg from '../components/DibujoSvg';
import { confirmar } from '../data/confirmar';
import { generarDocumento } from '../data/compartir';
import {
  obtenerPartidoApi, obtenerConvocatoriaApi, obtenerUsuario, listarJugadasAbpApi, guardarJugadaAbpApi, borrarJugadaAbpApi,
  obtenerAsignacionesAbpApi, guardarAsignacionAbpApi,
} from '../data/apiClient';
import {
  TIPOS, ESTILOS_FLECHA, PROPORCION, limpiarJugada, jugadoresDe, anadirElemento, moverElemento, borrarElemento, cambiarNota, alternarMarca,
  duplicar, numeroRival, asignacionVacia, asignar, ponerTexto, limpiarAsignacion, formasJugada, elementoEn, htmlJugada,
} from '../data/abp';

const HERRAMIENTAS = [
  ['sel', '👆 Mover'], ['jugador', '＋ Jugador'], ['rival', '＋ Rival'], ['balon', '＋ Balón'],
  ['pase', '➜ Flecha balón'], ['carrera', '⇢ Flecha jugador'], ['nota', '＋ Nota'],
];
const corto = (j) => (j ? (j.apodo || j.nombre || '—') : '—');
const nuevaJugada = () => ({ id: null, titulo: 'Nueva jugada', tipo: 'otro', consigna: '', orden: 0, elementos: [] });

// Balón parado: láminas editables. "Asignar" pone nombre a cada número para este partido; "Editar" cambia el dibujo (para todos los partidos).
export default function AbpScreen({ route }) {
  const { partidoId } = route.params;
  const { width } = useWindowDimensions();
  const ancho = Math.min(width - 32, 640);
  const alto = Math.round(ancho * PROPORCION);
  const [partido, setPartido] = useState(null);
  const [convocados, setConvocados] = useState([]);
  const [jugadas, setJugadas] = useState([]);
  const [asigs, setAsigs] = useState({});
  const [puedeEditar, setPuedeEditar] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [abierta, setAbierta] = useState(null); // jugada en pantalla (copia de trabajo)
  const [modo, setModo] = useState('asignar');
  const [herramienta, setHerramienta] = useState('sel');
  const [primerPunto, setPrimerPunto] = useState(null);
  const [sel, setSel] = useState(null);
  const [sucio, setSucio] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const arrastre = useRef(null); // { id, x0, y0, movido }

  const cargar = useCallback(async () => {
    setError('');
    try {
      const [p, conv, js, as, u] = await Promise.all([obtenerPartidoApi(partidoId), obtenerConvocatoriaApi(partidoId), listarJugadasAbpApi(), obtenerAsignacionesAbpApi(partidoId), obtenerUsuario()]);
      setPartido(p); setConvocados(conv.map((c) => c.jugador)); setJugadas(js.map(limpiarJugada).filter(Boolean)); setAsigs(as);
      setPuedeEditar(['entrenador', 'segundo_entrenador'].includes(u?.role));
    } catch (e) { setError(e.message || 'No se pudo cargar'); } finally { setCargando(false); }
  }, [partidoId]);
  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const ids = useMemo(() => convocados.map((j) => j.id), [convocados]);
  const nombres = useMemo(() => Object.fromEntries(convocados.map((j) => [j.id, corto(j)])), [convocados]);
  const asigDe = (j) => limpiarAsignacion(j ? asigs[j.id || 'nueva'] : null, j || { elementos: [] }, ids);
  const asigAbierta = abierta ? asigDe(abierta) : asignacionVacia();

  const abrir = (j) => { setAbierta(j); setModo('asignar'); setSel(null); setHerramienta('sel'); setPrimerPunto(null); setSucio(false); setError(''); };
  const cerrar = () => {
    if (sucio) return confirmar('Salir sin guardar', 'Hay cambios sin guardar. ¿Salir igualmente?', () => setAbierta(null));
    setAbierta(null);
  };
  const cambiarJugada = (f) => { setAbierta((j) => f(j)); setSucio(true); };

  const tocarEn = (px, py) => {
    const u = px / ancho; const v = py / alto;
    if (modo === 'asignar') {
      const id = elementoEn(abierta, px, py, ancho);
      const el = abierta.elementos.find((x) => x.id === id);
      return setSel(el && el.k === 'jugador' ? id : null);
    }
    if (!puedeEditar) return;
    if (herramienta === 'jugador' || herramienta === 'rival' || herramienta === 'balon') { cambiarJugada((j) => anadirElemento(j, herramienta, { x: u, y: v })); return setHerramienta('sel'); }
    if (herramienta === 'nota') { cambiarJugada((j) => anadirElemento(j, 'nota', { x: u, y: v, t: 'Nota' })); return setHerramienta('sel'); }
    if (herramienta === 'pase' || herramienta === 'carrera') {
      if (!primerPunto) return setPrimerPunto({ x: u, y: v });
      cambiarJugada((j) => anadirElemento(j, 'flecha', { estilo: herramienta, a: primerPunto, b: { x: u, y: v } }));
      setPrimerPunto(null); return setHerramienta('sel');
    }
    const id = elementoEn(abierta, px, py, ancho);
    if (id) return setSel(id);
    const el = abierta.elementos.find((x) => x.id === sel);
    if (el && el.k !== 'flecha') cambiarJugada((j) => moverElemento(j, sel, u, v)); // tocar un hueco mueve lo seleccionado
  };

  // Arrastrar con el dedo: en "Editar", lo que se toca (jugador, rival, balón o nota) se mueve con él.
  const alEmpezar = (e) => {
    const { locationX: px, locationY: py } = e.nativeEvent;
    arrastre.current = { x0: px, y0: py, id: null, movido: false };
    if (modo === 'editar' && puedeEditar && herramienta === 'sel') {
      const id = elementoEn(abierta, px, py, ancho);
      const el = abierta.elementos.find((x) => x.id === id);
      if (el && el.k !== 'flecha') { arrastre.current.id = id; setSel(id); }
    }
  };
  const alMover = (e) => {
    const a = arrastre.current;
    if (!a || !a.id) return;
    const { locationX: px, locationY: py } = e.nativeEvent;
    if (!a.movido && Math.hypot(px - a.x0, py - a.y0) < 5) return;
    a.movido = true;
    cambiarJugada((j) => moverElemento(j, a.id, px / ancho, py / alto));
  };
  const alSoltar = (e) => {
    const a = arrastre.current; arrastre.current = null;
    if (!a || a.movido) return;
    if (a.id) return; // un toque sobre algo ya lo dejó seleccionado
    tocarEn(a.x0, a.y0);
  };

  const guardarDibujo = async () => {
    setGuardando(true); setError('');
    try {
      const g = limpiarJugada(await guardarJugadaAbpApi(abierta));
      setAbierta(g); setJugadas((js) => (abierta.id ? js.map((x) => (x.id === g.id ? g : x)) : [...js, g])); setSucio(false);
    } catch (e) { setError(e.message || 'No se pudo guardar'); } finally { setGuardando(false); }
  };
  const guardarAsignacion = async () => {
    if (!abierta.id) return setError('Guarda primero la jugada.');
    setGuardando(true); setError('');
    try {
      const a = asigAbierta;
      const r = await guardarAsignacionAbpApi(partidoId, abierta.id, a);
      setAsigs((x) => ({ ...x, [abierta.id]: { asig: r.asig || {}, textos: r.textos || {} } }));
    } catch (e) { setError(e.message || 'No se pudo guardar'); } finally { setGuardando(false); }
  };
  const ponerAsig = (f) => setAsigs((x) => ({ ...x, [abierta.id || 'nueva']: f(asigAbierta) }));
  const borrarJugada = () => confirmar('Borrar jugada', `¿Borrar «${abierta.titulo}» para todos los partidos?`, async () => {
    try { if (abierta.id) await borrarJugadaAbpApi(abierta.id); setJugadas((js) => js.filter((x) => x.id !== abierta.id)); setAbierta(null); setSucio(false); } catch (e) { setError(e.message || 'No se pudo borrar'); }
  });

  const datosImpresion = () => Object.fromEntries(convocados.map((j) => [j.id, { dorsal: j.dorsal, nombre: corto(j) }]));
  const cabecera = { equipo: partido?.equipo_local || '', rival: partido?.equipo_visitante || '' };
  const imprimir = (lista) => generarDocumento(lista.map((j, i) => htmlJugada(j, asigDe(j), datosImpresion(), cabecera, i > 0)).join(''), 'el balón parado');

  if (cargando) return <ActivityIndicator style={{ marginTop: 40 }} />;

  if (!abierta) {
    return (
      <ScrollView style={styles.contenedor} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        <Text style={styles.titulo}>Balón parado</Text>
        <Text style={styles.ayuda}>Toca una jugada para ponerle nombres a los números en este partido. Imprímelas para enseñarlas al equipo.</Text>
        {!!error && <Text style={styles.error}>{error}</Text>}
        {jugadas.map((j) => {
          const a = asigDe(j); const n = Object.keys(a.asig).length; const total = jugadoresDe(j).length;
          return (
            <TouchableOpacity key={j.id} style={styles.tarjeta} onPress={() => abrir(j)}>
              <Text style={styles.tarjetaTitulo}>{j.titulo}</Text>
              <Text style={styles.tarjetaSub}>{TIPOS[j.tipo]} · {n}/{total} asignados</Text>
            </TouchableOpacity>
          );
        })}
        {jugadas.length === 0 && <Text style={styles.ayuda}>Todavía no hay jugadas.</Text>}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 }}>
          {jugadas.length > 0 && <TouchableOpacity style={styles.botonNegro} onPress={() => imprimir(jugadas)}><Text style={styles.botonTexto}>🖨️ Imprimir todas</Text></TouchableOpacity>}
          {puedeEditar && <TouchableOpacity style={styles.botonVerde} onPress={() => { abrir(nuevaJugada()); setModo('editar'); setSucio(true); }}><Text style={styles.botonTexto}>＋ Nueva jugada</Text></TouchableOpacity>}
        </View>
      </ScrollView>
    );
  }

  const res = formasJugada(abierta, { ancho, asignacion: asigAbierta, nombres, seleccion: sel });
  const elSel = abierta.elementos.find((x) => x.id === sel);
  const usados = new Set(Object.values(asigAbierta.asig));
  return (
    <ScrollView style={styles.contenedor} contentContainerStyle={{ padding: 16, paddingBottom: 80, alignItems: 'center' }} keyboardShouldPersistTaps="handled">
      <View style={{ width: ancho }}>
        <TouchableOpacity onPress={cerrar}><Text style={styles.volver}>‹ Todas las jugadas</Text></TouchableOpacity>
        {modo === 'editar' && puedeEditar ? (
          <>
            <TextInput style={styles.input} value={abierta.titulo} onChangeText={(t) => cambiarJugada((j) => ({ ...j, titulo: t }))} placeholder="Título" maxLength={80} />
            <TextInput style={styles.input} value={abierta.consigna} onChangeText={(t) => cambiarJugada((j) => ({ ...j, consigna: t }))} placeholder="Consigna (opcional)" maxLength={120} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
              {Object.entries(TIPOS).map(([k, n]) => (
                <TouchableOpacity key={k} style={[styles.chip, abierta.tipo === k && styles.chipActivo]} onPress={() => cambiarJugada((j) => ({ ...j, tipo: k }))}>
                  <Text style={[styles.chipTexto, abierta.tipo === k && { color: '#fff' }]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        ) : (
          <>
            <Text style={styles.titulo}>{abierta.titulo}</Text>
            {!!abierta.consigna && <Text style={styles.ayuda}>Consigna: {abierta.consigna}</Text>}
          </>
        )}
        {puedeEditar && (
          <View style={{ flexDirection: 'row', marginBottom: 8 }}>
            {['asignar', 'editar'].map((m) => (
              <TouchableOpacity key={m} style={[styles.chip, modo === m && styles.chipActivo]} onPress={() => { setModo(m); setSel(null); setHerramienta('sel'); setPrimerPunto(null); }}>
                <Text style={[styles.chipTexto, modo === m && { color: '#fff' }]}>{m === 'asignar' ? 'Asignar jugadores' : 'Editar dibujo'}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {modo === 'editar' && puedeEditar && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {HERRAMIENTAS.map(([k, n]) => (
              <TouchableOpacity key={k} style={[styles.chip, herramienta === k && styles.chipActivo]} onPress={() => { setHerramienta(k); setPrimerPunto(null); }}>
                <Text style={[styles.chipTexto, herramienta === k && { color: '#fff' }]}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {modo === 'editar' && puedeEditar && (
          <Text style={styles.ayuda}>
            {herramienta === 'sel' ? 'Arrastra cualquier jugador, rival, balón o nota para colocarlo. Toca para seleccionarlo y cambiar sus opciones.'
              : (herramienta === 'pase' || herramienta === 'carrera') ? (primerPunto ? 'Toca dónde termina la flecha.' : 'Toca dónde empieza la flecha.') : 'Toca el campo para colocarlo.'}
          </Text>
        )}
      </View>

      <View
        onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true}
        onResponderGrant={alEmpezar} onResponderMove={alMover} onResponderRelease={alSoltar} onResponderTerminate={() => { arrastre.current = null; }}
        style={{ width: ancho, height: alto, borderRadius: 8, overflow: 'hidden', touchAction: 'none', userSelect: 'none' }}
      >
        <View pointerEvents="none"><DibujoSvg res={res} /></View>
      </View>

      <View style={{ width: ancho, marginTop: 10 }}>
        {modo === 'asignar' && (
          <>
            {!elSel && <Text style={styles.ayuda}>Toca un número del campo y elige quién lo ocupa.</Text>}
            {elSel && elSel.k === 'jugador' && (
              <View style={styles.panel}>
                <Text style={styles.panelTitulo}>Número {elSel.n}{asigAbierta.asig[elSel.id] ? ` · ${nombres[asigAbierta.asig[elSel.id]]}` : ''}</Text>
                {puedeEditar ? (
                  <>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                      {convocados.map((j) => (
                        <TouchableOpacity key={j.id} style={[styles.chip, asigAbierta.asig[elSel.id] === j.id && styles.chipActivo, usados.has(j.id) && asigAbierta.asig[elSel.id] !== j.id && { opacity: 0.45 }]} onPress={() => ponerAsig((a) => asignar(a, elSel.id, j.id))}>
                          <Text style={[styles.chipTexto, asigAbierta.asig[elSel.id] === j.id && { color: '#fff' }]}>{j.dorsal != null && j.dorsal !== '' ? `${j.dorsal} · ` : ''}{corto(j)}</Text>
                        </TouchableOpacity>
                      ))}
                      <TouchableOpacity style={styles.chip} onPress={() => ponerAsig((a) => asignar(a, elSel.id, null))}><Text style={styles.chipTexto}>Quitar</Text></TouchableOpacity>
                    </View>
                    <Text style={styles.panelTitulo}>¿A quién marca? (número del rival)</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                      {Array.from({ length: 11 }, (_, i) => String(i + 1)).map((n) => (
                        <TouchableOpacity key={n} style={[styles.chipNum, asigAbierta.textos[elSel.id] === n && styles.chipActivo]} onPress={() => ponerAsig((a) => ponerTexto(a, elSel.id, asigAbierta.textos[elSel.id] === n ? '' : n))}>
                          <Text style={[styles.chipTexto, asigAbierta.textos[elSel.id] === n && { color: '#fff' }]}>{n}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <TextInput style={styles.input} placeholder="…o escribe (p. ej. el 9, el lateral izquierdo)" value={asigAbierta.textos[elSel.id] || ''} maxLength={60} onChangeText={(t) => ponerAsig((a) => ponerTexto(a, elSel.id, t))} />
                  </>
                ) : <Text style={styles.ayuda}>{asigAbierta.textos[elSel.id] ? `Marca a: ${asigAbierta.textos[elSel.id]}` : 'Solo el entrenador y el segundo entrenador pueden cambiarlo.'}</Text>}
              </View>
            )}
            {puedeEditar && <TouchableOpacity style={[styles.botonVerde, { alignSelf: 'stretch' }]} onPress={guardarAsignacion} disabled={guardando}><Text style={styles.botonTexto}>{guardando ? 'Guardando…' : 'Guardar nombres de este partido'}</Text></TouchableOpacity>}
          </>
        )}
        {modo === 'editar' && puedeEditar && (
          <>
            {elSel && (
              <View style={styles.panel}>
                {elSel.k === 'nota' && <TextInput style={styles.input} value={elSel.t} maxLength={120} onChangeText={(t) => cambiarJugada((j) => cambiarNota(j, elSel.id, t))} />}
                {elSel.k === 'jugador' && <TouchableOpacity style={styles.chip} onPress={() => cambiarJugada((j) => alternarMarca(j, elSel.id))}><Text style={styles.chipTexto}>{elSel.marca ? '✔ Marca a un rival (quitar)' : 'Marca a un rival (activar)'}</Text></TouchableOpacity>}
                {elSel.k === 'rival' && (
                  <>
                    <Text style={styles.panelTitulo}>Número del rival</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                      {Array.from({ length: 11 }, (_, i) => i + 1).map((n) => (
                        <TouchableOpacity key={n} style={[styles.chipNum, elSel.n === n && styles.chipActivo]} onPress={() => cambiarJugada((j) => numeroRival(j, elSel.id, n))}>
                          <Text style={[styles.chipTexto, elSel.n === n && { color: '#fff' }]}>{n}</Text>
                        </TouchableOpacity>
                      ))}
                      <TouchableOpacity style={styles.chip} onPress={() => cambiarJugada((j) => numeroRival(j, elSel.id, null))}><Text style={styles.chipTexto}>Sin número</Text></TouchableOpacity>
                    </View>
                  </>
                )}
                {elSel.k === 'flecha' && <Text style={styles.ayuda}>Flecha de {ESTILOS_FLECHA[elSel.estilo].etiqueta.toLowerCase()}. Para cambiarla, bórrala y dibuja otra.</Text>}
                <TouchableOpacity style={[styles.chip, { borderColor: '#dc2626' }]} onPress={() => { cambiarJugada((j) => borrarElemento(j, elSel.id)); setSel(null); }}><Text style={[styles.chipTexto, { color: '#dc2626' }]}>🗑 Borrar esto</Text></TouchableOpacity>
              </View>
            )}
            <TouchableOpacity style={[styles.botonVerde, { alignSelf: 'stretch' }]} onPress={guardarDibujo} disabled={guardando || !sucio}><Text style={styles.botonTexto}>{guardando ? 'Guardando…' : sucio ? 'Guardar dibujo' : 'Guardado'}</Text></TouchableOpacity>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
              <TouchableOpacity style={styles.botonGris} onPress={() => { setAbierta(duplicar(abierta)); setSucio(true); setSel(null); }}><Text style={styles.botonGrisTexto}>Duplicar como nueva</Text></TouchableOpacity>
              <TouchableOpacity style={styles.botonGris} onPress={borrarJugada}><Text style={[styles.botonGrisTexto, { color: '#dc2626' }]}>Borrar jugada</Text></TouchableOpacity>
            </View>
          </>
        )}
        {!!error && <Text style={styles.error}>{error}</Text>}
        <TouchableOpacity style={[styles.botonNegro, { alignSelf: 'stretch', marginTop: 10 }]} onPress={() => imprimir([abierta])}><Text style={styles.botonTexto}>🖨️ Imprimir esta jugada</Text></TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#f8fafc' },
  titulo: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 4 },
  ayuda: { color: '#6b7280', fontSize: 13, marginVertical: 6 },
  error: { color: '#dc2626', marginVertical: 8 },
  volver: { color: '#2563eb', fontWeight: '700', marginBottom: 8 },
  tarjeta: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', padding: 14, marginBottom: 8 },
  tarjetaTitulo: { fontSize: 15, fontWeight: '700', color: '#111827' },
  tarjetaSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 9, backgroundColor: '#fff', marginBottom: 6, fontSize: 14 },
  chip: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#fff', marginRight: 6, marginBottom: 6 },
  chipActivo: { backgroundColor: '#111827', borderColor: '#111827' },
  chipNum: { minWidth: 36, alignItems: 'center', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingVertical: 7, backgroundColor: '#fff', marginRight: 6, marginBottom: 6 },
  chipTexto: { fontSize: 12, fontWeight: '700', color: '#374151' },
  panel: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', padding: 10, marginBottom: 10 },
  panelTitulo: { fontWeight: '800', marginBottom: 6, color: '#111827' },
  botonVerde: { backgroundColor: '#16a34a', borderRadius: 8, paddingVertical: 11, paddingHorizontal: 16, alignItems: 'center', marginRight: 8, marginBottom: 6 },
  botonNegro: { backgroundColor: '#111827', borderRadius: 8, paddingVertical: 11, paddingHorizontal: 16, alignItems: 'center', marginRight: 8, marginBottom: 6 },
  botonTexto: { color: '#fff', fontWeight: '800' },
  botonGris: { backgroundColor: '#e5e7eb', borderRadius: 8, paddingVertical: 9, paddingHorizontal: 14, marginRight: 8, marginBottom: 6 },
  botonGrisTexto: { color: '#374151', fontWeight: '700' },
});

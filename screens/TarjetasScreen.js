import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cargarDatosTarjetasApi, listarJugadoresApi, obtenerUsuario, crearAjusteTarjetaApi, borrarAjusteTarjetaApi } from '../data/apiClient';
import { confirmar } from '../data/confirmar';
import { compartirWhatsApp } from '../data/compartir';
import { acumularTarjetas, textoCiclo, textoTarjetas, fechaISO, CICLO_POR_DEFECTO, CICLOS_POSIBLES, esPartidoDePrueba } from '../data/tarjetas';

const CLAVE_CICLO = '@ciclo_amarillas';
const fechaCorta = (f) => { const d = new Date(String(f).replace(' ', 'T')); return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }); };

// Tarjetas acumuladas de la temporada por jugador, a partir de lo que el delegado registra en cada partido.
export default function TarjetasScreen() {
  const [partidos, setPartidos] = useState([]);
  const [eventos, setEventos] = useState({});
  const [jugadores, setJugadores] = useState([]);
  const [ciclo, setCiclo] = useState(CICLO_POR_DEFECTO);
  const [abierto, setAbierto] = useState(null);
  const [ajustes, setAjustes] = useState([]);
  const [puedeEditar, setPuedeEditar] = useState(false);
  const [form, setForm] = useState(null); // { jugador_id, tipo, cantidad, hasta, nota }
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setError('');
    try {
      try { const c = Number(await AsyncStorage.getItem(CLAVE_CICLO)); if (CICLOS_POSIBLES.includes(c)) setCiclo(c); } catch (e) { /* sin almacenamiento */ }
      const [datos, js, u] = await Promise.all([cargarDatosTarjetasApi(), listarJugadoresApi(), obtenerUsuario()]);
      setPartidos(datos.partidos.filter((p) => !esPartidoDePrueba(p))); setJugadores(js); setEventos(datos.eventos); setAjustes(datos.ajustes);
      setPuedeEditar(['delegado', 'entrenador', 'segundo_entrenador'].includes(u?.role));
    } catch (e) { setError(e.message || 'No se pudieron cargar las tarjetas'); } finally { setCargando(false); }
  }, []);
  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const porId = useMemo(() => Object.fromEntries(jugadores.map((j) => [j.id, j])), [jugadores]);
  const filas = useMemo(() => acumularTarjetas(partidos, eventos, ciclo, ajustes), [partidos, eventos, ciclo, ajustes]);
  const cambiarCiclo = async (c) => { setCiclo(c); try { await AsyncStorage.setItem(CLAVE_CICLO, String(c)); } catch (e) { /* sin almacenamiento */ } };
  const nombre = (id) => { const j = porId[id]; return j ? `${j.dorsal != null && j.dorsal !== '' ? `${j.dorsal} · ` : ''}${j.apodo || j.nombre}` : `Jugador ${id}`; };

  const guardarAjuste = async () => {
    setError('');
    const cuerpo = { jugador_id: form.jugador_id, tipo: form.tipo, nota: (form.nota || '').trim() || null };
    if (!form.jugador_id) return setError('Elige un jugador.');
    if (form.tipo === 'sancion') { const f = fechaISO(form.hasta); if (!f) return setError('Escribe la fecha como 27/11/2026.'); cuerpo.hasta = f; } else {
      const n = parseInt(form.cantidad, 10); if (!(n >= 1 && n <= 20)) return setError('Escribe cuántas tarjetas (1 a 20).'); cuerpo.cantidad = n;
    }
    setGuardando(true);
    try { const nuevo = await crearAjusteTarjetaApi(cuerpo); setAjustes((a) => [nuevo, ...a]); setForm(null); } catch (e) { setError(e.message || 'No se pudo guardar'); } finally { setGuardando(false); }
  };
  const borrarAjuste = (a) => confirmar('Borrar ajuste', '¿Borrar este ajuste manual?', async () => {
    try { await borrarAjusteTarjetaApi(a.id); setAjustes((x) => x.filter((y) => y.id !== a.id)); } catch (e) { setError(e.message || 'No se pudo borrar'); }
  }, 'Borrar');
  const textoAjuste = (a) => (a.tipo === 'sancion' ? `⛔ Sanción hasta el ${String(a.hasta).split('-').reverse().join('/')}` : `${a.tipo === 'rojas' ? '🟥' : '🟨'} +${a.cantidad} anteriores`);

  if (cargando) return <ActivityIndicator style={{ marginTop: 40 }} />;
  return (
    <ScrollView style={styles.contenedor} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
      <Text style={styles.ayuda}>Suma las tarjetas de cada partido cuando se cierra (partidos cerrados: {partidos.filter((p) => p.estado === 'finalizado').length}). Las de los rivales no cuentan.</Text>
      <Text style={styles.etiqueta}>Amarillas que cumplen ciclo (según tu competición)</Text>
      <View style={{ flexDirection: 'row', marginBottom: 10 }}>
        {CICLOS_POSIBLES.map((c) => (
          <TouchableOpacity key={c} style={[styles.chip, ciclo === c && styles.chipActivo]} onPress={() => cambiarCiclo(c)}><Text style={[styles.chipTexto, ciclo === c && { color: '#fff' }]}>{c}</Text></TouchableOpacity>
        ))}
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
      {filas.length === 0 && !error && <Text style={styles.ayuda}>Todavía no hay tarjetas registradas.</Text>}
      {filas.map((f) => (
        <TouchableOpacity key={f.jugador_id} style={[styles.fila, f.apercibido && styles.filaAviso]} onPress={() => setAbierto(abierto === f.jugador_id ? null : f.jugador_id)}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.nombre}>{nombre(f.jugador_id)}</Text>
            <Text style={styles.cuenta}>🟨 {f.amarillas}{f.rojas ? `   🟥 ${f.rojas}` : ''}</Text>
          </View>
          <Text style={[styles.sub, f.apercibido && { color: '#b45309', fontWeight: '800' }]}>{textoCiclo(f, ciclo)}</Text>
          {abierto === f.jugador_id && f.detalle.map((d, i) => (
            <Text key={i} style={styles.detalle}>{d.tipo === 'roja' ? '🟥' : '🟨'} {fechaCorta(d.fecha)} · vs {d.rival}{d.minuto != null ? ` · min ${d.minuto}` : ''}</Text>
          ))}
        </TouchableOpacity>
      ))}
      {filas.length > 0 && (
        <TouchableOpacity style={styles.boton} onPress={() => compartirWhatsApp(textoTarjetas(filas, porId, ciclo))}><Text style={styles.botonTexto}>Compartir por WhatsApp</Text></TouchableOpacity>
      )}
      <Text style={styles.etiqueta}>Ajustes manuales</Text>
      {ajustes.length === 0 && <Text style={styles.ayuda}>Sin ajustes. Úsalos para tarjetas anteriores a la app, correcciones de acta o una sanción con fecha.</Text>}
      {ajustes.map((a) => (
        <View key={a.id} style={styles.ajuste}>
          <Text style={{ flex: 1, fontSize: 13, color: '#111827' }}>{nombre(a.jugador_id)} · {textoAjuste(a)}{a.nota ? ` · ${a.nota}` : ''}</Text>
          {puedeEditar && <TouchableOpacity onPress={() => borrarAjuste(a)}><Text style={{ color: '#dc2626', fontWeight: '800' }}>✕</Text></TouchableOpacity>}
        </View>
      ))}
      {puedeEditar && !form && <TouchableOpacity style={styles.botonGris} onPress={() => setForm({ jugador_id: null, tipo: 'amarillas', cantidad: '', hasta: '', nota: '' })}><Text style={styles.botonGrisTexto}>＋ Añadir ajuste</Text></TouchableOpacity>}
      {puedeEditar && form && (
        <View style={styles.formulario}>
          <Text style={styles.etiqueta}>Jugador</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {jugadores.map((j) => (
              <TouchableOpacity key={j.id} style={[styles.chipP, form.jugador_id === j.id && styles.chipActivo]} onPress={() => setForm({ ...form, jugador_id: j.id })}>
                <Text style={[styles.chipTextoP, form.jugador_id === j.id && { color: '#fff' }]}>{j.dorsal != null && j.dorsal !== '' ? `${j.dorsal} · ` : ''}{j.apodo || j.nombre}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.etiqueta}>Qué</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {[['amarillas', '🟨 Amarillas anteriores'], ['rojas', '🟥 Rojas anteriores'], ['sancion', '⛔ Sanción hasta fecha']].map(([k, n]) => (
              <TouchableOpacity key={k} style={[styles.chipP, form.tipo === k && styles.chipActivo]} onPress={() => setForm({ ...form, tipo: k })}><Text style={[styles.chipTextoP, form.tipo === k && { color: '#fff' }]}>{n}</Text></TouchableOpacity>
            ))}
          </View>
          {form.tipo === 'sancion'
            ? <TextInput style={styles.input} placeholder="Hasta (incluida): 27/11/2026" value={form.hasta} onChangeText={(t) => setForm({ ...form, hasta: t })} />
            : <TextInput style={styles.input} placeholder="Cuántas" keyboardType="number-pad" inputMode="numeric" maxLength={2} value={form.cantidad} onChangeText={(t) => setForm({ ...form, cantidad: t.replace(/\D/g, '') })} />}
          <TextInput style={styles.input} placeholder="Nota (opcional): acta, jornada…" maxLength={120} value={form.nota} onChangeText={(t) => setForm({ ...form, nota: t })} />
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity style={[styles.boton, { flex: 1, marginRight: 8 }]} onPress={guardarAjuste} disabled={guardando}><Text style={styles.botonTexto}>{guardando ? 'Guardando…' : 'Guardar'}</Text></TouchableOpacity>
            <TouchableOpacity style={styles.botonGris} onPress={() => { setForm(null); setError(''); }}><Text style={styles.botonGrisTexto}>Cancelar</Text></TouchableOpacity>
          </View>
        </View>
      )}
      <Text style={styles.nota}>Los apercibidos son los que llegan a una amarilla de cumplir ciclo. La sanción real la fija el Comité de Competición: revisa siempre el acta oficial. Las tarjetas anteriores a la app o las correcciones de acta se añaden como ajuste manual.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#f8fafc' },
  ayuda: { color: '#6b7280', fontSize: 13, marginBottom: 10 },
  etiqueta: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 6 },
  error: { color: '#dc2626', marginVertical: 8 },
  chip: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#fff', marginRight: 8 },
  chipActivo: { backgroundColor: '#111827', borderColor: '#111827' },
  chipTexto: { fontWeight: '800', color: '#374151' },
  fila: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', padding: 12, marginBottom: 8 },
  filaAviso: { borderColor: '#f59e0b', backgroundColor: '#fffbeb' },
  nombre: { fontSize: 15, fontWeight: '700', color: '#111827', flexShrink: 1 },
  cuenta: { fontSize: 15, fontWeight: '800' },
  sub: { fontSize: 12, color: '#6b7280', marginTop: 3 },
  detalle: { fontSize: 12, color: '#374151', marginTop: 4 },
  ajuste: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', padding: 10, marginBottom: 6 },
  formulario: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', padding: 12, marginTop: 6 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 9, backgroundColor: '#fff', marginVertical: 6, fontSize: 14 },
  chipP: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6, backgroundColor: '#fff', marginRight: 6, marginBottom: 6 },
  chipTextoP: { fontSize: 12, fontWeight: '700', color: '#374151' },
  botonGris: { backgroundColor: '#e5e7eb', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14, alignSelf: 'flex-start', marginTop: 4 },
  botonGrisTexto: { color: '#374151', fontWeight: '700' },
  boton: { backgroundColor: '#16a34a', borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 6 },
  botonTexto: { color: '#fff', fontWeight: '800' },
  nota: { fontSize: 11, color: '#6b7280', marginTop: 14, lineHeight: 16 },
});

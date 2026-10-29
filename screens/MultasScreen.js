import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { confirmar } from '../data/confirmar';
import { listarJugadoresApi, obtenerSaldosMultasApi, listarPagosMultasApi, registrarPagoMultaApi, eliminarPagoMultaApi, listarMultasManualesApi, crearMultaManualApi, eliminarMultaManualApi, obtenerUsuario } from '../data/apiClient';
import { euros, leerImporte, totalPendiente, TARIFAS, CONCEPTOS_MULTA, CUERPO_TECNICO, nombreMiembro, importeMulta, clavePersona, ROLES_MULTAR, validarMulta, multasDeAsistencia } from '../data/multas';
import { fechaISO } from '../data/tarjetas';

const nombreDe = (j) => (j ? `${j.apodo || j.nombre} ${j.apodo ? '' : j.apellidos || ''}`.trim() : 'Jugador');
const nombreFila = (s, jugadores) => (s.miembro ? `${nombreMiembro(s.miembro)} (cuerpo técnico)` : nombreDe(jugadores[s.jugador_id]));

export default function MultasScreen() {
  const [saldos, setSaldos] = useState([]);
  const [jugadores, setJugadores] = useState({});
  const [puedePagar, setPuedePagar] = useState(false);
  const [puedeMultar, setPuedeMultar] = useState(false);
  const [multas, setMultas] = useState([]); // multas puestas a mano del jugador abierto
  const [form, setForm] = useState(null); // { persona, tipo, fecha }
  const [guardando, setGuardando] = useState(false);
  const [abierto, setAbierto] = useState(null); // clave de la persona con el detalle abierto
  const [pagos, setPagos] = useState([]);
  const [importe, setImporte] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setError('');
    try {
      const [s, j, u] = await Promise.all([obtenerSaldosMultasApi(), listarJugadoresApi(), obtenerUsuario()]);
      setSaldos(s);
      setJugadores(Object.fromEntries(j.map((x) => [x.id, x])));
      setPuedePagar(['delegado', 'entrenador'].includes(u?.role));
      setPuedeMultar(ROLES_MULTAR.includes(u?.role));
    } catch (e) {
      setError(e.message || 'No se pudieron cargar las multas');
    } finally {
      setCargando(false);
    }
  }, []);
  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const quien = (x) => (x.miembro ? { miembro: x.miembro } : { jugador_id: x.jugador_id });
  const abrir = async (persona) => {
    const k = clavePersona(persona);
    if (abierto === k) return setAbierto(null);
    setAbierto(k); setImporte(''); setPagos([]); setMultas([]);
    try { const [p, m] = await Promise.all([listarPagosMultasApi(quien(persona)), listarMultasManualesApi(quien(persona)).catch(() => [])]); setPagos(p); setMultas(m); } catch (e) { setError(e.message); }
  };
  const pagar = async (persona) => {
    const n = leerImporte(importe);
    if (n == null) return setError('Escribe un importe mayor que 0 (ej. 5 o 2,50).');
    setError('');
    try { await registrarPagoMultaApi({ ...quien(persona), importe: n }); setImporte(''); setPagos(await listarPagosMultasApi(quien(persona))); await cargar(); } catch (e) { setError(e.message); }
  };
  const quitar = (p) => confirmar('Borrar pago', `¿Borrar el pago de ${euros(p.importe)}?`, async () => {
    try { await eliminarPagoMultaApi(p.id); setPagos(await listarPagosMultasApi(quien(p))); await cargar(); } catch (e) { setError(e.message); }
  }, 'Borrar');

  const guardarMulta = async () => {
    const r = validarMulta(form, fechaISO);
    if (r.error) return setError(r.error);
    setError(''); setGuardando(true);
    try {
      await crearMultaManualApi(r.cuerpo);
      const persona = form.persona;
      setForm(null);
      await cargar();
      setAbierto(clavePersona(persona));
      setPagos(await listarPagosMultasApi(quien(persona)));
      setMultas(await listarMultasManualesApi(quien(persona)));
    } catch (e) { setError(e.message || 'No se pudo guardar la multa'); } finally { setGuardando(false); }
  };
  const quitarMulta = (m) => confirmar('Borrar multa', `¿Borrar la multa de ${euros(m.importe)} (${m.concepto})?`, async () => {
    try { await eliminarMultaManualApi(m.id); setMultas(await listarMultasManualesApi(quien(m))); await cargar(); } catch (e) { setError(e.message); }
  }, 'Borrar');
  const listaJugadores = Object.values(jugadores).sort((a, b) => (Number(a.dorsal) || 999) - (Number(b.dorsal) || 999));

  if (cargando) return <ActivityIndicator style={{ marginTop: 60 }} size="large" color="#16a34a" />;
  const pendiente = totalPendiente(saldos);

  return (
    <ScrollView style={styles.contenedor} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <View style={styles.total}><Text style={styles.totalValor}>{euros(pendiente)}</Text><Text style={styles.totalEtiqueta}>pendiente de cobrar</Text></View>
      {puedeMultar && !form && (
        <TouchableOpacity style={styles.botonNueva} onPress={() => { setError(''); setForm({ persona: null, tipo: '', fecha: '' }); }} testID="multa-nueva">
          <Text style={styles.botonNuevaTexto}>＋ Poner una multa</Text>
        </TouchableOpacity>
      )}
      {puedeMultar && form && (
        <View style={styles.formulario}>
          <Text style={styles.formTitulo}>Nueva multa</Text>
          <Text style={styles.formEtiqueta}>Jugador</Text>
          <View style={styles.chips}>
            {listaJugadores.map((j) => (
              <TouchableOpacity key={j.id} style={[styles.chip, form.persona && clavePersona(form.persona) === `j:${j.id}` && styles.chipActivo]} onPress={() => setForm((f) => ({ ...f, persona: { jugador_id: j.id } }))}>
                <Text style={[styles.chipTexto, form.persona && clavePersona(form.persona) === `j:${j.id}` && styles.chipTextoActivo]}>{j.dorsal != null && j.dorsal !== '' ? `${j.dorsal} · ` : ''}{j.apodo || j.nombre}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.formEtiqueta}>Cuerpo técnico (paga el doble)</Text>
          <View style={styles.chips}>
            {CUERPO_TECNICO.map((m) => (
              <TouchableOpacity key={m.miembro} style={[styles.chip, form.persona?.miembro === m.miembro && styles.chipActivo]} onPress={() => setForm((f) => ({ ...f, persona: { miembro: m.miembro } }))} testID={`multa-miembro-${m.miembro}`}>
                <Text style={[styles.chipTexto, form.persona?.miembro === m.miembro && styles.chipTextoActivo]}>{m.cargo} · {m.nombre.split(' ')[0]}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.formEtiqueta}>Concepto</Text>
          <View style={styles.chips}>
            {CONCEPTOS_MULTA.map((c) => (
              <TouchableOpacity key={c} style={[styles.chipMotivo, form.tipo === c && styles.chipActivo]} onPress={() => setForm((f) => ({ ...f, tipo: c }))} testID={`multa-tipo-${c}`}>
                <Text style={[styles.chipMotivoTexto, form.tipo === c && styles.chipTextoActivo]}>{TARIFAS[c].etiqueta} · {euros(importeMulta(c, !!form.persona?.miembro))}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {!!form.tipo && !!form.persona && <Text style={styles.importeAuto} testID="multa-importe-auto">Importe: {euros(importeMulta(form.tipo, !!form.persona.miembro))}{form.persona.miembro ? ' (doble, cuerpo técnico)' : ''}</Text>}
          <TextInput style={[styles.input, { marginTop: 8 }]} value={form.fecha} onChangeText={(t) => setForm((f) => ({ ...f, fecha: t }))} placeholder="Fecha (vacío = hoy)" />
          <View style={styles.nuevo}>
            <TouchableOpacity style={[styles.boton, { flex: 1, paddingVertical: 12 }]} onPress={guardarMulta} disabled={guardando} testID="multa-guardar">
              {guardando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botonTexto}>Guardar multa</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.botonGris} onPress={() => { setForm(null); setError(''); }}><Text style={styles.botonGrisTexto}>Cancelar</Text></TouchableOpacity>
          </View>
        </View>
      )}
      {!!error && <Text style={styles.error}>{error}</Text>}
      {saldos.length === 0 && <Text style={styles.vacio}>Todavía no hay multas.</Text>}
      {saldos.map((s) => (
        <View key={clavePersona(s)} style={styles.tarjeta}>
          <TouchableOpacity onPress={() => abrir(s)} activeOpacity={0.8} style={styles.fila}>
            <View style={{ flex: 1 }}>
              <Text style={styles.nombre}>{nombreFila(s, jugadores)}</Text>
              <Text style={styles.detalle}>Multas {euros(s.multas)} · pagado {euros(s.pagado)}</Text>
            </View>
            <Text style={[styles.saldo, s.saldo <= 0 && { color: '#16a34a' }]}>{s.saldo > 0 ? euros(s.saldo) : s.saldo < 0 ? `+${euros(-s.saldo)}` : 'Al día'}</Text>
          </TouchableOpacity>
          {abierto === clavePersona(s) && (
            <View style={{ marginTop: 10 }}>
              <Text style={styles.subtitulo}>Multas</Text>
              {multasDeAsistencia(s) > 0 && <Text style={styles.detalle}>De pasar lista (anteriores): {euros(multasDeAsistencia(s))}</Text>}
              {multas.map((m) => (
                <View key={m.id} style={styles.pago}>
                  <Text style={[styles.detalle, { flex: 1 }]}>{String(m.fecha || '').split('-').reverse().join('/')} · {euros(m.importe)} · {m.concepto}{m.automatica ? ' · al cerrar el partido' : ''}</Text>
                  {puedeMultar && <TouchableOpacity onPress={() => quitarMulta(m)}><Text style={styles.quitar}>Borrar</Text></TouchableOpacity>}
                </View>
              ))}
              {multas.length === 0 && multasDeAsistencia(s) <= 0 && <Text style={styles.detalle}>Sin multas.</Text>}
              <Text style={[styles.subtitulo, { marginTop: 10 }]}>Pagos</Text>
              {pagos.map((p) => (
                <View key={p.id} style={styles.pago}>
                  <Text style={styles.detalle}>{p.fecha.split('-').reverse().join('/')} · {euros(p.importe)}{p.nota ? ` · ${p.nota}` : ''}</Text>
                  {puedePagar && <TouchableOpacity onPress={() => quitar(p)}><Text style={styles.quitar}>Borrar</Text></TouchableOpacity>}
                </View>
              ))}
              {pagos.length === 0 && <Text style={styles.detalle}>Sin pagos todavía.</Text>}
              {puedePagar && (
                <View style={styles.nuevo}>
                  <TextInput style={styles.input} value={importe} onChangeText={setImporte} placeholder="Importe €" keyboardType="decimal-pad" />
                  <TouchableOpacity style={styles.boton} onPress={() => pagar(s)}><Text style={styles.botonTexto}>Registrar pago</Text></TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>
      ))}
      <Text style={styles.nota}>Las multas se ponen por concepto y el importe sale solo (el cuerpo técnico paga el doble). Las tarjetas amarillas y rojas se apuntan solas al cerrar el partido. Se debe hasta que se paga: el saldo es lo multado menos los pagos. Si hay un error, se borra la multa.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#f8fafc' },
  total: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center' },
  totalValor: { fontSize: 28, fontWeight: '800', color: '#111827' },
  totalEtiqueta: { fontSize: 12, color: '#6b7280' },
  vacio: { color: '#9ca3af', textAlign: 'center', marginTop: 20 },
  tarjeta: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1.5, borderColor: '#e5e7eb' },
  fila: { flexDirection: 'row', alignItems: 'center' },
  nombre: { fontSize: 15, fontWeight: '800', color: '#111827' },
  detalle: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  saldo: { fontSize: 17, fontWeight: '800', color: '#dc2626' },
  pago: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  quitar: { color: '#dc2626', fontSize: 12, fontWeight: '700' },
  nuevo: { flexDirection: 'row', gap: 8, marginTop: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 10, backgroundColor: '#fff' },
  boton: { backgroundColor: '#16a34a', borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center' },
  botonTexto: { color: '#fff', fontWeight: '800', fontSize: 13 },
  error: { color: '#dc2626', marginVertical: 8, fontSize: 13 },
  botonNueva: { backgroundColor: '#16a34a', borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginBottom: 12 },
  botonNuevaTexto: { color: '#fff', fontWeight: '800', fontSize: 15 },
  formulario: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1.5, borderColor: '#86efac' },
  formTitulo: { fontSize: 15, fontWeight: '800', color: '#111827' },
  formEtiqueta: { fontSize: 12, fontWeight: '700', color: '#6b7280', marginTop: 12, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 10, paddingVertical: 7, paddingHorizontal: 10, backgroundColor: '#fff' },
  chipActivo: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  chipTexto: { fontSize: 13, fontWeight: '700', color: '#374151' },
  chipTextoActivo: { color: '#fff' },
  chipMotivo: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 16, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#fff' },
  chipMotivoTexto: { fontSize: 12, fontWeight: '600', color: '#4b5563' },
  botonGris: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center', backgroundColor: '#fff' },
  botonGrisTexto: { color: '#374151', fontWeight: '700', fontSize: 13 },
  importeAuto: { marginTop: 10, fontSize: 14, fontWeight: '800', color: '#16a34a' },
  subtitulo: { fontSize: 12, fontWeight: '800', color: '#374151', marginBottom: 2 },
  nota: { fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 12 },
});

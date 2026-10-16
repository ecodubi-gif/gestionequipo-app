import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { confirmar } from '../data/confirmar';
import { listarJugadoresApi, obtenerSaldosMultasApi, listarPagosMultasApi, registrarPagoMultaApi, eliminarPagoMultaApi, obtenerUsuario } from '../data/apiClient';
import { euros, leerImporte, totalPendiente } from '../data/multas';

const nombreDe = (j) => (j ? `${j.apodo || j.nombre} ${j.apodo ? '' : j.apellidos || ''}`.trim() : 'Jugador');

export default function MultasScreen() {
  const [saldos, setSaldos] = useState([]);
  const [jugadores, setJugadores] = useState({});
  const [puedePagar, setPuedePagar] = useState(false);
  const [abierto, setAbierto] = useState(null); // jugador_id con el detalle abierto
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
    } catch (e) {
      setError(e.message || 'No se pudieron cargar las multas');
    } finally {
      setCargando(false);
    }
  }, []);
  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const abrir = async (id) => {
    if (abierto === id) return setAbierto(null);
    setAbierto(id); setImporte(''); setPagos([]);
    try { setPagos(await listarPagosMultasApi(id)); } catch (e) { setError(e.message); }
  };
  const pagar = async (id) => {
    const n = leerImporte(importe);
    if (n == null) return setError('Escribe un importe mayor que 0 (ej. 5 o 2,50).');
    setError('');
    try { await registrarPagoMultaApi({ jugador_id: id, importe: n }); setImporte(''); setPagos(await listarPagosMultasApi(id)); await cargar(); } catch (e) { setError(e.message); }
  };
  const quitar = (p) => confirmar('Borrar pago', `¿Borrar el pago de ${euros(p.importe)}?`, async () => {
    try { await eliminarPagoMultaApi(p.id); setPagos(await listarPagosMultasApi(p.jugador_id)); await cargar(); } catch (e) { setError(e.message); }
  }, 'Borrar');

  if (cargando) return <ActivityIndicator style={{ marginTop: 60 }} size="large" color="#16a34a" />;
  const pendiente = totalPendiente(saldos);

  return (
    <ScrollView style={styles.contenedor} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <View style={styles.total}><Text style={styles.totalValor}>{euros(pendiente)}</Text><Text style={styles.totalEtiqueta}>pendiente de cobrar</Text></View>
      {!!error && <Text style={styles.error}>{error}</Text>}
      {saldos.length === 0 && <Text style={styles.vacio}>Todavía no hay multas.</Text>}
      {saldos.map((s) => (
        <View key={s.jugador_id} style={styles.tarjeta}>
          <TouchableOpacity onPress={() => abrir(s.jugador_id)} activeOpacity={0.8} style={styles.fila}>
            <View style={{ flex: 1 }}>
              <Text style={styles.nombre}>{nombreDe(jugadores[s.jugador_id])}</Text>
              <Text style={styles.detalle}>Multas {euros(s.multas)} · pagado {euros(s.pagado)}</Text>
            </View>
            <Text style={[styles.saldo, s.saldo <= 0 && { color: '#16a34a' }]}>{s.saldo > 0 ? euros(s.saldo) : s.saldo < 0 ? `+${euros(-s.saldo)}` : 'Al día'}</Text>
          </TouchableOpacity>
          {abierto === s.jugador_id && (
            <View style={{ marginTop: 10 }}>
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
                  <TouchableOpacity style={styles.boton} onPress={() => pagar(s.jugador_id)}><Text style={styles.botonTexto}>Registrar pago</Text></TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>
      ))}
      <Text style={styles.nota}>El saldo es la suma de las multas de asistencia menos los pagos que registres aquí.</Text>
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
  nota: { fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 12 },
});

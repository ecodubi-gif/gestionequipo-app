import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { obtenerScoutingApi } from '../data/apiClient';
import { mismoEquipo } from '../data/liga';
import { SISTEMAS_ENFRENTAMIENTO, claveSistema, analizar, mejoresOpciones } from '../data/enfrentamiento';

const COLOR = { ventaja: '#15803d', igualdad: '#b45309', inferioridad: '#b91c1c' };
const CLAVE = 'enfrentamiento_propio_';

// Elegimos nuestro sistema y el del rival; la pantalla ordena nuestras opciones y da los detalles tácticos.
export default function EnfrentamientoScreen({ route }) {
  const { rival = '', partidoId = null } = route.params || {};
  const [propio, setPropio] = useState('4-4-2');
  const [sistemaRival, setSistemaRival] = useState('4-4-2');
  const [fases, setFases] = useState([]); // [[etiqueta, sistema]] según el informe de scouting
  const [pestana, setPestana] = useState('balon');
  const clave = CLAVE + (partidoId || rival || 'general');

  useEffect(() => {
    (async () => {
      try { const g = await AsyncStorage.getItem(clave); if (g && claveSistema(g)) setPropio(claveSistema(g)); } catch (e) { /* sin almacenamiento */ }
      try {
        const todos = await obtenerScoutingApi();
        const k = Object.keys(todos).find((x) => mismoEquipo(x, rival));
        const d = k ? (todos[k].datos || {}) : {};
        const f = [['Inicio', d.dibujo], ['Con balón', d.dibujo_ataque], ['Sin balón', d.dibujo_defensa]]
          .map(([e, s]) => [e, claveSistema(s)]).filter(([, s]) => s);
        setFases(f);
        if (f.length) setSistemaRival(f[0][1]);
      } catch (e) { /* sin informe */ }
    })();
  }, [clave, rival]);

  const elegirPropio = async (s) => {
    setPropio(s);
    try { await AsyncStorage.setItem(clave, s); } catch (e) { /* sin almacenamiento */ }
  };

  const opciones = useMemo(() => mejoresOpciones(sistemaRival), [sistemaRival]);
  const a = useMemo(() => analizar(propio, sistemaRival), [propio, sistemaRival]);
  const lista = (t) => (a[t] || []).map((x, i) => <Text key={i} style={styles.texto}>• {x}</Text>);

  const selector = (valor, onPress) => (
    <View style={styles.chips}>
      {[...new Set(SISTEMAS_ENFRENTAMIENTO.map(claveSistema))].map((s) => (
        <TouchableOpacity key={s} style={[styles.chip, valor === s && styles.chipActivo]} onPress={() => onPress(s)}>
          <Text style={[styles.chipTexto, valor === s && styles.chipTextoActivo]}>{s}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.pantalla}>
      {rival ? <Text style={styles.titulo}>Rival: {rival}</Text> : null}

      <Text style={styles.etiqueta}>Nuestro sistema en este partido</Text>
      {selector(propio, elegirPropio)}

      <Text style={styles.etiqueta}>Sistema del rival</Text>
      {fases.length > 0 && (
        <View style={styles.chips}>
          {fases.map(([e, s]) => (
            <TouchableOpacity key={e} style={[styles.chip, { borderColor: '#7c3aed' }, sistemaRival === s && styles.chipActivo]} onPress={() => setSistemaRival(s)}>
              <Text style={[styles.chipTexto, sistemaRival === s && styles.chipTextoActivo]}>{e}: {s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {selector(sistemaRival, setSistemaRival)}

      <View style={styles.tarjeta}>
        <Text style={styles.subtitulo}>Mejores opciones contra el {sistemaRival}</Text>
        {opciones.slice(0, 6).map((o, i) => (
          <TouchableOpacity key={o.sistema} onPress={() => elegirPropio(o.sistema)} style={[styles.fila, o.sistema === propio && styles.filaActiva]}>
            <Text style={styles.puesto}>{i + 1}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.sist}>{o.sistema} <Text style={styles.mini}>({o.puntuacion})</Text></Text>
              {o.motivos.length > 0 && <Text style={[styles.mini, { color: COLOR.ventaja }]}>＋ {o.motivos.join(' · ')}</Text>}
              {o.avisos.length > 0 && <Text style={[styles.mini, { color: COLOR.inferioridad }]}>− {o.avisos.join(' · ')}</Text>}
            </View>
          </TouchableOpacity>
        ))}
        <Text style={styles.mini}>Toca uno para elegirlo como nuestro sistema. La puntuación sale de contar jugadores por zona; es una guía, no una regla.</Text>
      </View>

      {a && (
        <View style={styles.tarjeta}>
          <Text style={styles.subtitulo}>{a.propio} contra {a.rival}</Text>
          <Text style={styles.mini}>Nosotros: {a.descripcionPropio}</Text>
          <Text style={styles.mini}>Rival: {a.descripcionRival}</Text>
          <Text style={[styles.texto, { fontWeight: '700', marginTop: 8 }]}>{a.resumen}</Text>
          {a.superioridades.map((z) => (
            <Text key={z.id} style={styles.texto}>
              <Text style={{ color: COLOR[z.tipo], fontWeight: '800' }}>{z.zona}: </Text>{z.texto}
            </Text>
          ))}
          <View style={styles.chips}>
            {[['balon', 'Con balón'], ['sin', 'Sin balón'], ['riesgos', 'Riesgos'], ['ajustes', 'Ajustes']].map(([id, n]) => (
              <TouchableOpacity key={id} style={[styles.chip, pestana === id && styles.chipActivo]} onPress={() => setPestana(id)}>
                <Text style={[styles.chipTexto, pestana === id && styles.chipTextoActivo]}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {pestana === 'balon' && lista('conBalon')}
          {pestana === 'sin' && lista('sinBalon')}
          {pestana === 'riesgos' && (a.riesgos.length ? lista('riesgos') : <Text style={styles.texto}>Sin riesgos claros en el reparto de jugadores.</Text>)}
          {pestana === 'ajustes' && lista('ajustes')}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pantalla: { padding: 16, paddingBottom: 40, gap: 8, maxWidth: 720, width: '100%', alignSelf: 'center' },
  titulo: { fontSize: 18, fontWeight: '800', color: '#1f2937' },
  etiqueta: { fontSize: 13, fontWeight: '800', color: '#6b7280', textTransform: 'uppercase', marginTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 4 },
  chip: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#fff' },
  chipActivo: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  chipTexto: { fontSize: 13, color: '#374151', fontWeight: '600' },
  chipTextoActivo: { color: '#fff' },
  tarjeta: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginTop: 10, gap: 6, borderWidth: 1, borderColor: '#e5e7eb' },
  subtitulo: { fontSize: 16, fontWeight: '800', color: '#1f2937' },
  texto: { fontSize: 14, color: '#1f2937', lineHeight: 20 },
  mini: { fontSize: 12, color: '#6b7280' },
  fila: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 6, paddingHorizontal: 6, borderRadius: 8 },
  filaActiva: { backgroundColor: '#f3e8ff' },
  puesto: { width: 22, fontSize: 16, fontWeight: '800', color: '#7c3aed' },
  sist: { fontSize: 15, fontWeight: '800', color: '#1f2937' },
});

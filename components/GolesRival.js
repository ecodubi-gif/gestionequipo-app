import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { resumenGoles, FRASE_GOLES, leerFicha, claveGoles, codificarPartido, partidosDeDatos, CLAVE_TRAMOS, leerTramos, escribirTramos, tramosVacios, resumenDeTramos, TRAMOS } from '../data/goles';

const VERDE = '#15803d';
const ROJO = '#dc2626';
const MORADO = '#7c3aed';

// Goles del rival por minuto. Se alimenta pegando el texto de la ficha de cada partido (una vez por semana).
// Se guarda dentro del informe de scouting (una clave por jornada), así que queda también en el historial.
export default function GolesRival({ equipo, datos, onCambiar, incrustado }) {
  const [anadiendo, setAnadiendo] = useState(false);
  const [jornada, setJornada] = useState('');
  const [rival, setRival] = useState('');
  const [texto, setTexto] = useState('');
  const [error, setError] = useState('');
  const [verPartidos, setVerPartidos] = useState(false);
  const [editando, setEditando] = useState(false);

  const partidos = partidosDeDatos(datos);
  const manual = leerTramos(datos && datos[CLAVE_TRAMOS]);
  const r = manual ? resumenDeTramos(manual) : resumenGoles(partidos);
  const hayDatos = r.partidos > 0 || (manual && r.gf + r.gc > 0);
  const base = manual || tramosVacios();
  const sumar = (i, k, d) => {
    const nuevo = base.map((p) => p.slice());
    nuevo[i][k] = Math.max(0, Math.min(99, nuevo[i][k] + d));
    onCambiar(CLAVE_TRAMOS, escribirTramos(nuevo));
  };
  const frase = FRASE_GOLES(r);

  const guardarPartido = () => {
    setError('');
    const j = parseInt(jornada, 10);
    if (!(j >= 1 && j <= 40)) { setError('Escribe el número de jornada (1 a 40).'); return; }
    const ficha = leerFicha(texto, equipo);
    if (!ficha) { setError('No encuentro los goles en ese texto. Copia la ficha entera, con las líneas "Goles del …:".'); return; }
    onCambiar(claveGoles(j), codificarPartido(j, rival.trim() || ficha.rival, ficha.goles));
    setJornada(''); setRival(''); setTexto(''); setAnadiendo(false);
  };

  return (
    <View style={[styles.caja, incrustado && styles.incrustado]} testID="goles-rival">
      <View style={styles.cab}>
        <Text style={styles.titulo}>⚽ Goles por minuto</Text>
        <TouchableOpacity onPress={() => setEditando(!editando)} testID="goles-editar"><Text style={styles.enlace}>{editando ? 'Cerrar' : 'Poner tramos'}</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => { setAnadiendo(!anadiendo); setError(''); }} testID="goles-anadir"><Text style={styles.enlace}>{anadiendo ? 'Cancelar' : '+ Partido'}</Text></TouchableOpacity>
      </View>

      {editando && (
        <View style={{ padding: 12, gap: 6, borderTopWidth: 1, borderTopColor: '#f3f4f6' }}>
          <Text style={styles.mini}>Solo los goles que ha marcado y los que ha encajado en cada tramo. Se guarda al pulsar «Guardar informe».</Text>
          {TRAMOS.map((t, i) => (
            <View key={t.id} style={styles.fila}>
              <Text style={styles.tramo}>{t.etiqueta}</Text>
              {[0, 1].map((k) => (
                <View key={k} style={styles.contador}>
                  <TouchableOpacity style={styles.mas} onPress={() => sumar(i, k, -1)} testID={`goles-${i}-${k}-menos`}><Text style={styles.masTexto}>−</Text></TouchableOpacity>
                  <Text style={[styles.cifra, { color: k === 0 ? VERDE : ROJO }]} testID={`goles-${i}-${k}`}>{base[i][k]}</Text>
                  <TouchableOpacity style={styles.mas} onPress={() => sumar(i, k, 1)} testID={`goles-${i}-${k}-mas`}><Text style={styles.masTexto}>+</Text></TouchableOpacity>
                </View>
              ))}
            </View>
          ))}
          <Text style={styles.mini}><Text style={{ color: VERDE, fontWeight: '800' }}>■</Text> a favor   <Text style={{ color: ROJO, fontWeight: '800' }}>■</Text> en contra</Text>
          {manual ? <TouchableOpacity onPress={() => onCambiar(CLAVE_TRAMOS, '')}><Text style={[styles.enlace, { color: ROJO }]}>Quitar los tramos escritos{partidos.length ? ' y usar los partidos' : ''}</Text></TouchableOpacity> : null}
        </View>
      )}

      {anadiendo && (
        <View style={{ padding: 12, gap: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6' }}>
          <Text style={styles.mini}>Abre la ficha del partido de {equipo}, copia todo el texto y pégalo aquí. Se guarda al pulsar «Guardar informe».</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput style={[styles.input, { width: 90 }]} value={jornada} onChangeText={(t) => setJornada(t.replace(/\D/g, '').slice(0, 2))} placeholder="Jornada" keyboardType="number-pad" placeholderTextColor="#9ca3af" testID="goles-jornada" />
            <TextInput style={[styles.input, { flex: 1 }]} value={rival} onChangeText={setRival} placeholder="Rival (opcional)" placeholderTextColor="#9ca3af" maxLength={30} />
          </View>
          <TextInput style={[styles.input, { minHeight: 90, textAlignVertical: 'top' }]} multiline value={texto} onChangeText={setTexto} placeholder="Pega aquí el texto de la ficha" placeholderTextColor="#9ca3af" testID="goles-texto" />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <TouchableOpacity style={styles.boton} onPress={guardarPartido} testID="goles-leer"><Text style={styles.botonTexto}>Leer goles</Text></TouchableOpacity>
        </View>
      )}

      {!hayDatos && !anadiendo && !editando ? (
        <Text style={styles.aviso}>Todavía no hay datos. Pulsa «Poner tramos» o añade un partido para ver cuándo marca y cuándo encaja.</Text>
      ) : null}

      {hayDatos ? (
        <View style={{ padding: 12, gap: 8 }}>
          <Text style={styles.resumen}>{r.manual ? '' : `${r.partidos} partidos · `}{r.gf} goles a favor · {r.gc} en contra</Text>
          {frase ? <Text style={styles.frase}>{frase}</Text> : null}
          <Text style={styles.mini}>{r.manual ? '' : `Marca primero en ${r.primero} de ${r.partidos} · `}1ª parte: {r.primeraParteF} a favor, {r.primeraParteC} en contra · 2ª parte: {r.segundaParteF} a favor, {r.segundaParteC} en contra</Text>
          <View style={{ gap: 6, marginTop: 4 }}>
            {r.tramos.map((t) => (
              <View key={t.id} style={styles.fila}>
                <Text style={styles.tramo}>{t.etiqueta}</Text>
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={styles.pista}><View style={[styles.barra, { width: `${(t.f / r.maxTramo) * 100}%`, backgroundColor: VERDE }]} /><Text style={styles.num}>{t.f}</Text></View>
                  <View style={styles.pista}><View style={[styles.barra, { width: `${(t.c / r.maxTramo) * 100}%`, backgroundColor: ROJO }]} /><Text style={styles.num}>{t.c}</Text></View>
                </View>
              </View>
            ))}
            <Text style={styles.mini}><Text style={{ color: VERDE, fontWeight: '800' }}>■</Text> a favor   <Text style={{ color: ROJO, fontWeight: '800' }}>■</Text> en contra</Text>
          </View>
          {r.goleadores.length ? <Text style={styles.mini}>Goleadores: {r.goleadores.map((g) => `${g.nombre} (${g.goles})`).join(', ')}</Text> : null}
          {partidos.length > 0 ? <TouchableOpacity onPress={() => setVerPartidos(!verPartidos)}><Text style={styles.enlace}>{verPartidos ? 'Ocultar partidos' : 'Ver partido a partido'}</Text></TouchableOpacity> : null}
          {verPartidos && partidos.map((p) => (
            <View key={p.clave} style={styles.partido}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={styles.partidoTit}>J{p.jornada}{p.rival ? ` · ${p.rival}` : ''} · {p.gf}-{p.gc}</Text>
                <TouchableOpacity onPress={() => onCambiar(p.clave, '')}><Text style={{ color: ROJO, fontWeight: '800' }}>✕</Text></TouchableOpacity>
              </View>
              <Text style={styles.mini}>{p.goles.map((g) => `${g.a === 'f' ? '+' : '−'}${g.min}'${g.jugador ? ' ' + g.jugador : ''}`).join(' · ') || 'Sin goles'}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  caja: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 10, overflow: 'hidden' },
  incrustado: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, marginBottom: 6 },
  cab: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, gap: 8 },
  titulo: { fontSize: 14, fontWeight: '800', color: '#111827', flex: 1 },
  enlace: { fontSize: 12, fontWeight: '700', color: MORADO },
  aviso: { fontSize: 12, color: '#6b7280', paddingHorizontal: 14, paddingBottom: 12 },
  error: { fontSize: 12, color: ROJO },
  resumen: { fontSize: 13, fontWeight: '700', color: '#111827' },
  frase: { fontSize: 13, color: '#4c1d95', fontWeight: '700' },
  mini: { fontSize: 11, color: '#6b7280' },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, color: '#111827', backgroundColor: '#fff' },
  boton: { backgroundColor: MORADO, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  botonTexto: { color: '#fff', fontWeight: '800', fontSize: 13 },
  contador: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  mas: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center' },
  masTexto: { color: MORADO, fontSize: 18, fontWeight: '800' },
  cifra: { minWidth: 22, textAlign: 'center', fontSize: 16, fontWeight: '800' },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tramo: { width: 58, fontSize: 11, color: '#374151', fontWeight: '700' },
  pista: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 10 },
  barra: { height: 8, borderRadius: 4, minWidth: 2 },
  num: { fontSize: 10, color: '#374151', fontWeight: '700' },
  partido: { backgroundColor: '#f9fafb', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  partidoTit: { fontSize: 12, fontWeight: '700', color: '#111827' },
});

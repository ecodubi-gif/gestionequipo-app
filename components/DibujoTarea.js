import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import DibujoSvg from './DibujoSvg';
import { dibujoDeTarea } from '../data/pizarra';
import { formasTarea, leyendaFlechas } from '../data/formas';
import { FLECHAS, COLOR_JUGADOR } from '../data/pizarra';
import { ROLES } from '../data/tareas';

// Dibujo de solo lectura de una tarea: la zona dentro del campo elegido, jugadores, material y flechas.
// tarea: los datos de la tarea (largo, ancho, formato, referencia y, si existe, dibujo). campos: los campos dados de alta.
export default function DibujoTarea({ tarea, campos, altoMax = 190, mostrarLeyenda = true }) {
  const [disponible, setDisponible] = useState(0);
  const d = dibujoDeTarea(tarea, campos);
  if (!d) return null;

  const res = disponible > 0 ? formasTarea({ tarea, dibujo: d.dibujo, campo: d.campo, modo: 'vista', anchoMax: disponible, altoMax }) : null;
  const roles = ['ataque', 'defensa', 'comodin', 'portero'].filter((r) => d.dibujo.jugadores.some((j) => j.rol === r));
  const flechas = leyendaFlechas(d.dibujo);

  return (
    <View style={styles.caja} onLayout={(e) => setDisponible(Math.round(e.nativeEvent.layout.width))}>
      {res && (
        <View style={{ alignSelf: 'center', width: res.ancho, height: res.alto }}>
          <DibujoSvg res={res} />
        </View>
      )}
      {mostrarLeyenda && (
        <View style={styles.leyenda}>
          {roles.map((r) => (
            <View key={r} style={styles.item}>
              <View style={[styles.punto, { backgroundColor: COLOR_JUGADOR[r] }]} />
              <Text style={styles.texto}>{ROLES[r].etiqueta} {d.dibujo.jugadores.filter((j) => j.rol === r).length}</Text>
            </View>
          ))}
          {flechas.map((f) => (
            <View key={f.tipo} style={styles.item}>
              <View style={[styles.muestra, { borderTopColor: f.color, borderStyle: f.discontinua ? 'dashed' : 'solid' }]} />
              <Text style={styles.texto}>{FLECHAS[f.tipo].etiqueta}</Text>
            </View>
          ))}
        </View>
      )}
      <Text style={styles.pie}>
        {d.campo.nombre} ({d.campo.largo} × {d.campo.ancho} m){d.automatico ? ' · colocación automática' : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  caja: { marginTop: 8, marginBottom: 4 },
  leyenda: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 6 },
  item: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 6, marginVertical: 1 },
  punto: { width: 9, height: 9, borderRadius: 5, marginRight: 4 },
  muestra: { width: 18, borderTopWidth: 2.5, marginRight: 4 },
  texto: { fontSize: 11, color: '#374151', fontWeight: '600' },
  pie: { fontSize: 10, color: '#9ca3af', textAlign: 'center', marginTop: 3 },
});

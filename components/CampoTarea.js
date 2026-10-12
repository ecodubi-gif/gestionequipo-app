import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { posicionesCampo, tamanoCampo, conteoDibujado, COLOR_CAMPO, COLOR_ROL } from '../data/campo';
import { ROLES } from '../data/tareas';

const DIAMETRO = 15;
const MARGEN = 10; // aire alrededor del campo para los comodines (van sobre la banda) y las porterías

// Dibujo automático a escala de una tarea: largo, ancho, porterías y jugadores de cada equipo.
// tarea: { largo, ancho, referencia, n_ataque, n_defensa, n_comodines, n_porteros }
export default function CampoTarea({ tarea, altoMax = 200 }) {
  const [disponible, setDisponible] = useState(0);
  const campo = posicionesCampo({
    n_ataque: tarea.n_ataque, n_defensa: tarea.n_defensa, n_comodines: tarea.n_comodines, n_porteros: tarea.n_porteros,
    referencia: tarea.referencia, largo: tarea.largo, ancho: tarea.ancho,
  });
  if (!campo) return null;

  const { ancho: w, alto: h } = tamanoCampo(campo.largo, campo.ancho, Math.max(60, disponible - MARGEN * 2), altoMax);
  const cuenta = conteoDibujado(campo);

  return (
    <View style={styles.caja} onLayout={(e) => setDisponible(Math.round(e.nativeEvent.layout.width))}>
      {disponible > 0 && (
        <View style={{ width: w + MARGEN * 2, height: h + MARGEN * 2, alignSelf: 'center' }}>
          <View style={[styles.campo, { left: MARGEN, top: MARGEN, width: w, height: h }]}>
            <View style={styles.lineaMedia} />
          </View>

          {campo.porterias && [0, 1].map((lado) => {
            const gh = Math.max(6, campo.porterias.anchoNorm * h);
            return (
              <View
                key={lado}
                style={[styles.porteria, { left: lado === 0 ? MARGEN - 4 : MARGEN + w, top: MARGEN + h / 2 - gh / 2, height: gh }]}
              />
            );
          })}

          {campo.jugadores.map((j, i) => (
            <View
              key={i}
              style={[
                styles.jugador,
                { backgroundColor: COLOR_ROL[j.rol], left: MARGEN + j.x * w - DIAMETRO / 2, top: MARGEN + j.y * h - DIAMETRO / 2 },
              ]}
            />
          ))}
        </View>
      )}
      <View style={styles.leyenda}>
        {['ataque', 'defensa', 'comodin', 'portero'].filter((r) => cuenta[r]).map((r) => (
          <View key={r} style={styles.leyendaItem}>
            <View style={[styles.punto, { backgroundColor: COLOR_ROL[r] }]} />
            <Text style={styles.leyendaTexto}>{ROLES[r].etiqueta} {cuenta[r]}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.escala}>{campo.largo} × {campo.ancho} m · dibujo a escala, colocación orientativa</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  caja: { marginTop: 8, marginBottom: 4 },
  campo: { position: 'absolute', backgroundColor: COLOR_CAMPO.fondo, borderWidth: 1.5, borderColor: COLOR_CAMPO.linea },
  lineaMedia: { position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, backgroundColor: COLOR_CAMPO.linea, opacity: 0.5 },
  porteria: { position: 'absolute', width: 4, backgroundColor: '#fff', borderWidth: 1, borderColor: '#374151' },
  jugador: { position: 'absolute', width: DIAMETRO, height: DIAMETRO, borderRadius: DIAMETRO / 2, borderWidth: 1.5, borderColor: '#fff' },
  leyenda: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 6 },
  leyendaItem: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 6 },
  punto: { width: 9, height: 9, borderRadius: 5, marginRight: 4 },
  leyendaTexto: { fontSize: 11, color: '#374151', fontWeight: '600' },
  escala: { fontSize: 10, color: '#9ca3af', textAlign: 'center', marginTop: 3 },
});

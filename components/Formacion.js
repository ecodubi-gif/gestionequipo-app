import React from 'react';
import { View, Text } from 'react-native';
import { lineasFormacion, puntosFormacion } from '../data/scouting';

// Un campo pequeño con la formación dibujada (el ataque, arriba). Si el texto no se entiende, no dibuja nada.
export default function Formacion({ texto, etiqueta, ancho = 84, color = '#7c3aed' }) {
  const lineas = lineasFormacion(texto);
  if (!lineas) return null;
  const alto = Math.round(ancho * 1.3);
  const d = Math.max(8, Math.round(ancho / 9));
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: ancho, height: alto, backgroundColor: '#e8f6ea', borderWidth: 1.5, borderColor: '#16a34a', borderRadius: 4, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', left: 0, right: 0, top: alto / 2 - 0.5, height: 1, backgroundColor: '#16a34a', opacity: 0.4 }} />
        <View style={{ position: 'absolute', left: ancho / 2 - ancho * 0.16, top: alto / 2 - ancho * 0.16, width: ancho * 0.32, height: ancho * 0.32, borderRadius: ancho, borderWidth: 1, borderColor: '#16a34a', opacity: 0.4 }} />
        {puntosFormacion(lineas).map((p, i) => (
          <View
            key={i}
            style={{
              position: 'absolute', left: p.x * ancho - d / 2, top: p.y * alto - d / 2, width: d, height: d, borderRadius: d,
              backgroundColor: i === 0 ? '#f59e0b' : color, borderWidth: 1, borderColor: '#fff',
            }}
          />
        ))}
      </View>
      <Text style={{ fontSize: 11, fontWeight: '800', color: '#111827', marginTop: 3 }}>{lineas.join('-')}</Text>
      {etiqueta ? <Text style={{ fontSize: 10, color: '#6b7280', textAlign: 'center', maxWidth: ancho + 20 }}>{etiqueta}</Text> : null}
    </View>
  );
}

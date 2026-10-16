import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { obtenerUsuario, cerrarSesion } from '../data/apiClient';
import { confirmar } from '../data/confirmar';

const ETIQUETA_ROL = {
  entrenador: 'Entrenador',
  segundo_entrenador: '2º entrenador',
  delegado: 'Delegado',
  preparador_fisico: 'Preparador físico',
};

// Opciones del panel según el rol. Van en cuadrícula de dos columnas para verlas todas de un vistazo.
function opcionesDe(rol, navigation) {
  const cuerpoTecnico = ['entrenador', 'segundo_entrenador'].includes(rol);
  const opciones = [];
  if (rol === 'preparador_fisico') {
    opciones.push({ emoji: '📈', titulo: 'RPE', subtitulo: 'Carga y riesgo de lesión', ir: () => navigation.navigate('Rpe') });
  } else {
    opciones.push({
      emoji: '📋', titulo: 'Prepartido', subtitulo: 'Convocatoria y partidos',
      ir: () => navigation.navigate('Partidos', { filtro: 'pendiente', titulo: 'Prepartido' }),
    });
  }
  if (rol === 'delegado') {
    opciones.push({
      emoji: '⚽', titulo: 'En vivo', subtitulo: 'Registrar el partido',
      ir: () => navigation.navigate('Partidos', { titulo: 'Seguimiento en vivo' }),
    });
  }
  opciones.push({ emoji: '📅', titulo: 'Entrenamientos', subtitulo: 'Sesiones y asistencia', ir: () => navigation.navigate('Entrenamientos') });
  if (cuerpoTecnico || rol === 'preparador_fisico') {
    opciones.push({ emoji: '🗓️', titulo: 'Semana', subtitulo: 'Carga prevista y real', ir: () => navigation.navigate('Semana') });
  }
  if (cuerpoTecnico) {
    opciones.push({ emoji: '📈', titulo: 'RPE', subtitulo: 'Carga y riesgo (consulta)', ir: () => navigation.navigate('Rpe') });
  }
  // Salud (lesiones y bienestar): solo el preparador físico y el delegado. El resto ve "no disponible" en la convocatoria.
  if (rol === 'preparador_fisico' || rol === 'delegado') {
    opciones.push({ emoji: '🩹', titulo: 'Lesiones', subtitulo: 'Quién está de baja y cuándo vuelve', ir: () => navigation.navigate('Lesiones') });
    opciones.push({ emoji: '😴', titulo: 'Bienestar', subtitulo: 'Cómo llegan los jugadores', ir: () => navigation.navigate('Bienestar') });
  }
  opciones.push({ emoji: '🏆', titulo: 'Liga', subtitulo: 'Clasificación y rival', ir: () => navigation.navigate('Liga') });
  opciones.push({ emoji: '👥', titulo: 'Plantilla', subtitulo: 'Jugadores del club', ir: () => navigation.navigate('PlantillaClub') });
  return opciones;
}

export default function PanelScreen({ navigation }) {
  const [usuario, setUsuario] = useState(null);

  useFocusEffect(
    useCallback(() => {
      obtenerUsuario().then(setUsuario);
    }, [])
  );

  const salir = () => {
    confirmar('Cerrar sesión', '¿Seguro?', async () => {
      await cerrarSesion();
      navigation.reset({ index: 0, routes: [{ name: 'Login', params: { limpiar: Date.now() } }] });
    }, 'Cerrar sesión');
  };

  const opciones = usuario ? opcionesDe(usuario.role, navigation) : [];

  return (
    <View style={styles.fondo}>
      <View style={styles.cabecera}>
        <Image source={require('../assets/escudo.png')} style={styles.escudo} resizeMode="contain" accessibilityLabel="Escudo del club" />
        <View style={{ flex: 1 }}>
          <Text style={styles.nombreUsuario} numberOfLines={1}>{usuario?.name}</Text>
          <Text style={styles.rolUsuario}>{ETIQUETA_ROL[usuario?.role] || usuario?.role}</Text>
        </View>
        <TouchableOpacity style={styles.botonClave} onPress={() => navigation.navigate('CambiarPassword')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="Cambiar mi contraseña">
          <Text style={styles.botonSalirTexto}>🔒</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.botonSalir} onPress={salir} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.botonSalirTexto}>🚪 Salir</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.cuadricula}>
        {opciones.map((o) => (
          <TouchableOpacity key={o.titulo + o.subtitulo} style={styles.opcion} onPress={o.ir} activeOpacity={0.8}>
            <View style={styles.opcionIcono}>
              <Text style={styles.opcionEmoji}>{o.emoji}</Text>
            </View>
            <Text style={styles.opcionTitulo} numberOfLines={1}>{o.titulo}</Text>
            <Text style={styles.opcionSubtitulo} numberOfLines={2}>{o.subtitulo}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const VERDE = '#16a34a';

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: '#f8fafc' },
  cabecera: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', paddingTop: 30, paddingBottom: 14, paddingHorizontal: 18,
    borderBottomWidth: 1, borderColor: '#e5e7eb',
  },
  avatar: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: VERDE, alignItems: 'center', justifyContent: 'center', marginRight: 12,
    shadowColor: VERDE, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  escudo: { width: 28, height: 50, marginRight: 12 },
  botonClave: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, backgroundColor: '#f3f4f6', marginRight: 8 },
  avatarTexto: { color: '#fff', fontWeight: '800', fontSize: 18 },
  nombreUsuario: { color: '#111827', fontWeight: '700', fontSize: 16 },
  rolUsuario: { color: '#6b7280', fontSize: 12, marginTop: 1 },
  botonSalir: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, backgroundColor: '#fef2f2' },
  botonSalirTexto: { color: '#dc2626', fontWeight: '700', fontSize: 12 },
  cuadricula: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', padding: 16, paddingTop: 18, rowGap: 12 },
  opcion: {
    width: '48%',
    minHeight: 118,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  opcionIcono: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  opcionEmoji: { fontSize: 20 },
  opcionTitulo: { fontSize: 15, fontWeight: '700', color: '#111827' },
  opcionSubtitulo: { fontSize: 12, color: '#6b7280', marginTop: 2 },
});

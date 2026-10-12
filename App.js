import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

import LoginScreen from './screens/LoginScreen';
import PanelScreen from './screens/PanelScreen';
import PartidosListScreen from './screens/PartidosListScreen';
import DatosPartidoScreen from './screens/DatosPartidoScreen';
import PlantillaScreen from './screens/PlantillaScreen';
import RegistroEventosScreen from './screens/RegistroEventosScreen';
import EntrenamientosListScreen from './screens/EntrenamientosListScreen';
import AsistenciaScreen from './screens/AsistenciaScreen';
import CambiarPasswordScreen from './screens/CambiarPasswordScreen';
import OlvidoPasswordScreen from './screens/OlvidoPasswordScreen';
import PlantillaClubScreen from './screens/PlantillaClubScreen';
import RpeScreen from './screens/RpeScreen';
import RpePartidoScreen from './screens/RpePartidoScreen';
import RpeRiesgoScreen from './screens/RpeRiesgoScreen';
import TareaEditorScreen from './screens/TareaEditorScreen';
import PizarraScreen from './screens/PizarraScreen';
import CamposScreen from './screens/CamposScreen';
import LigaScreen from './screens/LigaScreen';
import ScoutingScreen from './screens/ScoutingScreen';
import DialogoHost from './components/DialogoHost';
import './data/dialogos';
import SesionCompletaScreen from './screens/SesionCompletaScreen';
import SemanaScreen from './screens/SemanaScreen';
import EntrenamientoDetalleScreen from './screens/EntrenamientoDetalleScreen';
import { obtenerToken } from './data/apiClient';

const Stack = createNativeStackNavigator();

export default function App() {
  const [comprobandoSesion, setComprobandoSesion] = useState(true);
  const [rutaInicial, setRutaInicial] = useState('Login');

  // Navegador móvil: sin rebote al hacer scroll, sin zoom por doble toque y altura que descuenta la barra del navegador.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const estilo = document.createElement('style');
    estilo.textContent = [
      'html, body { overscroll-behavior: none; touch-action: manipulation; -webkit-text-size-adjust: 100%; }',
      '@supports (height: 100dvh) { html, body, #root { height: 100dvh; } }',
      '* { -webkit-tap-highlight-color: transparent; }',
    ].join('\n');
    document.head.appendChild(estilo);
    return () => document.head.removeChild(estilo);
  }, []);

  useEffect(() => {
    obtenerToken().then((token) => {
      setRutaInicial(token ? 'Panel' : 'Login');
      setComprobandoSesion(false);
    });
  }, []);

  if (comprobandoSesion) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111827' }}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
    <DialogoHost />
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator initialRouteName={rutaInicial}>
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen
          name="Panel"
          component={PanelScreen}
          options={{ headerShown: false, headerBackVisible: false, gestureEnabled: false }}
        />
        <Stack.Screen name="CambiarPassword" component={CambiarPasswordScreen} options={{ headerShown: false }} />
        <Stack.Screen name="OlvidoPassword" component={OlvidoPasswordScreen} options={{ headerShown: false }} />
        <Stack.Screen name="PlantillaClub" component={PlantillaClubScreen} options={{ title: 'Plantilla del club' }} />
        <Stack.Screen name="Rpe" component={RpeScreen} options={{ title: 'RPE semanal' }} />
        <Stack.Screen name="RpePartido" component={RpePartidoScreen} options={{ title: 'RPE del partido' }} />
        <Stack.Screen name="RpeRiesgo" component={RpeRiesgoScreen} options={{ title: 'Riesgo de lesión' }} />
        <Stack.Screen name="TareaEditor" component={TareaEditorScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Pizarra" component={PizarraScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Campos" component={CamposScreen} options={{ title: 'Campos de entrenamiento' }} />
        <Stack.Screen name="Liga" component={LigaScreen} options={{ title: 'Liga' }} />
        <Stack.Screen name="Scouting" component={ScoutingScreen} options={{ title: 'Informe del rival' }} />
        <Stack.Screen name="Semana" component={SemanaScreen} options={{ title: 'Semana' }} />
        <Stack.Screen name="SesionCompleta" component={SesionCompletaScreen} options={{ title: 'Sesión completa' }} />
        <Stack.Screen
          name="EntrenamientoDetalle"
          component={EntrenamientoDetalleScreen}
          options={{ title: 'Preparación del entreno' }}
        />
        <Stack.Screen
          name="Partidos"
          component={PartidosListScreen}
          options={({ route }) => ({ title: route.params?.titulo || 'Partidos' })}
        />
        <Stack.Screen
          name="DatosPartido"
          component={DatosPartidoScreen}
          options={({ route }) => ({ title: route.params?.partidoId ? 'Editar partido' : 'Nuevo partido' })}
        />
        <Stack.Screen name="Plantilla" component={PlantillaScreen} options={{ title: 'Convocatoria' }} />
        <Stack.Screen
          name="RegistroEventos"
          component={RegistroEventosScreen}
          options={{ title: 'Partido en directo' }}
        />
        <Stack.Screen
          name="Entrenamientos"
          component={EntrenamientosListScreen}
          options={{ title: 'Entrenamientos' }}
        />
        <Stack.Screen name="Asistencia" component={AsistenciaScreen} options={{ title: 'Pasar lista' }} />
      </Stack.Navigator>
    </NavigationContainer>
    </SafeAreaProvider>
  );
}

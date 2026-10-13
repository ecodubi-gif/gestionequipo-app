import AsyncStorage from '@react-native-async-storage/async-storage';

// Cambia esto si algún día mueves el backend a otro dominio.
const API_BASE = 'https://ecodubi.com/api';

const CLAVE_TOKEN = '@auth_token';
const CLAVE_USUARIO = '@auth_usuario';

// ---------- Sesión ----------

export async function obtenerToken() {
  return AsyncStorage.getItem(CLAVE_TOKEN);
}

export async function obtenerUsuario() {
  const json = await AsyncStorage.getItem(CLAVE_USUARIO);
  return json ? JSON.parse(json) : null;
}

async function guardarSesion(token, usuario) {
  await AsyncStorage.setItem(CLAVE_TOKEN, token);
  await AsyncStorage.setItem(CLAVE_USUARIO, JSON.stringify(usuario));
}

export async function cambiarPasswordApi(passwordActual, passwordNueva) {
  const resultado = await peticion('POST', '/cambiar-password', {
    password_actual: passwordActual,
    password_nueva: passwordNueva,
  });
  // Actualizamos también el usuario guardado en el móvil, para que
  // "password_actualizada" quede reflejado sin tener que volver a entrar.
  await AsyncStorage.setItem(CLAVE_USUARIO, JSON.stringify(resultado.user));
  return resultado.user;
}

export async function solicitarCodigoRecuperacion(email) {
  const respuesta = await fetch(`${API_BASE}/olvide-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email }),
  });
  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error(datos.message || 'No se pudo enviar el código');
  return datos;
}

export async function restablecerPasswordConCodigo(email, codigo, passwordNueva) {
  const respuesta = await fetch(`${API_BASE}/restablecer-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email, codigo, password_nueva: passwordNueva }),
  });
  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error(datos.message || 'No se pudo restablecer la contraseña');
  return datos;
}

export async function cerrarSesion() {
  try {
    await peticion('POST', '/logout');
  } catch {
    // si el token ya no vale o no hay red, da igual: borramos localmente igual
  }
  await AsyncStorage.removeItem(CLAVE_TOKEN);
  await AsyncStorage.removeItem(CLAVE_USUARIO);
}

export async function iniciarSesion(email, password) {
  const respuesta = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const datos = await respuesta.json();
  if (!respuesta.ok) {
    throw new Error(datos.message || 'No se pudo iniciar sesión');
  }
  await guardarSesion(datos.token, datos.user);
  return datos.user;
}

// ---------- Petición genérica autenticada ----------

async function peticion(metodo, ruta, cuerpo) {
  const token = await obtenerToken();
  const respuesta = await fetch(`${API_BASE}${ruta}`, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });

  if (respuesta.status === 401) {
    // El token caducó o no vale: cerramos sesión local para forzar login de nuevo.
    await AsyncStorage.removeItem(CLAVE_TOKEN);
    await AsyncStorage.removeItem(CLAVE_USUARIO);
    throw new Error('Sesión caducada, vuelve a iniciar sesión');
  }

  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok) {
    if (respuesta.status === 403) throw new Error('No tienes permiso para hacer esto');
    if (respuesta.status === 422) {
      // Puede venir como error de validación (datos.errors) o como un
      // mensaje directo del controlador (ej. "contraseña incorrecta").
      const primerErrorValidacion = Object.values(datos.errors || {})[0]?.[0];
      throw new Error(primerErrorValidacion || datos.message || 'Datos no válidos');
    }
    throw new Error(datos.message || `Error del servidor (${respuesta.status})`);
  }

  return datos;
}

// ---------- Partidos ----------

export async function listarPartidosApi() {
  const { data } = await peticion('GET', '/partidos');
  return data;
}

export async function obtenerPartidoApi(id) {
  const { data } = await peticion('GET', `/partidos/${id}`);
  return data;
}

export async function crearPartidoApi(datos) {
  const { data } = await peticion('POST', '/partidos', datos);
  return data;
}

export async function actualizarPartidoApi(id, datos) {
  const { data } = await peticion('PUT', `/partidos/${id}`, datos);
  return data;
}

// ---------- Jugadores (plantilla del club) ----------

export async function listarJugadoresApi() {
  const { data } = await peticion('GET', '/jugadores');
  return data;
}

export async function crearJugadorApi(datos) {
  const { data } = await peticion('POST', '/jugadores', datos);
  return data;
}

export async function actualizarJugadorApi(id, datos) {
  const { data } = await peticion('PUT', `/jugadores/${id}`, datos);
  return data;
}

// campo: 'readaptacion' | 'observaciones'; texto: string o null para quitarla
export async function guardarNotaJugadorApi(jugadorId, campo, texto) {
  const { data } = await peticion('PUT', `/jugadores/${jugadorId}/${campo}`, { [campo]: texto });
  return data;
}

export async function eliminarJugadorApi(id) {
  return peticion('DELETE', `/jugadores/${id}`);
}

// ---------- Convocatoria de un partido ----------

export async function obtenerConvocatoriaApi(partidoId) {
  const { data } = await peticion('GET', `/partidos/${partidoId}/convocatoria`);
  return data;
}

// jugadores: [{ jugador_id, titular, capitan }]
export async function guardarConvocatoriaApi(partidoId, jugadores) {
  const { data } = await peticion('POST', `/partidos/${partidoId}/convocatoria`, { jugadores });
  return data;
}

// ---------- Eventos de un partido ----------

export async function listarEventosApi(partidoId) {
  const { data } = await peticion('GET', `/partidos/${partidoId}/eventos`);
  return data;
}

export async function crearEventoApi(partidoId, evento) {
  const { data } = await peticion('POST', `/partidos/${partidoId}/eventos`, evento);
  return data;
}

export async function eliminarEventoApi(eventoId) {
  return peticion('DELETE', `/eventos/${eventoId}`);
}

// ---------- Diario de entrenamientos ----------

export async function listarEntrenamientosApi() {
  const { data } = await peticion('GET', '/entrenamientos');
  return data;
}

export async function crearEntrenamientoApi(datos) {
  const { data } = await peticion('POST', '/entrenamientos', datos);
  return data;
}

export async function obtenerEntrenamientoApi(id) {
  const { data } = await peticion('GET', `/entrenamientos/${id}`);
  return data;
}

// --- Plan de sesión ---
export async function listarPlantillasEntrenoApi() {
  const { data } = await peticion('GET', '/plantillas-entreno');
  return data;
}

// datos: { preventivo?: [...], movilidad?: [...] } (preparador físico)
export async function guardarPlantillaEntrenoApi(numero, datos) {
  const { data } = await peticion('PUT', `/plantillas-entreno/${numero}`, datos);
  return data;
}

// semana: { fase?, puntal?, densidad?, gestion?, tareas: [...] } (entrenador, segundo, preparador físico)
export async function guardarSemanaApi(numero, semana) {
  const { data } = await peticion('PUT', `/plantillas-entreno/${numero}/semana`, { semana });
  return data;
}

// bloques: { rueda_perfiles?, rueda_perfiles_activa?, activacion?, activacion_activa?, parte_central?, cierre_tactico? } (entrenador/segundo)
export async function guardarBloquesEntrenamientoApi(id, bloques) {
  const { data } = await peticion('PUT', `/entrenamientos/${id}/bloques`, { bloques });
  return data;
}

// tipo: 1, 2, 3, o null para volver a la detección automática
export async function guardarTipoSesionApi(id, tipo) {
  const { data } = await peticion('PUT', `/entrenamientos/${id}/tipo-sesion`, { tipo_sesion: tipo });
  return data;
}

export async function eliminarEntrenamientoApi(id) {
  return peticion('POST', `/entrenamientos/${id}/eliminar`);
}

// --- Carga de entrenamiento (RPE) ---
// Datos de n semanas (de lunes a domingo) que terminan en la semana de 'lunes' (AAAA-MM-DD)
export async function obtenerSemanasCargaApi(lunes, semanas = 6) {
  const { data } = await peticion('GET', `/carga/semanas?lunes=${lunes}&semanas=${semanas}`);
  return data.semanas;
}

// duracion (minutos) y rpe: números; ambos null para quitar la carga (preparador físico)
export async function guardarCargaEntrenamientoApi(id, duracion, rpe) {
  const { data } = await peticion('PUT', `/entrenamientos/${id}/carga`, { duracion_minutos: duracion, rpe_medio: rpe });
  return data;
}

export async function obtenerRpePartidoApi(partidoId) {
  const { data } = await peticion('GET', `/partidos/${partidoId}/rpe`);
  return data;
}

// rpes: [{ jugador_id, rpe, minutos }] (preparador físico, partido terminado)
export async function guardarRpePartidoApi(partidoId, rpes) {
  const { data } = await peticion('PUT', `/partidos/${partidoId}/rpe`, { rpes });
  return data;
}

// --- Tareas de la sesión ---
export async function listarTareasApi(entrenamientoId) {
  const { data } = await peticion('GET', `/entrenamientos/${entrenamientoId}/tareas`);
  return data;
}

export async function crearTareaApi(entrenamientoId, datos) {
  const { data } = await peticion('POST', `/entrenamientos/${entrenamientoId}/tareas`, datos);
  return data;
}

export async function actualizarTareaApi(id, datos) {
  const { data } = await peticion('PUT', `/tareas/${id}`, datos);
  return data;
}

export async function eliminarTareaApi(id) {
  return peticion('DELETE', `/tareas/${id}`);
}

export async function obtenerAsistenciasApi(entrenamientoId) {
  const { data } = await peticion('GET', `/entrenamientos/${entrenamientoId}/asistencias`);
  return data;
}

// asistencias: [{ jugador_id, estado, multa, motivo }]
export async function guardarAsistenciasApi(entrenamientoId, asistencias) {
  const { data } = await peticion('POST', `/entrenamientos/${entrenamientoId}/asistencias`, { asistencias });
  return data;
}

export async function editarMaterialApi(entrenamientoId, material) {
  const { data } = await peticion('PUT', `/entrenamientos/${entrenamientoId}/material`, { material });
  return data;
}

// --- Biblioteca de tareas ---
export async function listarBibliotecaApi() {
  const { data } = await peticion('GET', '/biblioteca-tareas');
  return data;
}

export async function crearBibliotecaApi(datos) {
  const { data } = await peticion('POST', '/biblioteca-tareas', datos);
  return data;
}

export async function actualizarBibliotecaApi(id, datos) {
  const { data } = await peticion('PUT', `/biblioteca-tareas/${id}`, datos);
  return data;
}

export async function eliminarBibliotecaApi(id) {
  return peticion('DELETE', `/biblioteca-tareas/${id}`);
}

// --- Campos de entrenamiento (medidas reales) ---
export async function listarCamposApi() {
  const { data } = await peticion('GET', '/campos-entrenamiento');
  return data;
}

export async function crearCampoApi(datos) {
  const { data } = await peticion('POST', '/campos-entrenamiento', datos);
  return data;
}

export async function actualizarCampoApi(id, datos) {
  const { data } = await peticion('PUT', `/campos-entrenamiento/${id}`, datos);
  return data;
}

export async function eliminarCampoApi(id) {
  return peticion('DELETE', `/campos-entrenamiento/${id}`);
}

// ---------- Liga (calendario, clasificación y notas del rival) ----------

export async function obtenerLigaApi() {
  const { data } = await peticion('GET', '/liga');
  return data;
}

export async function guardarClasificacionApi(filas, fecha) {
  const { data } = await peticion('PUT', '/liga/clasificacion', { filas, fecha });
  return data;
}

// Informes de scouting de los rivales: { 'NOMBRE DEL EQUIPO': { datos, jugadores, editado_por, actualizado } }
export async function obtenerScoutingApi() {
  const { data } = await peticion('GET', '/liga/scouting');
  return data || {};
}

export async function obtenerHistorialScoutingApi(equipo) {
  const { data } = await peticion('GET', `/liga/scouting/historial?equipo=${encodeURIComponent(equipo)}`);
  return data || [];
}

export async function guardarScoutingApi(equipo, informe) {
  const { data } = await peticion('PUT', '/liga/scouting', { equipo, datos: informe.datos, jugadores: informe.jugadores });
  return data;
}

export async function guardarNotaRivalApi(equipo, texto) {
  const { data } = await peticion('PUT', '/liga/notas', { equipo, texto });
  return data;
}

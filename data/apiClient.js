import AsyncStorage from '@react-native-async-storage/async-storage';

// Cambia esto si algún día mueves el backend a otro dominio.
const API_BASE = 'https://ecodubi.com/api';

const CLAVE_TOKEN = '@auth_token';
const CLAVE_USUARIO = '@auth_usuario';

// ---------- Llamada al servidor con mensajes claros ----------
// Si no hay cobertura, se cuelga o el servidor devuelve una página de error en vez de datos, la persona ve un aviso
// entendible en lugar de "Failed to fetch" o "Unexpected token <".
const ESPERA_MAXIMA_MS = 30000;
export const MENSAJE_SIN_CONEXION = 'No hay conexión con el servidor. Comprueba tu internet y vuelve a intentarlo.';

export async function llamar(url, opciones) {
  const control = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const reloj = control ? setTimeout(() => control.abort(), ESPERA_MAXIMA_MS) : null;
  try {
    return await fetch(url, control ? { ...opciones, signal: control.signal } : opciones);
  } catch (err) {
    if (err && err.name === 'AbortError') throw new Error('El servidor tarda demasiado en responder. Inténtalo de nuevo en un momento.');
    throw new Error(MENSAJE_SIN_CONEXION);
  } finally {
    if (reloj) clearTimeout(reloj);
  }
}

// El cuerpo puede no ser JSON (página de error del servidor, mantenimiento…): en ese caso, objeto vacío.
export const leerJson = (respuesta) => respuesta.json().catch(() => ({}));

export function mensajeDeEstado(estado) {
  if (estado === 429) return 'Demasiados intentos seguidos. Espera un minuto y vuelve a probar.';
  if (estado >= 500) return 'El servidor tiene un problema ahora mismo. Inténtalo en unos minutos.';
  return `Error del servidor (${estado})`;
}

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
  const respuesta = await llamar(`${API_BASE}/olvide-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email }),
  });
  const datos = await leerJson(respuesta);
  if (!respuesta.ok) throw new Error(datos.message || mensajeDeEstado(respuesta.status));
  return datos;
}

export async function restablecerPasswordConCodigo(email, codigo, passwordNueva) {
  const respuesta = await llamar(`${API_BASE}/restablecer-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email, codigo, password_nueva: passwordNueva }),
  });
  const datos = await leerJson(respuesta);
  if (!respuesta.ok) throw new Error(datos.message || mensajeDeEstado(respuesta.status));
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
  const respuesta = await llamar(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const datos = await leerJson(respuesta);
  if (!respuesta.ok) {
    throw new Error(respuesta.status >= 500 ? mensajeDeEstado(respuesta.status) : datos.message || (respuesta.status === 401 || respuesta.status === 422 ? 'Correo o contraseña incorrectos' : mensajeDeEstado(respuesta.status)));
  }
  if (!datos.token || !datos.user) throw new Error('El servidor no ha respondido bien. Inténtalo de nuevo.');
  await guardarSesion(datos.token, datos.user);
  return datos.user;
}

// ---------- Petición genérica autenticada ----------

async function peticion(metodo, ruta, cuerpo) {
  const token = await obtenerToken();
  const respuesta = await llamar(`${API_BASE}${ruta}`, {
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

  const datos = await leerJson(respuesta);

  if (!respuesta.ok) {
    if (respuesta.status === 403) throw new Error('No tienes permiso para hacer esto');
    if (respuesta.status === 422) {
      // Puede venir como error de validación (datos.errors) o como un
      // mensaje directo del controlador (ej. "contraseña incorrecta").
      const primerErrorValidacion = Object.values(datos.errors || {})[0]?.[0];
      throw new Error(primerErrorValidacion || datos.message || 'Datos no válidos');
    }
    throw new Error(respuesta.status >= 500 ? mensajeDeEstado(respuesta.status) : datos.message || mensajeDeEstado(respuesta.status));
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

// Cambia fecha, hora, lugar y/o material de un entrenamiento ya creado (entrenador y segundo entrenador).
export async function editarEntrenamientoApi(id, datos) {
  const { data } = await peticion('POST', `/entrenamientos/${id}/editar`, datos);
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

// --- Lesiones (entrenador, segundo y preparador físico) ---
export async function listarLesionesApi() {
  const { data } = await peticion('GET', '/lesiones');
  return data;
}
export async function crearLesionApi(datos) {
  const { data } = await peticion('POST', '/lesiones', datos);
  return data;
}
export async function actualizarLesionApi(id, datos) {
  const { data } = await peticion('PUT', `/lesiones/${id}`, datos);
  return data;
}
export async function eliminarLesionApi(id) {
  await peticion('DELETE', `/lesiones/${id}`);
}

// --- Saldo de multas (delegado, entrenador y segundo; pagan delegado y entrenador) ---
export async function obtenerSaldosMultasApi() {
  const { data } = await peticion('GET', '/multas/saldos');
  return data;
}
export async function listarPagosMultasApi(jugadorId) {
  const { data } = await peticion('GET', `/multas/pagos${jugadorId ? `?jugador_id=${jugadorId}` : ''}`);
  return data;
}
export async function registrarPagoMultaApi(datos) {
  const { data } = await peticion('POST', '/multas/pagos', datos);
  return data;
}
export async function eliminarPagoMultaApi(id) {
  await peticion('DELETE', `/multas/pagos/${id}`);
}

// --- Enlaces personales de los jugadores ---
export async function generarEnlacesJugadoresApi(jugadorId) {
  const { data } = await peticion('POST', '/enlaces-jugadores', jugadorId ? { jugador_id: jugadorId } : {});
  return data;
}
export async function listarConfirmacionesApi(entrenamientoId) {
  const { data } = await peticion('GET', `/entrenamientos/${entrenamientoId}/confirmaciones`);
  return data;
}
export async function listarBienestarApi(dias = 7) {
  const { data } = await peticion('GET', `/bienestar?dias=${dias}`);
  return data;
}

// Páginas del jugador: sin cuenta, el código del enlace lo identifica.
async function peticionJugador(metodo, token, ruta, cuerpo) {
  const respuesta = await llamar(`${API_BASE}/j/${encodeURIComponent(token)}${ruta}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const datos = await leerJson(respuesta);
  if (respuesta.status === 404) throw new Error('Este enlace ya no vale. Pídele uno nuevo al delegado.');
  if (respuesta.status === 429) throw new Error('Demasiados intentos seguidos. Espera un minuto.');
  if (!respuesta.ok) {
    const primero = Object.values(datos.errors || {})[0]?.[0];
    throw new Error(primero || datos.message || 'No se pudo completar. Inténtalo de nuevo.');
  }
  return datos.data;
}
export const verPaginaJugadorApi = (token) => peticionJugador('GET', token, '');
export const confirmarEntrenoJugadorApi = (token, entrenamientoId, respuesta, motivo) =>
  peticionJugador('POST', token, '/confirmacion', { entrenamiento_id: entrenamientoId, respuesta, motivo: motivo || null });
export const enviarBienestarJugadorApi = (token, datos) => peticionJugador('POST', token, '/bienestar', datos);

// --- Convocatoria publicada a los jugadores ---
export async function estadoPublicacionApi(partidoId) {
  const { data } = await peticion('GET', `/partidos/${partidoId}/publicacion`);
  return data;
}
export async function publicarConvocatoriaApi(partidoId) {
  const { data } = await peticion('POST', `/partidos/${partidoId}/publicacion`);
  return data;
}
export async function retirarConvocatoriaApi(partidoId) {
  const { data } = await peticion('DELETE', `/partidos/${partidoId}/publicacion`);
  return data;
}
export const avisarRetrasoJugadorApi = (token, entrenamientoId, minutos) =>
  peticionJugador('POST', token, '/retraso', { entrenamiento_id: entrenamientoId, minutos });
export const vistoConvocatoriaJugadorApi = (token, partidoId) =>
  peticionJugador('POST', token, '/visto', { partido_id: partidoId });

// --- Alineación por momentos (11 inicial y cambios durante el partido) ---
export async function obtenerAlineacionApi(partidoId) {
  const { data } = await peticion('GET', `/partidos/${partidoId}/alineacion`);
  return data.momentos || [];
}
export async function guardarAlineacionApi(partidoId, momentos) {
  const { data } = await peticion('PUT', `/partidos/${partidoId}/alineacion`, { momentos });
  return data.momentos || [];
}

// Jugadores no disponibles ahora mismo (lesión sin alta): solo los ids, sin el detalle. Lo puede pedir todo el cuerpo técnico.
export async function obtenerNoDisponiblesApi() {
  const { data } = await peticion('GET', '/lesiones/no-disponibles');
  return data;
}

// --- Balón parado: biblioteca de jugadas y asignación por partido ---
export async function listarJugadasAbpApi() {
  const { data } = await peticion('GET', '/abp');
  return data || [];
}
export async function guardarJugadaAbpApi(jugada) {
  const cuerpo = { titulo: jugada.titulo, tipo: jugada.tipo, consigna: jugada.consigna || '', elementos: jugada.elementos };
  const { data } = jugada.id ? await peticion('PUT', `/abp/${jugada.id}`, cuerpo) : await peticion('POST', '/abp', cuerpo);
  return data;
}
export const borrarJugadaAbpApi = (id) => peticion('DELETE', `/abp/${id}`);
export async function obtenerAsignacionesAbpApi(partidoId) {
  const { data } = await peticion('GET', `/partidos/${partidoId}/abp`);
  return data || {};
}
export async function guardarAsignacionAbpApi(partidoId, jugadaId, asignacion) {
  const { data } = await peticion('PUT', `/partidos/${partidoId}/abp/${jugadaId}`, { asig: asignacion.asig, textos: asignacion.textos, pos: asignacion.pos || {} });
  return data;
}

// --- Tarjetas: ajustes manuales (anteriores a la app, correcciones de acta y sanciones con fecha) ---
export async function listarAjustesTarjetasApi() {
  const { data } = await peticion('GET', '/tarjetas/ajustes');
  return data || [];
}
export async function crearAjusteTarjetaApi(ajuste) {
  const { data } = await peticion('POST', '/tarjetas/ajustes', ajuste);
  return data;
}
export const borrarAjusteTarjetaApi = (id) => peticion('DELETE', `/tarjetas/ajustes/${id}`);

// Todo lo necesario para calcular tarjetas: partidos jugados, sus eventos y los ajustes (si el servidor aún no los tiene, vacío).
export async function cargarDatosTarjetasApi() {
  const [ps, ajustes] = await Promise.all([listarPartidosApi(), listarAjustesTarjetasApi().catch(() => [])]);
  const jugados = ps.filter((p) => p.estado === 'en_curso' || p.estado === 'finalizado');
  const lista = await Promise.all(jugados.map((p) => listarEventosApi(p.id).catch(() => [])));
  return { todos: ps, partidos: jugados, eventos: Object.fromEntries(jugados.map((p, i) => [p.id, lista[i]])), ajustes };
}

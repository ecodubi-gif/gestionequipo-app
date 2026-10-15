import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  obtenerUsuario,
  listarJugadoresApi,
  listarCamposApi,
  obtenerAsistenciasApi,
  obtenerSemanasCargaApi,
  crearTareaApi,
  actualizarTareaApi,
  eliminarTareaApi,
  listarBibliotecaApi,
  crearBibliotecaApi,
  actualizarBibliotecaApi,
} from '../data/apiClient';
import { bibliotecaDesdeTarea, buscarPorNombre } from '../data/biblioteca';
import DibujoTarea from '../components/DibujoTarea';
import StepperNumero from '../components/StepperNumero';
import { confirmar } from '../data/confirmar';
import { lunesDeLaSemana } from '../data/planSesion';
import { riesgoJugador } from '../data/carga';
import { textoPosiciones } from '../data/posiciones';
import { proponerReparto, resumenReparto, grupoDeTarea } from '../data/reparto';
import {
  BLOQUES_TAREAS,
  OBJETIVOS,
  REFERENCIAS,
  ROLES,
  rolSugerido,
  contarRoles,
  jugadoresDeCampo,
  calcularDimensiones,
  apPInicial,
  formatoTarea,
  trabajoInicial,
  segundosDe,
  formatoDuracion,
  ESCALA_DURACION,
  avisosTrabajo,
  avisoDelDia,
  OBJETIVOS_DEL_DIA,
  relacionTrabajoPausa,
  totalesTarea,
} from '../data/tareas';

const ROLES_EDITAR = ['entrenador', 'segundo_entrenador'];
function sumarDias(fechaISO, dias) {
  const [a, m, d] = fechaISO.split('-').map(Number);
  const f = new Date(Date.UTC(a, m - 1, d));
  f.setUTCDate(f.getUTCDate() + dias);
  return f.toISOString().slice(0, 10);
}

const ETIQUETA_PLURAL = { ataque: 'Ataque', defensa: 'Defensa', comodin: 'Comodines', portero: 'Porteros' };
const esPortero = (j) => (j.posicion || '').toLowerCase().startsWith('port');
const nombreJugador = (j) => `${j.dorsal ? `#${j.dorsal} ` : ''}${j.nombre} ${j.apellidos || ''}`.trim();

// Orden de los botones de rol al tocar a un jugador: los porteros empiezan por "portero".
const secuenciaRoles = (j) => (esPortero(j) ? [null, 'portero', 'comodin', 'ataque', 'defensa'] : [null, 'ataque', 'defensa', 'comodin', 'portero']);

export default function TareaEditorScreen({ navigation, route }) {
  const { entrenamientoId, bloque, tarea, contexto, objetivoInicial } = route.params;
  const minutosPartido = contexto?.minutosPartido || null; // { [jugadorId]: minutos } del partido anterior, si lo hay
  const convocados = contexto?.convocados || [];
  const fechaSesion = contexto?.fecha || null; // AAAA-MM-DD del entreno

  const [usuario, setUsuario] = useState(null);
  const [jugadores, setJugadores] = useState([]);
  const [asistentes, setAsistentes] = useState(null); // ids; null = todavía sin lista
  const [semanas, setSemanas] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [avisoReparto, setAvisoReparto] = useState([]);

  const [nombre, setNombre] = useState(tarea?.nombre || '');
  // Sin objetivo si la tarea es nueva o se hizo con la lista antigua (carga mecánica, mixta...): hay que elegirlo.
  // Una tarea nueva puede venir ya con objetivo (grupo Recuperación/Compensación del primer entreno).
  // Si el día solo tiene un objetivo (Entreno 2: Fuerza; Entreno 3: Velocidad), la tarea nueva ya viene con él.
  const unicoDelDia = !tarea && !objetivoInicial && (OBJETIVOS_DEL_DIA[contexto?.tipo] || []).length === 1 ? OBJETIVOS_DEL_DIA[contexto.tipo][0] : null;
  const objetivoPrevio = OBJETIVOS[tarea?.objetivo] ? tarea.objetivo : (!tarea && OBJETIVOS[objetivoInicial] ? objetivoInicial : unicoDelDia);
  const [objetivo, setObjetivo] = useState(objetivoPrevio);
  const trabajoPrevio = !tarea && objetivoPrevio ? trabajoInicial(objetivoPrevio) : null;
  const [referencia, setReferencia] = useState(tarea?.referencia || 'porterias');
  const [asignaciones, setAsignaciones] = useState(Object.fromEntries((tarea?.jugadores || []).map((a) => [a.jugador_id, a.rol])));
  const [conteo, setConteo] = useState({
    ataque: tarea?.n_ataque ?? 0,
    defensa: tarea?.n_defensa ?? 0,
    comodin: tarea?.n_comodines ?? 0,
    portero: tarea?.n_porteros ?? 0,
  });
  const [apP, setApP] = useState(() => {
    if (tarea?.largo && tarea?.ancho) {
      const n = (tarea.n_ataque || 0) + (tarea.n_defensa || 0) + (tarea.n_comodines || 0);
      if (n > 0) return Math.round((tarea.largo * tarea.ancho) / n);
    }
    return apPInicial(objetivoPrevio);
  });
  const [campos, setCampos] = useState([]);
  const [dibujo, setDibujo] = useState(tarea?.dibujo || null); // null = colocación automática
  const [manual, setManual] = useState(tarea?.largo && tarea?.ancho ? { largo: tarea.largo, ancho: tarea.ancho } : null);
  const [series, setSeries] = useState(tarea?.series ?? trabajoPrevio?.series ?? 3);
  const [duracion, setDuracion] = useState(tarea ? segundosDe(tarea) || 360 : trabajoPrevio?.duracion_seg ?? 360);
  const [pausa, setPausa] = useState(tarea?.pausa_seg ?? trabajoPrevio?.pausa_seg ?? 90);
  const [descripcion, setDescripcion] = useState(tarea?.descripcion || '');
  // Si la tarea ya existía, o si se han tocado a mano las series, el tiempo o la pausa, no se pisan al cambiar de objetivo.
  const [trabajoTocado, setTrabajoTocado] = useState(Boolean(tarea?.id));

  // Al volver de la pizarra: el dibujo y las medidas de la zona que se hayan dejado.
  const vuelta = route.params?.pizarra;
  useEffect(() => {
    if (!vuelta) return;
    setDibujo(vuelta.dibujo);
    setManual({ largo: vuelta.largo, ancho: vuelta.ancho });
  }, [vuelta?.ts]); // eslint-disable-line react-hooks/exhaustive-deps

  const puedeEditar = usuario && ROLES_EDITAR.includes(usuario.role);
  const titulo = BLOQUES_TAREAS.find((b) => b.clave === bloque)?.titulo || 'Tarea';

  const cargar = useCallback(async () => {
    setError('');
    try {
      const [u, jug, asist, sem, cps] = await Promise.all([
        obtenerUsuario(),
        listarJugadoresApi(),
        obtenerAsistenciasApi(entrenamientoId),
        // El riesgo que interesa al planificar es el de la semana ANTERIOR a la sesión: la de la sesión aún no está completa.
        fechaSesion ? obtenerSemanasCargaApi(sumarDias(lunesDeLaSemana(fechaSesion), -7), 6).catch(() => null) : Promise.resolve(null),
        listarCamposApi().catch(() => []),
      ]);
      setCampos(cps);
      setUsuario(u);
      setJugadores(jug.filter((j) => j.estado !== 'baja'));
      setAsistentes(asist.length > 0 ? asist.filter((a) => ['presente', 'retraso'].includes(a.estado)).map((a) => a.jugador.id) : null);
      setSemanas(sem);
    } catch (err) {
      setError(err.message || 'No se pudo cargar');
    } finally {
      setCargando(false);
    }
  }, [entrenamientoId, fechaSesion]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  if (cargando) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.centrado}>
        <Text style={styles.error}>{error}</Text>
        <TouchableOpacity style={styles.botonReintentar} onPress={cargar}>
          <Text style={styles.botonReintentarTexto}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- Quién puede entrar en la tarea ---
  const presentes = asistentes === null ? jugadores : jugadores.filter((j) => asistentes.includes(j.id));
  const trabajoAparte = presentes.filter((j) => j.readaptacion);
  const asignables = presentes.filter((j) => !j.readaptacion);
  // jugadores ya asignados que hoy no están disponibles (faltaron o se lesionaron después): se avisan
  const noDisponibles = Object.keys(asignaciones)
    .map(Number)
    .filter((id) => !asignables.some((j) => j.id === id))
    .map((id) => jugadores.find((j) => j.id === id))
    .filter(Boolean);

  const riesgoDe = (id) => {
    if (!semanas) return null;
    const r = riesgoJugador(semanas, semanas.length - 1, id);
    return r.zona === 'riesgo' || r.zona === 'atencion' ? r.zona : null;
  };
  const sinSemaforo = semanas && jugadores.length > 0 && ['semana_incompleta', 'sin_datos'].includes(riesgoJugador(semanas, semanas.length - 1, jugadores[0].id).zona);
  const etiquetaMinutos = (id) => {
    if (!minutosPartido) return null;
    if (!convocados.includes(id)) return { texto: 'No convocado', color: '#6b7280', fondo: '#f3f4f6' };
    return (minutosPartido[id] || 0) >= 60
      ? { texto: "60'+", color: '#16a34a', fondo: '#dcfce7' }
      : { texto: "<60'", color: '#ca8a04', fondo: '#fef9c3' };
  };

  // --- Asignación de roles: al asignar, el formato se pone igual que lo asignado ---
  const asignar = (nuevas) => {
    setAsignaciones(nuevas);
    setConteo(contarRoles(nuevas));
  };
  const ciclar = (j) => {
    const sec = secuenciaRoles(j);
    const siguiente = sec[(sec.indexOf(asignaciones[j.id] ?? null) + 1) % sec.length];
    const nuevas = { ...asignaciones };
    if (siguiente) nuevas[j.id] = siguiente;
    else delete nuevas[j.id];
    asignar(nuevas);
  };
  // Reparto automático: propone quién va con cada rol (ver data/reparto.js). El entrenador lo ajusta después.
  const grupo = grupoDeTarea({ tipo: contexto?.tipo, bloque, objetivo });
  const sugerir = () => {
    const r = proponerReparto({ jugadores: asignables, conteo, grupo, minutosPartido, riesgoDe });
    asignar(r.asignaciones);
    setAvisoReparto(resumenReparto(r));
  };

  // --- Espacio ---
  const campo = jugadoresDeCampo(conteo);
  const calculo = calcularDimensiones({ objetivo, referencia, jugadoresCampo: campo, apP });
  const largo = manual ? manual.largo : calculo.largo;
  const ancho = manual ? manual.ancho : calculo.ancho;
  const apPReal = campo > 0 ? Math.round((largo * ancho) / campo) : 0;
  const rango = objetivo ? OBJETIVOS[objetivo].apP : null;
  const estadoAp = !rango ? '' : apPReal < rango[0] ? 'por debajo del rango del objetivo' : apPReal > rango[1] ? 'por encima del rango del objetivo' : 'dentro del rango del objetivo';

  const avisoDia = avisoDelDia({ tipo: contexto?.tipo, objetivo });

  // Pulsar el objetivo que ya está elegido lo quita.
  const cambiarObjetivo = (o) => {
    const nuevo = objetivo === o ? null : o;
    setObjetivo(nuevo);
    setApP(apPInicial(nuevo));
    setManual(null);
    if (nuevo && !trabajoTocado) aplicarTrabajo(nuevo);
  };

  // Pone las series, los minutos y la pausa que se proponen para el objetivo.
  const aplicarTrabajo = (o) => {
    const t = trabajoInicial(o);
    if (!t) return;
    setSeries(t.series);
    setDuracion(t.duracion_seg);
    setPausa(t.pausa_seg);
  };
  const tocar = (poner) => (v) => {
    setTrabajoTocado(true);
    poner(v);
  };

  const sinAsignar = Math.max(0, campo + conteo.portero - Object.keys(asignaciones).length);
  const asignadosAlgunos = Object.keys(asignaciones).length > 0;

  const datos = () => ({
    bloque,
    nombre: nombre.trim(),
    objetivo,
    referencia,
    n_ataque: conteo.ataque,
    n_defensa: conteo.defensa,
    n_comodines: conteo.comodin,
    n_porteros: conteo.portero,
    largo,
    ancho,
    series,
    duracion_seg: duracion,
    duracion_min: Math.max(1, Math.round(duracion / 60)), // por compatibilidad con servidores que aún no guardan segundos
    pausa_seg: pausa,
    descripcion: descripcion.trim() || null,
    jugadores: Object.entries(asignaciones).map(([id, rol]) => ({ jugador_id: Number(id), rol })),
    dibujo: dibujo || null,
  });

  const guardar = async () => {
    if (!nombre.trim() || guardando) return;
    setGuardando(true);
    try {
      if (tarea?.id) await actualizarTareaApi(tarea.id, datos());
      else await crearTareaApi(entrenamientoId, datos());
      navigation.goBack();
    } catch (err) {
      Alert.alert('No se pudo guardar', err.message);
    } finally {
      setGuardando(false);
    }
  };

  // Guarda la tarea tal como está en el formulario en la biblioteca (sin jugadores); si ya hay una con ese nombre, la sustituye.
  const guardarEnBiblioteca = async () => {
    if (!nombre.trim()) return;
    try {
      const item = bibliotecaDesdeTarea(datos());
      const existente = buscarPorNombre(await listarBibliotecaApi(), item.nombre);
      const hacer = async () => {
        try {
          if (existente) await actualizarBibliotecaApi(existente.id, item);
          else await crearBibliotecaApi(item);
          Alert.alert('Guardada en la biblioteca', `"${item.nombre}" ya se puede añadir a cualquier sesión.`);
        } catch (err) {
          Alert.alert('No se pudo guardar', err.message);
        }
      };
      if (existente) confirmar('Ya existe', `Ya hay una tarea "${item.nombre}" en la biblioteca. ¿Sustituirla por esta?`, hacer, 'Sustituir');
      else await hacer();
    } catch (err) {
      Alert.alert('No se pudo guardar', err.message);
    }
  };

  const borrar = () => {
    confirmar('Borrar tarea', `¿Borrar "${tarea.nombre}"?`, async () => {
      try {
        await eliminarTareaApi(tarea.id);
        navigation.goBack();
      } catch (err) {
        Alert.alert('No se pudo borrar', err.message);
      }
    }, 'Borrar');
  };

  const lectura = !puedeEditar;

  return (
    <View style={styles.contenedor}>
      <View style={styles.barra}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.barraCancelar}>{lectura ? '‹ Volver' : 'Cancelar'}</Text>
        </TouchableOpacity>
        <Text style={styles.barraTitulo} numberOfLines={1}>{titulo}</Text>
        {lectura ? (
          <View style={{ width: 60 }} />
        ) : (
          <TouchableOpacity onPress={guardar} disabled={!nombre.trim() || guardando}>
            {guardando ? <ActivityIndicator color="#16a34a" /> : <Text style={[styles.barraGuardar, !nombre.trim() && { color: '#9ca3af' }]}>Guardar</Text>}
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        {lectura && <Text style={styles.soloConsulta}>Solo consulta: las tareas las monta el cuerpo técnico (entrenador y segundo).</Text>}

        <Text style={styles.etiqueta}>Nombre de la tarea</Text>
        <TextInput
          style={styles.input}
          value={nombre}
          onChangeText={setNombre}
          editable={!lectura}
          maxLength={120}
          placeholder="Ej: Juego de posesión 7v7 + 2 comodines"
          placeholderTextColor="#9ca3af"
        />

        <Text style={styles.etiqueta}>Objetivo físico</Text>
        <View style={styles.filaChips}>
          {Object.entries(OBJETIVOS).map(([clave, o]) => (
            <TouchableOpacity key={clave} disabled={lectura} style={[styles.chip, objetivo === clave && styles.chipActivo]} onPress={() => cambiarObjetivo(clave)}>
              <Text style={[styles.chipTexto, objetivo === clave && styles.chipTextoActivo]}>{o.corto}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.ayuda}>{objetivo ? OBJETIVOS[objetivo].ayuda : 'Elige para qué sirve la tarea: ajusta el espacio que se propone.'}</Text>

        <Text style={styles.etiqueta}>Referencia de gol</Text>
        <View style={styles.filaChips}>
          {Object.entries(REFERENCIAS).map(([clave, r]) => (
            <TouchableOpacity key={clave} disabled={lectura} style={[styles.chip, referencia === clave && styles.chipActivo]} onPress={() => { setReferencia(clave); setManual(null); }}>
              <Text style={[styles.chipTexto, referencia === clave && styles.chipTextoActivo]}>{r.etiqueta}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ---------- Jugadores ---------- */}
        <Text style={styles.seccion}>Jugadores de esta sesión</Text>
        <Text style={styles.ayuda}>
          {asistentes === null
            ? 'Todavía no se ha pasado lista en este entreno: se muestran todos los jugadores.'
            : `${asignables.length} disponibles según el pase de lista${trabajoAparte.length ? ` · ${trabajoAparte.length} en trabajo aparte` : ''}.`}
          {!lectura && ' Toca a un jugador para darle rol: ataque, defensa, comodín o portero.'}
        </Text>

        <View style={styles.filaResumen}>
          {['ataque', 'defensa', 'comodin', 'portero'].map((r) => (
            <View key={r} style={[styles.resumenRol, { backgroundColor: ROLES[r].fondo }]}>
              <Text style={[styles.resumenNumero, { color: ROLES[r].color }]}>{conteo[r]}</Text>
              <Text style={[styles.resumenEtiqueta, { color: ROLES[r].color }]}>{ROLES[r].etiqueta}</Text>
            </View>
          ))}
        </View>

        {!lectura && (
          <View style={styles.filaAcciones}>
            <TouchableOpacity style={styles.accion} onPress={sugerir}>
              <Text style={styles.accionTexto}>✨ Proponer reparto</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.accion} onPress={() => { asignar({}); setAvisoReparto([]); }}>
              <Text style={styles.accionTexto}>Quitar a todos</Text>
            </TouchableOpacity>
          </View>
        )}
        {!lectura && !!grupo && (
          <Text style={styles.avisoGrupo}>
            Tarea del grupo {grupo === 'recuperacion' ? "Recuperación (60' o más en el partido anterior)" : "Compensación (menos de 60' en el partido anterior)"}: la propuesta solo usa jugadores de ese grupo.
          </Text>
        )}
        {!lectura && avisoReparto.map((l, i) => (
          <Text key={i} style={styles.avisoReparto}>• {l}</Text>
        ))}

        {sinSemaforo && (
          <Text style={styles.ayuda}>Sin semáforo de riesgo: la semana pasada no está completa o todavía faltan semanas anteriores para compararla.</Text>
        )}

        {asignables.map((j) => {
          const rol = asignaciones[j.id];
          const est = rol ? ROLES[rol] : null;
          const mins = etiquetaMinutos(j.id);
          const riesgo = riesgoDe(j.id);
          return (
            <TouchableOpacity key={j.id} disabled={lectura} activeOpacity={0.7} style={[styles.jugador, est && { borderColor: est.color }]} onPress={() => ciclar(j)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.jugadorNombre}>{nombreJugador(j)}</Text>
                <Text style={styles.jugadorPosicion}>{textoPosiciones(j)}</Text>
                <View style={styles.filaEtiquetas}>
                  {mins && <Etiqueta {...mins} />}
                  {riesgo === 'riesgo' && <Etiqueta texto="⚠ Pico de carga (sem. pasada)" color="#dc2626" fondo="#fee2e2" />}
                  {riesgo === 'atencion' && <Etiqueta texto="Carga a vigilar (sem. pasada)" color="#ca8a04" fondo="#fef9c3" />}
                </View>
                {!!j.observaciones && <Text style={styles.jugadorNota}>📝 {j.observaciones}</Text>}
              </View>
              <View style={[styles.rolBoton, est ? { backgroundColor: est.fondo } : styles.rolBotonVacio]}>
                <Text style={[styles.rolBotonTexto, est ? { color: est.color } : { color: '#9ca3af' }]}>{est ? est.etiqueta : 'Sin rol'}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
        {asignables.length === 0 && <Text style={styles.ayuda}>No hay jugadores disponibles para asignar.</Text>}

        {noDisponibles.length > 0 && (
          <Text style={styles.aviso}>
            Asignados pero hoy no disponibles (no asistieron o están en readaptación): {noDisponibles.map((j) => nombreJugador(j)).join(', ')}.
          </Text>
        )}

        {trabajoAparte.length > 0 && (
          <>
            <Text style={styles.subseccion}>Trabajo aparte · readaptación (no entran en la tarea)</Text>
            {trabajoAparte.map((j) => (
              <View key={j.id} style={[styles.jugador, styles.jugadorAparte]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.jugadorNombre}>{nombreJugador(j)}</Text>
                  <Text style={styles.jugadorNotaRoja}>{j.readaptacion}</Text>
                </View>
              </View>
            ))}
          </>
        )}

        {/* ---------- Formato ---------- */}
        <Text style={styles.seccion}>Formato</Text>
        {['ataque', 'defensa', 'comodin', 'portero'].map((r) => (
          <View key={r} style={styles.filaAjuste}>
            <Text style={[styles.ajusteEtiqueta, { color: ROLES[r].color }]}>{ETIQUETA_PLURAL[r]}</Text>
            <StepperNumero
              valor={conteo[r]}
              deshabilitado={lectura}
              min={0}
              max={r === 'portero' ? 4 : 20}
              onCambiar={(v) => setConteo((c) => ({ ...c, [r]: v }))}
            />
          </View>
        ))}
        <Text style={styles.formato}>{formatoTarea({ n_ataque: conteo.ataque, n_defensa: conteo.defensa, n_comodines: conteo.comodin, n_porteros: conteo.portero })}</Text>
        {sinAsignar > 0 && asignadosAlgunos && <Text style={styles.ayuda}>Faltan {sinAsignar} jugador{sinAsignar > 1 ? 'es' : ''} por asignar en este formato.</Text>}
        {referencia === 'porterias' && conteo.portero === 0 && <Text style={styles.ayuda}>Con porterías suele haber 1 o 2 porteros. No cuentan para el espacio por jugador.</Text>}

        {/* ---------- Espacio ---------- */}
        <Text style={styles.seccion}>Espacio</Text>
        <View style={styles.cajaEspacio}>
          <Text style={styles.espacioDimensiones}>{campo > 0 ? `${largo} × ${ancho} m` : '—'}</Text>
          <Text style={styles.espacioDetalle}>
            {campo > 0 ? `${apPReal} m² por jugador de campo (${campo} jugadores)` : 'Asigna jugadores o pon el formato para calcularlo'}
          </Text>
          {campo > 0 && !!rango && <Text style={styles.espacioRango}>{OBJETIVOS[objetivo].corto}: {rango[0]}–{rango[1]} m²/jugador · ahora {estadoAp}</Text>}
          {!!avisoDia && <Text style={styles.aviso}>{avisoDia}</Text>}
          {calculo.avisos.map((a, i) => (
            <Text key={i} style={styles.aviso}>{a}</Text>
          ))}
        </View>

        <DibujoTarea
          campos={campos}
          tarea={{ largo, ancho, referencia, n_ataque: conteo.ataque, n_defensa: conteo.defensa, n_comodines: conteo.comodin, n_porteros: conteo.portero, dibujo }}
        />
        {!lectura && campo > 0 && (
          <TouchableOpacity
            style={styles.botonPizarra}
            testID="abrir-pizarra"
            onPress={() => navigation.navigate('Pizarra', {
              volverA: 'TareaEditor',
              dibujo,
              tarea: { nombre: nombre.trim(), objetivo, referencia, apP, largo, ancho, n_ataque: conteo.ataque, n_defensa: conteo.defensa, n_comodines: conteo.comodin, n_porteros: conteo.portero, jugadoresCampo: campo },
            })}
          >
            <Text style={styles.botonPizarraTexto}>🖊 Editar en la pizarra</Text>
          </TouchableOpacity>
        )}
        {!lectura && dibujo && (
          <TouchableOpacity onPress={() => setDibujo(null)}>
            <Text style={styles.enlace}>Quitar mi dibujo y volver a la colocación automática</Text>
          </TouchableOpacity>
        )}

        <View style={styles.filaAjuste}>
          <Text style={styles.ajusteEtiqueta}>Espacio por jugador</Text>
          <StepperNumero valor={apP} deshabilitado={lectura} pasos={[-10, -5, 5, 10]} min={20} max={400} formato={(v) => `${v} m²`} onCambiar={(v) => { setApP(v); setManual(null); }} />
        </View>

        {!lectura &&
          (manual ? (
            <>
              <View style={styles.filaAjuste}>
                <Text style={styles.ajusteEtiqueta}>Largo</Text>
                <StepperNumero valor={manual.largo} pasos={[-5, -1, 1, 5]} min={5} max={110} formato={(v) => `${v} m`} onCambiar={(v) => setManual((m) => ({ ...m, largo: v }))} />
              </View>
              <View style={styles.filaAjuste}>
                <Text style={styles.ajusteEtiqueta}>Ancho</Text>
                <StepperNumero valor={manual.ancho} pasos={[-5, -1, 1, 5]} min={5} max={75} formato={(v) => `${v} m`} onCambiar={(v) => setManual((m) => ({ ...m, ancho: v }))} />
              </View>
              <TouchableOpacity onPress={() => setManual(null)}>
                <Text style={styles.enlace}>Volver al cálculo automático</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity onPress={() => setManual({ largo: calculo.largo, ancho: calculo.ancho })}>
              <Text style={styles.enlace}>Ajustar largo y ancho a mano</Text>
            </TouchableOpacity>
          ))}

        <Text style={styles.nota}>
          Orientativo: el espacio por jugador es el punto de partida, no una regla. Los avisos no impiden guardar: si se suspende un partido o hay que cambiar el plan, diseña la tarea que necesites. Por debajo de unos 100 m²/jugador predominan aceleraciones, frenadas y cambios de dirección; con más espacio hay más carrera. Para correr a máxima velocidad hace falta espacio largo (en juegos reducidos de fútbol base de élite, igualar la carrera de alta velocidad del partido pedía unos 180 m²/jugador y el sprint unos 210). Y en Recuperación o Velocidad la carga la marcan sobre todo la intensidad, las series y las pausas, más que el espacio. Ajústalo a tu plantilla y a tu objetivo.
        </Text>

        {/* ---------- Trabajo ---------- */}
        <Text style={styles.seccion}>Trabajo</Text>
        <View style={styles.filaAjuste}>
          <Text style={styles.ajusteEtiqueta}>Series</Text>
          <StepperNumero valor={series} deshabilitado={lectura} min={1} max={20} onCambiar={tocar(setSeries)} />
        </View>
        <View style={styles.filaAjuste}>
          <Text style={styles.ajusteEtiqueta}>Duración por serie</Text>
          <StepperNumero valor={duracion} deshabilitado={lectura} pasos={[-1, 1]} escala={ESCALA_DURACION} formato={formatoDuracion} onCambiar={tocar(setDuracion)} />
        </View>
        <View style={styles.filaAjuste}>
          <Text style={styles.ajusteEtiqueta}>Pausa entre series</Text>
          <StepperNumero valor={pausa} deshabilitado={lectura} pasos={[-30, -15, 15, 30]} min={0} max={600} formato={(v) => `${v} s`} onCambiar={tocar(setPausa)} />
        </View>
        <Text style={styles.formato}>
          {formatoDuracion(totalesTarea(series, duracion, pausa).juegoSeg)} de juego · {formatoDuracion(totalesTarea(series, duracion, pausa).totalSeg)} con pausas
        </Text>
        <Text style={styles.ayuda}>Relación trabajo:pausa {relacionTrabajoPausa(duracion, pausa)}</Text>

        {!!objetivo && (
          <View style={styles.cajaTrabajo}>
            <Text style={styles.cajaTrabajoTitulo}>
              Recomendado para {OBJETIVOS[objetivo].corto}: {OBJETIVOS[objetivo].trabajo.series[0]}-{OBJETIVOS[objetivo].trabajo.series[1]} series de{' '}
              {formatoDuracion(OBJETIVOS[objetivo].trabajo.segundos[0])}-{formatoDuracion(OBJETIVOS[objetivo].trabajo.segundos[1])} con {OBJETIVOS[objetivo].trabajo.pausa[0]}-{OBJETIVOS[objetivo].trabajo.pausa[1]} s de pausa
            </Text>
            {avisosTrabajo(objetivo, series, duracion, pausa).map((a, i) => (
              <Text key={i} style={styles.cajaTrabajoAviso}>• {a}</Text>
            ))}
            {!lectura && (
              <TouchableOpacity onPress={() => { aplicarTrabajo(objetivo); setTrabajoTocado(false); }}>
                <Text style={styles.enlace}>Proponer series y tiempo para {OBJETIVOS[objetivo].corto}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <Text style={styles.etiqueta}>Descripción y consignas</Text>
        <TextInput
          style={[styles.input, styles.inputMultilinea]}
          value={descripcion}
          onChangeText={setDescripcion}
          editable={!lectura}
          multiline
          maxLength={2000}
          placeholder="Reglas, número de toques, cómo se puntúa, consignas por rol..."
          placeholderTextColor="#9ca3af"
        />

        {!lectura && !!nombre.trim() && (
          <TouchableOpacity style={styles.botonBiblioteca} onPress={guardarEnBiblioteca}>
            <Text style={styles.botonBibliotecaTexto}>📚  Guardar en la biblioteca de tareas</Text>
          </TouchableOpacity>
        )}

        {!lectura && tarea?.id && (
          <TouchableOpacity onPress={borrar}>
            <Text style={styles.borrar}>Borrar esta tarea</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

function Etiqueta({ texto, color, fondo }) {
  return (
    <View style={[styles.etiquetaPildora, { backgroundColor: fondo }]}>
      <Text style={[styles.etiquetaPildoraTexto, { color }]}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#f8fafc' },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', padding: 24 },
  error: { color: '#dc2626', textAlign: 'center', marginBottom: 14 },
  botonReintentar: { backgroundColor: '#7c3aed', borderRadius: 10, paddingHorizontal: 22, paddingVertical: 12 },
  botonReintentarTexto: { color: '#fff', fontWeight: '700' },
  barra: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  barraCancelar: { color: '#6b7280', fontWeight: '700', fontSize: 14, minWidth: 60 },
  barraTitulo: { flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '800', color: '#111827', marginHorizontal: 8 },
  barraGuardar: { color: '#16a34a', fontWeight: '800', fontSize: 15, minWidth: 60, textAlign: 'right' },
  soloConsulta: { fontSize: 11, color: '#2563eb', backgroundColor: '#eff6ff', borderRadius: 8, padding: 10, textAlign: 'center', marginBottom: 12 },
  etiqueta: { fontSize: 12, fontWeight: '600', color: '#6b7280', marginTop: 16, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#111827' },
  inputMultilinea: { height: 120, textAlignVertical: 'top' },
  filaChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18, borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#fff' },
  chipActivo: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  chipTexto: { fontSize: 12, fontWeight: '700', color: '#6b7280' },
  chipTextoActivo: { color: '#fff' },
  ayuda: { fontSize: 12, color: '#6b7280', marginTop: 6, lineHeight: 17 },
  seccion: { fontSize: 15, fontWeight: '800', color: '#111827', marginTop: 28 },
  subseccion: { fontSize: 12, fontWeight: '700', color: '#dc2626', marginTop: 16, marginBottom: 6 },
  filaResumen: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 6 },
  resumenRol: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  resumenNumero: { fontSize: 20, fontWeight: '800' },
  resumenEtiqueta: { fontSize: 10, fontWeight: '700' },
  filaAcciones: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  accion: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#f5f3ff', alignItems: 'center' },
  accionTexto: { color: '#6d28d9', fontSize: 11, fontWeight: '700' },
  jugador: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#e5e7eb', padding: 12, marginBottom: 8 },
  jugadorAparte: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  jugadorNombre: { fontSize: 13, fontWeight: '800', color: '#111827' },
  jugadorPosicion: { fontSize: 11, color: '#6b7280', marginTop: 1 },
  jugadorNota: { fontSize: 11, color: '#2563eb', marginTop: 4 },
  jugadorNotaRoja: { fontSize: 11, color: '#dc2626', marginTop: 3 },
  filaEtiquetas: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 5 },
  etiquetaPildora: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  etiquetaPildoraTexto: { fontSize: 10, fontWeight: '700' },
  rolBoton: { minWidth: 76, paddingVertical: 8, paddingHorizontal: 8, borderRadius: 8, alignItems: 'center', marginLeft: 8 },
  rolBotonVacio: { backgroundColor: '#f3f4f6' },
  rolBotonTexto: { fontSize: 11, fontWeight: '800' },
  aviso: { fontSize: 11, color: '#92400e', backgroundColor: '#fef3c7', borderRadius: 8, padding: 10, marginTop: 8 },
  filaAjuste: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  ajusteEtiqueta: { fontSize: 13, fontWeight: '700', color: '#374151', flexShrink: 1, marginRight: 8 },
  formato: { fontSize: 14, fontWeight: '800', color: '#7c3aed', textAlign: 'center', marginTop: 12 },
  cajaEspacio: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, borderColor: '#ddd6fe', padding: 16, marginTop: 10, alignItems: 'center' },
  espacioDimensiones: { fontSize: 32, fontWeight: '800', color: '#111827' },
  espacioDetalle: { fontSize: 12, color: '#6b7280', marginTop: 4, textAlign: 'center' },
  espacioRango: { fontSize: 11, color: '#7c3aed', fontWeight: '600', marginTop: 6, textAlign: 'center' },
  cajaTrabajo: { backgroundColor: '#f5f3ff', borderRadius: 10, padding: 12, marginTop: 12 },
  cajaTrabajoTitulo: { fontSize: 12, color: '#5b21b6', fontWeight: '700', lineHeight: 17 },
  cajaTrabajoAviso: { fontSize: 11, color: '#92400e', marginTop: 4 },
  botonPizarra: { backgroundColor: '#7c3aed', borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 10 },
  botonPizarraTexto: { color: '#fff', fontWeight: '800', fontSize: 14 },
  enlace: { fontSize: 12, color: '#2563eb', fontWeight: '700', textAlign: 'center', marginTop: 12 },
  nota: { fontSize: 11, color: '#9ca3af', lineHeight: 16, marginTop: 14 },
  avisoGrupo: { fontSize: 11, color: '#6d28d9', backgroundColor: '#f5f3ff', borderRadius: 8, padding: 8, marginTop: 8 },
  avisoReparto: { fontSize: 11, color: '#374151', marginTop: 4 },
  botonBiblioteca: { borderRadius: 10, borderWidth: 1.5, borderColor: '#c4b5fd', paddingVertical: 12, alignItems: 'center', backgroundColor: '#fff', marginTop: 24 },
  botonBibliotecaTexto: { color: '#6d28d9', fontWeight: '700', fontSize: 13 },
  borrar: { color: '#dc2626', fontSize: 13, fontWeight: '700', textAlign: 'center', marginTop: 30 },
});

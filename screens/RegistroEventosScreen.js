import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
  TextInput,
  Keyboard,
} from 'react-native';
import {
  obtenerPartidoApi,
  obtenerConvocatoriaApi,
  listarEventosApi,
  crearEventoApi,
  eliminarEventoApi,
  actualizarEventoApi,
  listarMinutosManualesApi,
  guardarMinutoManualApi,
  actualizarPartidoApi,
  obtenerUsuario,
} from '../data/apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { confirmar } from '../data/confirmar';
import { compartirWhatsApp, generarDocumento } from '../data/compartir';
import { calcularMinutosJugados, jugadoresEnCampo, jugadoresEnBanquillo } from '../data/minutos';

// Quien registra lo que pasa EN DIRECTO (empezar, goles, tarjetas,
// cambios, finalizar) es el delegado — el entrenador está dirigiendo
// el partido y no puede estar también metido en el móvil. El
// entrenador/segundo siguen viéndolo todo, pero sin botones.
const ROLES_GESTION = ['delegado'];
const claveReloj = (partidoId) => `@reloj_partido_${partidoId}`;

const CONFIG_TIPO = {
  tiro: { etiqueta: 'Tiro', necesitaJugador: false, resultados: ['fuera', 'parada', 'gol'] },
  corner: { etiqueta: 'Córner', necesitaJugador: false, resultados: ['remate', 'sin_peligro'] },
  amarilla: { etiqueta: 'Tarjeta amarilla', necesitaJugador: true, resultados: null },
  roja: { etiqueta: 'Tarjeta roja', necesitaJugador: true, resultados: null },
  falta: { etiqueta: 'Falta cometida', necesitaJugador: false, resultados: null },
  cambio: { etiqueta: 'Cambio', necesitaJugador: true, resultados: null },
};

const ETIQUETA_RESULTADO = { gol: 'Gol', parada: 'Parada', fuera: 'Fuera', remate: 'Remate', sin_peligro: 'Sin peligro' };
const ICONO = { tiro: { gol: '⚽', parada: '🧤', fuera: '🎯' }, corner: '🚩', amarilla: '🟨', roja: '🟥', falta: '✋', cambio: '🔁' };

// ---------- Helpers puros (operan sobre lo que ya tenemos en memoria) ----------

function nombreCompleto(jugador) {
  if (!jugador) return '';
  return `${jugador.nombre} ${jugador.apellidos || ''}`.trim();
}

export default function RegistroEventosScreen({ route, navigation }) {
  const { partidoId } = route.params;

  const [partido, setPartido] = useState(null);
  const [convocatoria, setConvocatoria] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState('');
  const [usuario, setUsuario] = useState(null);
  const puedeGestionar = usuario && ROLES_GESTION.includes(usuario.role);
  const puedeCorregirDatos = usuario && ['delegado', 'entrenador', 'segundo_entrenador'].includes(usuario.role);

  // Cronómetro: solo en este móvil, no se guarda en el servidor.
  const [estadoLocal, setEstadoLocal] = useState('pendiente'); // pendiente | en_curso | descanso | finalizado
  const [parteActual, setParteActual] = useState(1);
  const [segundosParte1, setSegundosParte1] = useState(0);
  const [segundosParte2, setSegundosParte2] = useState(0);
  const [cronometroEnMarcha, setCronometroEnMarcha] = useState(false);
  const [cronometroIniciadoEn, setCronometroIniciadoEn] = useState(null);
  const [segundosVisibles, setSegundosVisibles] = useState(0);
  const intervalo = useRef(null);

  const [modalTipo, setModalTipo] = useState(null);
  const [equipoSeleccionado, setEquipoSeleccionado] = useState('local');
  const [resultadoSeleccionado, setResultadoSeleccionado] = useState(null);
  const [jugadorSeleccionado, setJugadorSeleccionado] = useState(null);
  const [jugadorSaleSeleccionado, setJugadorSaleSeleccionado] = useState(null);
  const [dorsalRivalSeleccionado, setDorsalRivalSeleccionado] = useState('');
  const [enviandoEvento, setEnviandoEvento] = useState(false);
  const [vista, setVista] = useState('eventos');
  const [minutoEvento, setMinutoEvento] = useState(1);
  const [mostrarOtroDorsal, setMostrarOtroDorsal] = useState(false);
  const [relojCargado, setRelojCargado] = useState(false);
  const [modalFinalVisible, setModalFinalVisible] = useState(false);
  const [minutoFinalElegido, setMinutoFinalElegido] = useState(90);
  const [editando, setEditando] = useState(null); // evento que se está corrigiendo (null = evento nuevo)
  const [manuales, setManuales] = useState({}); // minutos jugados puestos a mano: { [jugadorId]: minutos }

  const cargar = useCallback(
    async (esRecarga = false) => {
      setError('');
      if (esRecarga) setActualizando(true);
      try {
        const [u, p, c, e, man] = await Promise.all([
          obtenerUsuario(),
          obtenerPartidoApi(partidoId),
          obtenerConvocatoriaApi(partidoId),
          listarEventosApi(partidoId),
          listarMinutosManualesApi(partidoId),
        ]);
        setManuales(man);
        setUsuario(u);
        setPartido(p);
        setConvocatoria(c);
        setEventos(e);
        // Solo fijamos el estado local la primera vez: si ya estábamos
        // gestionando el cronómetro, una recarga no debe resetearlo.
        if (!esRecarga) {
          if (p.estado === 'en_curso') setEstadoLocal('en_curso');
          if (p.estado === 'finalizado') setEstadoLocal('finalizado');
          // Si la página se recargó a mitad de partido, recuperamos el
          // reloj tal como estaba (el momento exacto en que arrancó se
          // guarda, así que el minuto sigue siendo el real).
          if (p.estado === 'en_curso') {
            try {
              const guardado = await AsyncStorage.getItem(claveReloj(partidoId));
              if (guardado) {
                const r = JSON.parse(guardado);
                setEstadoLocal(r.estadoLocal);
                setParteActual(r.parteActual);
                setSegundosParte1(r.segundosParte1);
                setSegundosParte2(r.segundosParte2);
                setCronometroEnMarcha(r.cronometroEnMarcha);
                setCronometroIniciadoEn(r.cronometroIniciadoEn);
              }
            } catch {
              // si no se puede leer, seguimos con el reloj a cero
            }
          }
          setRelojCargado(true);
        }
      } catch (err) {
        setError(err.message || 'No se pudo cargar el partido');
      } finally {
        setCargando(false);
        setActualizando(false);
      }
    },
    [partidoId]
  );

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Al volver a esta pantalla (tras editar los datos del partido, la hora de citación o la convocatoria)
  // se recargan los datos: si no, se seguirían viendo los anteriores. La primera vez ya la carga el efecto de arriba.
  const primeraVez = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (primeraVez.current) {
        primeraVez.current = false;
        return;
      }
      cargar(true);
    }, [cargar])
  );

  const segundosBase = parteActual === 1 ? segundosParte1 : segundosParte2;

  const segundosActuales = useCallback(() => {
    if (!cronometroEnMarcha || !cronometroIniciadoEn) return segundosBase;
    return segundosBase + Math.floor((Date.now() - cronometroIniciadoEn) / 1000);
  }, [cronometroEnMarcha, cronometroIniciadoEn, segundosBase]);

  useEffect(() => {
    setSegundosVisibles(segundosActuales());
    // Mientras hay un modal abierto (registrando un evento) paramos de
    // repintar la pantalla entera cada segundo: si no, cada tecla que
    // pulsas compite con ese repintado y en móviles más justos se nota
    // como si la app se quedara pillada y el teclado no respondiera.
    if (cronometroEnMarcha && modalTipo === null) {
      intervalo.current = setInterval(() => setSegundosVisibles(segundosActuales()), 1000);
    }
    return () => clearInterval(intervalo.current);
  }, [cronometroEnMarcha, segundosActuales, modalTipo]);

  // Guardamos el reloj en el propio móvil cada vez que cambia.
  useEffect(() => {
    if (!relojCargado || !puedeGestionar) return;
    AsyncStorage.setItem(
      claveReloj(partidoId),
      JSON.stringify({ estadoLocal, parteActual, segundosParte1, segundosParte2, cronometroEnMarcha, cronometroIniciadoEn })
    ).catch(() => {});
  }, [relojCargado, puedeGestionar, partidoId, estadoLocal, parteActual, segundosParte1, segundosParte2, cronometroEnMarcha, cronometroIniciadoEn]);

  const minutoDePartido = () => {
    const offset = Math.floor(segundosParte1 / 60);
    if (parteActual === 1) return Math.floor(segundosActuales() / 60) + 1;
    return offset + Math.floor(segundosActuales() / 60) + 1;
  };

  if (cargando) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centrado}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  // Si el partido ya terminó, usamos el minuto final que se guardó al
  // finalizar (no un cronómetro que, al reabrir la app otro día, estaría
  // a cero). Así el informe sale bien aunque lo mires la semana que viene.
  // Si el reloj se perdió (recarga, otro móvil), el último evento
  // apuntado nunca puede ser posterior al final: lo usamos como suelo.
  const minutoMaxEventos = eventos.reduce((m, e) => Math.max(m, e.minuto || 0), 0);
  const minutoActual =
    partido.minuto_final ??
    (estadoLocal === 'finalizado'
      ? Math.max(minutoDePartido(), minutoMaxEventos)
      // En el descanso, minutos ya jugados de la primera parte (no "el minuto en curso", que cuenta uno más).
      : estadoLocal === 'descanso'
        ? Math.max(Math.floor(segundosParte1 / 60), minutoMaxEventos)
        : minutoDePartido());
  const golesLocal = eventos.filter((e) => e.tipo === 'tiro' && e.resultado === 'gol' && e.equipo === 'local').length;
  const golesVisitante = eventos.filter((e) => e.tipo === 'tiro' && e.resultado === 'gol' && e.equipo === 'visitante').length;

  // Cuál de los dos lados ("local"/"visitante") somos nosotros depende
  // de si jugamos en casa o fuera. De los nuestros solo se puede elegir
  // entre quien está en el campo; del rival, cualquier dorsal a mano.
  const nuestroLado = partido.es_local ? 'local' : 'visitante';
  const rivalLado = nuestroLado === 'local' ? 'visitante' : 'local';
  const numerosRivalUsados = [...new Set(eventos.filter((e) => e.dorsal_rival).map((e) => e.dorsal_rival))].sort((a, b) => a - b);

  const formatearReloj = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const ss = (s % 60).toString().padStart(2, '0');
    return `${m}:${ss}`;
  };

  const comenzar = async () => {
    setParteActual(1);
    setSegundosParte1(0);
    setSegundosParte2(0);
    setCronometroEnMarcha(true);
    setCronometroIniciadoEn(Date.now());
    setEstadoLocal('en_curso');
    actualizarPartidoApi(partidoId, { estado: 'en_curso' }).catch((err) =>
      Alert.alert('El partido ha empezado en este móvil, pero el servidor no lo ha guardado', err.message)
    );
  };

  const pararCronometro = () => {
    if (cronometroEnMarcha && cronometroIniciadoEn) {
      const transcurrido = Math.floor((Date.now() - cronometroIniciadoEn) / 1000);
      if (parteActual === 1) setSegundosParte1((s) => s + transcurrido);
      else setSegundosParte2((s) => s + transcurrido);
    }
    setCronometroEnMarcha(false);
    setCronometroIniciadoEn(null);
  };

  const pasarADescanso = () => {
    confirmar('Fin de la primera parte', '¿Enviar el partido a descanso?', () => {
      pararCronometro();
      setEstadoLocal('descanso');
      setVista('resumen'); // al descanso se enseña el mismo resumen que al final
    }, 'Sí, descanso');
  };

  const empezarSegundaParte = () => {
    setParteActual(2);
    setCronometroEnMarcha(true);
    setCronometroIniciadoEn(Date.now());
    setEstadoLocal('en_curso');
  };

  const terminarPartido = () => {
    // Proponemos el minuto que marca el reloj, pero se puede corregir
    // antes de cerrar (por si el reloj se perdió o iba desfasado).
    setMinutoFinalElegido(Math.max(minutoDePartido(), minutoMaxEventos, 1));
    setModalFinalVisible(true);
  };

  const finalizarConfirmado = () => {
    pararCronometro();
    setEstadoLocal('finalizado');
    setModalFinalVisible(false);
    setPartido((prev) => ({
      ...prev,
      estado: 'finalizado',
      goles_local: golesLocal,
      goles_visitante: golesVisitante,
      minuto_final: minutoFinalElegido,
    }));
    actualizarPartidoApi(partidoId, {
      estado: 'finalizado',
      goles_local: golesLocal,
      goles_visitante: golesVisitante,
      minuto_final: minutoFinalElegido,
    }).catch((err) =>
      Alert.alert('El partido se ha cerrado en este móvil, pero el servidor no lo ha guardado', err.message)
    );
  };

  const corregirMinutoFinal = async (nuevoMinuto) => {
    setPartido((prev) => ({ ...prev, minuto_final: nuevoMinuto }));
    try {
      await actualizarPartidoApi(partidoId, { minuto_final: nuevoMinuto });
      Alert.alert('Guardado', `Minuto final: ${nuevoMinuto}'`);
    } catch (err) {
      Alert.alert('Cambiado solo en este móvil, el servidor no lo ha guardado', err.message);
    }
  };

  // Minutos jugados puestos a mano (null = volver al cálculo automático por los cambios).
  const guardarMinuto = async (jugadorId, minutos) => {
    try {
      await guardarMinutoManualApi(partidoId, jugadorId, minutos);
      setManuales((prev) => { const n = { ...prev }; if (minutos == null) delete n[jugadorId]; else n[jugadorId] = minutos; return n; });
    } catch (err) {
      Alert.alert('No se pudo guardar el minuto', err.message);
    }
  };

  const abrirModal = (tipo) => {
    setEditando(null);
    // Los cambios solo se pueden registrar en nuestro equipo: del rival
    // no conocemos el banquillo.
    setEquipoSeleccionado(tipo === 'cambio' ? nuestroLado : 'local');
    setResultadoSeleccionado(null);
    setJugadorSeleccionado(null);
    setJugadorSaleSeleccionado(null);
    setDorsalRivalSeleccionado('');
    setMostrarOtroDorsal(false);
    setMinutoEvento(minutoActual);
    setModalTipo(tipo);
  };

  // Corregir un evento ya apuntado: mismo formulario, con sus datos. Se puede cambiar equipo, minuto, resultado y jugadores.
  const abrirEditar = (evento) => {
    const porId = (id) => convocatoria.map((c) => c.jugador).find((j) => j.id === id) || null;
    setEditando(evento);
    setEquipoSeleccionado(evento.equipo);
    setResultadoSeleccionado(evento.resultado || null);
    setJugadorSeleccionado(evento.tipo === 'cambio' ? porId(evento.jugador_entra_id) : porId(evento.jugador_id));
    setJugadorSaleSeleccionado(porId(evento.jugador_sale_id));
    setDorsalRivalSeleccionado(evento.dorsal_rival ? String(evento.dorsal_rival) : '');
    setMostrarOtroDorsal(false);
    setMinutoEvento(evento.minuto);
    setModalTipo(evento.tipo);
  };

  const config = modalTipo ? CONFIG_TIPO[modalTipo] : null;
  // Al corregir un evento antiguo no vale «quién está en el campo ahora»: se ofrece toda la convocatoria.
  const todosConvocados = convocatoria.map((c) => c.jugador);
  const enCampoEquipo = modalTipo ? (editando ? todosConvocados : jugadoresEnCampo(convocatoria, eventos)) : [];
  const banquilloEquipo = modalTipo === 'cambio' ? (editando ? todosConvocados : jugadoresEnBanquillo(convocatoria, eventos)) : [];

  const esRival = equipoSeleccionado === rivalLado;

  const puedeConfirmar = () => {
    if (!config) return false;
    if (config.resultados && !resultadoSeleccionado) return false;
    if (modalTipo === 'cambio') {
      if (enCampoEquipo.length > 0 && !jugadorSaleSeleccionado) return false;
      if (banquilloEquipo.length > 0 && !jugadorSeleccionado) return false;
      return true;
    }
    // Amarilla/roja necesitan de verdad saber de quién se trata.
    if (config.necesitaJugador) {
      if (esRival && !dorsalRivalSeleccionado) return false;
      if (!esRival && !jugadorSeleccionado) return false;
    }
    return true;
  };

  // Si el partido ya está cerrado, el marcador guardado se recalcula con los eventos corregidos.
  const recalcularMarcadorGuardado = async (lista) => {
    if (!partido || partido.estado !== 'finalizado') return;
    const gl = lista.filter((e) => e.tipo === 'tiro' && e.resultado === 'gol' && e.equipo === 'local').length;
    const gv = lista.filter((e) => e.tipo === 'tiro' && e.resultado === 'gol' && e.equipo === 'visitante').length;
    setPartido((prev) => ({ ...prev, goles_local: gl, goles_visitante: gv }));
    await actualizarPartidoApi(partidoId, { goles_local: gl, goles_visitante: gv });
  };

  const confirmarEvento = async () => {
    setEnviandoEvento(true);
    try {
      if (editando) {
        await actualizarEventoApi(editando.id, {
          equipo: equipoSeleccionado,
          minuto: minutoEvento,
          resultado: resultadoSeleccionado || null,
          jugador_id: modalTipo === 'cambio' || esRival ? null : jugadorSeleccionado?.id || null,
          jugador_sale_id: modalTipo === 'cambio' ? jugadorSaleSeleccionado?.id || null : null,
          jugador_entra_id: modalTipo === 'cambio' ? jugadorSeleccionado?.id || null : null,
          dorsal_rival: modalTipo !== 'cambio' && esRival && dorsalRivalSeleccionado ? Number(dorsalRivalSeleccionado) : null,
        });
        const lista = await listarEventosApi(partidoId);
        setEventos(lista);
        await recalcularMarcadorGuardado(lista).catch((err) => Alert.alert('Evento corregido, pero el marcador guardado no se ha actualizado', err.message));
        Keyboard.dismiss();
        setModalTipo(null);
        setEditando(null);
        return;
      }
      const nuevo = await crearEventoApi(partidoId, {
        tipo: modalTipo,
        equipo: equipoSeleccionado,
        minuto: minutoEvento,
        parte: parteActual,
        resultado: resultadoSeleccionado || null,
        jugador_id: modalTipo === 'cambio' || esRival ? null : jugadorSeleccionado?.id || null,
        jugador_sale_id: modalTipo === 'cambio' ? jugadorSaleSeleccionado?.id || null : null,
        jugador_entra_id: modalTipo === 'cambio' ? jugadorSeleccionado?.id || null : null,
        dorsal_rival: modalTipo !== 'cambio' && esRival && dorsalRivalSeleccionado ? Number(dorsalRivalSeleccionado) : null,
      });
      setEventos((prev) => [...prev, nuevo]);
      Keyboard.dismiss();
      setModalTipo(null);
    } catch (err) {
      Alert.alert('No se pudo guardar', err.message);
    } finally {
      setEnviandoEvento(false);
    }
  };

  const borrarEvento = (eventoId) => {
    confirmar('Eliminar evento', '¿Seguro que quieres borrarlo?', async () => {
      try {
        await eliminarEventoApi(eventoId);
        const resto = eventos.filter((e) => e.id !== eventoId);
        setEventos(resto);
        setModalTipo(null);
        setEditando(null);
        await recalcularMarcadorGuardado(resto).catch(() => {});
      } catch (err) {
        Alert.alert('No se pudo eliminar', err.message);
      }
    }, 'Eliminar');
  };

  const eventosOrdenados = [...eventos].sort((a, b) => b.minuto - a.minuto);
  const nombreEquipo = (equipo) => (equipo === 'local' ? partido.equipo_local : partido.equipo_visitante);

  const iconoDe = (evento) => (evento.tipo === 'tiro' ? ICONO.tiro[evento.resultado] || '🎯' : ICONO[evento.tipo]);

  const descripcionDe = (evento) => {
    if (evento.tipo === 'tiro' || evento.tipo === 'corner') {
      return `${CONFIG_TIPO[evento.tipo].etiqueta} · ${nombreEquipo(evento.equipo)} · ${ETIQUETA_RESULTADO[evento.resultado]}`;
    }
    return `${CONFIG_TIPO[evento.tipo].etiqueta} · ${nombreEquipo(evento.equipo)}`;
  };

  return (
    <View style={styles.contenedor}>
      <View style={styles.marcador}>
        <View style={styles.equipoMarcador}><Text style={styles.nombreEquipo} numberOfLines={1}>{partido.equipo_local}</Text></View>
        <View style={styles.resultado}>
          <Text style={styles.goles}>{golesLocal} - {golesVisitante}</Text>
          {puedeGestionar ? (
            <>
              <Text style={styles.reloj}>{formatearReloj(segundosVisibles)}</Text>
              <Text style={styles.parte}>
                {estadoLocal === 'descanso' ? 'Descanso' : estadoLocal === 'pendiente' ? 'Por empezar' : `${parteActual}ª parte`}
              </Text>
            </>
          ) : (
            // Quien solo mira no tiene cronómetro propio (vive en el móvil
            // de quien gestiona el partido); mostramos el estado real del
            // servidor en su lugar, que sí está sincronizado.
            <Text style={styles.parte}>
              {{ pendiente: 'Por empezar', en_curso: 'En juego', finalizado: 'Finalizado', cancelado: 'Cancelado' }[partido.estado]}
            </Text>
          )}
        </View>
        <View style={styles.equipoMarcador}><Text style={styles.nombreEquipo} numberOfLines={1}>{partido.equipo_visitante}</Text></View>
      </View>

      {puedeGestionar ? (
        <>
          <View style={styles.controles}>
            {estadoLocal === 'pendiente' && (
              <TouchableOpacity style={[styles.botonControl, styles.botonVerde]} onPress={comenzar}>
                <Text style={styles.botonControlTexto}>Comenzar partido</Text>
              </TouchableOpacity>
            )}
            {estadoLocal === 'en_curso' && parteActual === 1 && (
              <TouchableOpacity style={[styles.botonControl, styles.botonGris]} onPress={pasarADescanso}>
                <Text style={styles.botonControlTexto}>Descanso</Text>
              </TouchableOpacity>
            )}
            {estadoLocal === 'descanso' && (
              <TouchableOpacity style={[styles.botonControl, styles.botonVerde]} onPress={empezarSegundaParte}>
                <Text style={styles.botonControlTexto}>Empezar 2ª parte</Text>
              </TouchableOpacity>
            )}
            {estadoLocal === 'en_curso' && parteActual === 2 && (
              <TouchableOpacity style={[styles.botonControl, styles.botonRojo]} onPress={terminarPartido}>
                <Text style={styles.botonControlTexto}>Finalizar</Text>
              </TouchableOpacity>
            )}
            {estadoLocal === 'finalizado' && <Text style={styles.finalizadoTexto}>Partido finalizado</Text>}
          </View>

          {estadoLocal === 'finalizado' && (
            <Text style={styles.avisoCorreccion}>Puedes añadir un evento olvidado: elige el minuto en la ventana que se abre.</Text>
          )}
          {estadoLocal !== 'pendiente' && (
            <View style={styles.botonera}>
              <BotonEvento emoji="🎯" texto="Tiro" onPress={() => abrirModal('tiro')} />
              <BotonEvento emoji="🚩" texto="Córner" onPress={() => abrirModal('corner')} />
              <BotonEvento emoji="✋" texto="Falta" onPress={() => abrirModal('falta')} />
              <BotonEvento emoji="🟨" texto="Amarilla" onPress={() => abrirModal('amarilla')} />
              <BotonEvento emoji="🟥" texto="Roja" onPress={() => abrirModal('roja')} />
              <BotonEvento emoji="🔁" texto="Cambio" onPress={() => abrirModal('cambio')} />
            </View>
          )}
        </>
      ) : (
        <TouchableOpacity style={styles.botonActualizar} onPress={() => cargar(true)} disabled={actualizando}>
          {actualizando ? <ActivityIndicator color="#374151" /> : <Text style={styles.botonActualizarTexto}>↻ Actualizar</Text>}
        </TouchableOpacity>
      )}

      <View style={styles.selectorVista}>
        <TouchableOpacity style={[styles.chipVista, vista === 'eventos' && styles.chipVistaActivo]} onPress={() => setVista('eventos')}>
          <Text style={[styles.chipVistaTexto, vista === 'eventos' && styles.chipVistaTextoActivo]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>Eventos</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.chipVista, vista === 'convocatoria' && styles.chipVistaActivo]} onPress={() => setVista('convocatoria')}>
          <Text style={[styles.chipVistaTexto, vista === 'convocatoria' && styles.chipVistaTextoActivo]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>Convocatoria</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.chipVista} onPress={() => navigation.navigate('Alineacion', { partidoId })}>
          <Text style={styles.chipVistaTexto} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>Alineación</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.chipVista} onPress={() => navigation.navigate('Enfrentamiento', { partidoId, rival: partido[partido.es_local ? 'equipo_visitante' : 'equipo_local'] })}>
          <Text style={styles.chipVistaTexto} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>Sistemas</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.chipVista} onPress={() => navigation.navigate('Abp', { partidoId })}>
          <Text style={styles.chipVistaTexto} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>ABP</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.chipVista, vista === 'resumen' && styles.chipVistaActivo]} onPress={() => setVista('resumen')}>
          <Text style={[styles.chipVistaTexto, vista === 'resumen' && styles.chipVistaTextoActivo]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>Resumen</Text>
        </TouchableOpacity>
      </View>

      {vista === 'eventos' ? (
        <FlatList
          style={styles.lista}
          data={eventosOrdenados}
          keyExtractor={(item) => String(item.id)}
          ListEmptyComponent={<Text style={styles.listaVacia}>Todavía no hay eventos registrados</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.filaEvento}
              onPress={puedeCorregirDatos ? () => abrirEditar(item) : undefined}
              onLongPress={puedeCorregirDatos ? () => borrarEvento(item.id) : undefined}
            >
              <Text style={styles.minutoEvento}>{item.minuto}'</Text>
              <Text style={styles.iconoEvento}>{iconoDe(item)}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.tipoEvento}>{descripcionDe(item)}</Text>
                {item.tipo === 'cambio' ? (
                  <Text style={styles.detalleEvento}>Entra {item.jugador_entra || '—'} / Sale {item.jugador_sale || '—'}</Text>
                ) : item.jugador ? (
                  <Text style={styles.detalleEvento}>{item.jugador}</Text>
                ) : item.dorsal_rival ? (
                  <Text style={styles.detalleEvento}>Rival #{item.dorsal_rival}</Text>
                ) : null}
              </View>
              {puedeCorregirDatos && <Text style={styles.editarEvento}>✏️</Text>}
            </TouchableOpacity>
          )}
        />
      ) : vista === 'convocatoria' ? (
        <ConvocatoriaTab
          convocatoria={convocatoria}
          partido={partido}
          puedeCambiar={Boolean(usuario && ['entrenador', 'segundo_entrenador'].includes(usuario.role) && partido.estado === 'pendiente')}
          onCambiar={() => navigation.navigate('Plantilla', { partidoId })}
        />
      ) : (
        <ResumenPartido
          eventos={eventos}
          convocatoria={convocatoria}
          minutoActual={minutoActual}
          golesLocal={golesLocal}
          golesVisitante={golesVisitante}
          partido={partido}
          finalizado={estadoLocal === 'finalizado'}
          descanso={estadoLocal === 'descanso'}
          puedeCorregir={puedeGestionar}
          onCorregirMinutoFinal={corregirMinutoFinal}
          manuales={manuales}
          puedeEditarMinutos={Boolean(puedeCorregirDatos)}
          onGuardarMinuto={guardarMinuto}
        />
      )}

      <Modal visible={modalTipo !== null} transparent animationType="slide">
        <View style={[styles.modalFondo, mostrarOtroDorsal && { justifyContent: 'flex-start', paddingTop: 40 }]}>
          <ScrollView style={styles.modalContenido} contentContainerStyle={{ paddingBottom: 8 }} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitulo}>{editando ? `Corregir: ${config?.etiqueta}` : config?.etiqueta}</Text>

            <Text style={styles.etiquetaSeccion}>Minuto</Text>
            <StepperMinuto valor={minutoEvento} onCambiar={setMinutoEvento} />

            <View style={styles.selectorEquipo}>
              {(modalTipo !== 'cambio' || rivalLado !== 'local') && (
                <TouchableOpacity style={[styles.chipEquipo, equipoSeleccionado === 'local' && styles.chipEquipoActivo]} onPress={() => setEquipoSeleccionado('local')}>
                  <Text style={[styles.chipTexto, equipoSeleccionado === 'local' && styles.chipTextoActivo]}>{partido.equipo_local}</Text>
                </TouchableOpacity>
              )}
              {/* En un cambio solo se registra nuestro equipo: del rival no conocemos el banquillo. */}
              {(modalTipo !== 'cambio' || rivalLado !== 'visitante') && (
                <TouchableOpacity style={[styles.chipEquipo, equipoSeleccionado === 'visitante' && styles.chipEquipoActivo]} onPress={() => setEquipoSeleccionado('visitante')}>
                  <Text style={[styles.chipTexto, equipoSeleccionado === 'visitante' && styles.chipTextoActivo]}>{partido.equipo_visitante}</Text>
                </TouchableOpacity>
              )}
            </View>

            {config?.resultados && (
              <>
                <Text style={styles.etiquetaSeccion}>Resultado</Text>
                <View style={styles.selectorEquipo}>
                  {config.resultados.map((r) => (
                    <TouchableOpacity key={r} style={[styles.chipEquipo, resultadoSeleccionado === r && styles.chipEquipoActivo]} onPress={() => setResultadoSeleccionado(r)}>
                      <Text style={[styles.chipTexto, resultadoSeleccionado === r && styles.chipTextoActivo]}>{ETIQUETA_RESULTADO[r]}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {modalTipo === 'cambio' ? (
              <>
                <Text style={styles.etiquetaSeccion}>Sale</Text>
                <SelectorJugadores jugadores={enCampoEquipo} seleccionado={jugadorSaleSeleccionado} onSeleccionar={setJugadorSaleSeleccionado} vacioTexto="Nadie en el campo todavía" />
                <Text style={styles.etiquetaSeccion}>Entra</Text>
                <SelectorJugadores jugadores={banquilloEquipo} seleccionado={jugadorSeleccionado} onSeleccionar={setJugadorSeleccionado} vacioTexto="No quedan suplentes" />
              </>
            ) : esRival ? (
              <>
                <Text style={styles.etiquetaSeccion}>
                  Dorsal del rival {!config?.necesitaJugador ? '(opcional)' : ''}
                </Text>
                {numerosRivalUsados.length > 0 && (
                  <>
                    <Text style={styles.ayudaDorsal}>Ya apuntados en este partido:</Text>
                    <View style={styles.cuadriculaDorsales}>
                      {numerosRivalUsados.map((n) => (
                        <TouchableOpacity
                          key={`usado-${n}`}
                          style={[styles.botonDorsal, styles.botonDorsalUsado, dorsalRivalSeleccionado === String(n) && styles.botonDorsalActivo]}
                          onPress={() => setDorsalRivalSeleccionado(String(n))}
                        >
                          <Text style={[styles.botonDorsalTexto, dorsalRivalSeleccionado === String(n) && styles.botonDorsalTextoActivo]}>{n}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}
                <View style={styles.cuadriculaDorsales}>
                  {Array.from({ length: 30 }, (_, i) => i + 1).map((n) => (
                    <TouchableOpacity
                      key={n}
                      style={[styles.botonDorsal, dorsalRivalSeleccionado === String(n) && styles.botonDorsalActivo]}
                      onPress={() => { setDorsalRivalSeleccionado(String(n)); setMostrarOtroDorsal(false); }}
                    >
                      <Text style={[styles.botonDorsalTexto, dorsalRivalSeleccionado === String(n) && styles.botonDorsalTextoActivo]}>{n}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity style={[styles.botonDorsal, styles.botonDorsalOtro]} onPress={() => setMostrarOtroDorsal((v) => !v)}>
                    <Text style={styles.botonDorsalTexto}>31+</Text>
                  </TouchableOpacity>
                </View>
                {mostrarOtroDorsal && (
                  <View style={styles.filaOtroDorsal}>
                    <TextInput
                      style={styles.inputDorsalRival}
                      placeholder="Nº"
                      placeholderTextColor="#9ca3af"
                      keyboardType="numeric"
                      value={dorsalRivalSeleccionado}
                      onChangeText={(t) => setDorsalRivalSeleccionado(t.replace(/[^0-9]/g, ''))}
                      maxLength={3}
                      returnKeyType="done"
                      onSubmitEditing={() => { Keyboard.dismiss(); setMostrarOtroDorsal(false); }}
                    />
                    <TouchableOpacity style={styles.botonListo} onPress={() => { Keyboard.dismiss(); setMostrarOtroDorsal(false); }}>
                      <Text style={styles.botonListoTexto}>Listo</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {dorsalRivalSeleccionado !== '' && !mostrarOtroDorsal && (
                  <Text style={styles.dorsalElegido}>Elegido: rival #{dorsalRivalSeleccionado}</Text>
                )}
              </>
            ) : (
              <>
                <Text style={styles.etiquetaSeccion}>
                  Jugador {!config?.necesitaJugador ? '(opcional)' : ''}
                </Text>
                <SelectorJugadores jugadores={enCampoEquipo} seleccionado={jugadorSeleccionado} onSeleccionar={setJugadorSeleccionado} vacioTexto="Nadie en el campo todavía" />
              </>
            )}

            {!!editando && (
              <TouchableOpacity style={styles.botonEliminarEvento} onPress={() => borrarEvento(editando.id)}>
                <Text style={styles.botonEliminarEventoTexto}>🗑 Eliminar este evento</Text>
              </TouchableOpacity>
            )}
            <View style={styles.modalBotones}>
              <TouchableOpacity style={styles.botonCancelar} onPress={() => { Keyboard.dismiss(); setModalTipo(null); setEditando(null); }}>
                <Text style={styles.botonCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.botonConfirmar, !puedeConfirmar() && styles.botonDeshabilitado]} onPress={confirmarEvento} disabled={!puedeConfirmar() || enviandoEvento}>
                {enviandoEvento ? <ActivityIndicator color="#fff" /> : <Text style={styles.botonConfirmarTexto}>Guardar</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={modalFinalVisible} transparent animationType="fade">
        <View style={styles.modalFondoCentrado}>
          <View style={styles.modalCajaCentral}>
            <Text style={styles.modalTitulo}>Finalizar partido</Text>
            <Text style={styles.ayudaDorsal}>
              ¿En qué minuto ha terminado? Con este dato se calculan los minutos jugados de cada jugador.
            </Text>
            <StepperMinuto valor={minutoFinalElegido} onCambiar={setMinutoFinalElegido} />
            <View style={styles.modalBotones}>
              <TouchableOpacity style={styles.botonCancelar} onPress={() => setModalFinalVisible(false)}>
                <Text style={styles.botonCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.botonConfirmar, { backgroundColor: '#dc2626' }]} onPress={finalizarConfirmado}>
                <Text style={styles.botonConfirmarTexto}>Finalizar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function StepperMinuto({ valor, onCambiar }) {
  return (
    <View style={styles.stepper}>
      <TouchableOpacity style={styles.stepperBoton} onPress={() => onCambiar(Math.max(1, valor - 5))}>
        <Text style={styles.stepperBotonTexto}>−5</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.stepperBoton} onPress={() => onCambiar(Math.max(1, valor - 1))}>
        <Text style={styles.stepperBotonTexto}>−1</Text>
      </TouchableOpacity>
      <Text style={styles.stepperValor}>{valor}'</Text>
      <TouchableOpacity style={styles.stepperBoton} onPress={() => onCambiar(valor + 1)}>
        <Text style={styles.stepperBotonTexto}>+1</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.stepperBoton} onPress={() => onCambiar(valor + 5)}>
        <Text style={styles.stepperBotonTexto}>+5</Text>
      </TouchableOpacity>
    </View>
  );
}

function SelectorJugadores({ jugadores, seleccionado, onSeleccionar, vacioTexto }) {
  if (jugadores.length === 0) return <Text style={styles.listaVaciaModal}>{vacioTexto}</Text>;
  return (
    <View style={styles.listaJugadoresModal}>
      {[...jugadores].sort((a, b) => (a.dorsal ?? 999) - (b.dorsal ?? 999)).map((j) => (
        <TouchableOpacity key={j.id} style={[styles.chipDorsalModal, seleccionado?.id === j.id && styles.chipJugadorModalActivo]} onPress={() => onSeleccionar(j)}>
          <Text style={[styles.chipDorsalTexto, seleccionado?.id === j.id && styles.chipTextoActivo]}>{j.dorsal != null && j.dorsal !== '' ? j.dorsal : (j.apodo || j.nombre || '?').slice(0, 3)}</Text>
        </TouchableOpacity>
      ))}
      {seleccionado ? <Text style={styles.dorsalElegido}>Elegido: #{seleccionado.dorsal ?? '–'} {seleccionado.apodo || nombreCompleto(seleccionado)}</Text> : null}
    </View>
  );
}

function ConvocatoriaTab({ convocatoria, partido, puedeCambiar, onCambiar }) {
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const titulares = convocatoria.filter((c) => c.titular);
  const suplentes = convocatoria.filter((c) => !c.titular);
  const capitan = convocatoria.find((c) => c.capitan);

  // Mensaje para el GRUPO DE JUGADORES: solo quién está convocado,
  // ordenado por dorsal, sin desvelar titulares/suplentes (eso se
  // decide más tarde, cerca del partido).
  const construirTextoWhatsApp = () => {
    const fecha = new Date(partido.fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    const hora = new Date(partido.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    const convocados = [...convocatoria].sort((a, b) => (a.jugador.dorsal || 999) - (b.jugador.dorsal || 999));

    let texto = `📋 Convocatoria — ${partido.equipo_local} vs ${partido.equipo_visitante}\n`;
    texto += `🗓️ ${fecha}, ${hora}h\n`;
    texto += `📍 ${partido.lugar}\n`;

    if (partido.hora_citacion) {
      texto += `\n🕐 Citación: `;
      // En casa el sitio de citación es el propio campo; fuera, se indica aparte.
      if (!partido.es_local && partido.lugar_citacion) texto += `${partido.lugar_citacion}, `;
      texto += `${partido.hora_citacion.slice(0, 5)}h\n`;
    }

    texto += `\nConvocados:\n`;
    texto += convocados.map((c) => `#${c.jugador.dorsal ?? '-'} ${nombreCompleto(c.jugador)}`).join('\n') || '(sin confirmar)';
    return texto;
  };

  const compartirConvocatoriaWhatsApp = () => compartirWhatsApp(construirTextoWhatsApp());

  // PDF para el ÁRBITRO: titulares y suplentes separados, con dorsal,
  // nombre y apellidos, y el capitán marcado.
  const filaJugadorPdf = (c) =>
    `<tr><td>${c.jugador.dorsal ?? '-'}</td><td>${nombreCompleto(c.jugador)}${c.capitan ? ' (C)' : ''}</td></tr>`;

  const generarPdfArbitro = async () => {
    setGenerandoPdf(true);
    const html = `
      <html>
        <body style="font-family: -apple-system, sans-serif; padding: 24px;">
          <h2>${partido.equipo_local} vs ${partido.equipo_visitante}</h2>
          <p>${partido.lugar}</p>
          ${capitan ? `<p><strong>Capitán:</strong> #${capitan.jugador.dorsal ?? '-'} ${nombreCompleto(capitan.jugador)}</p>` : ''}

          <h3>Titulares</h3>
          <table style="width:100%; border-collapse: collapse;" border="1" cellpadding="6">
            <tr><th>Dorsal</th><th>Nombre y apellidos</th></tr>
            ${titulares.map(filaJugadorPdf).join('') || '<tr><td colspan="2">Sin confirmar</td></tr>'}
          </table>

          <h3>Suplentes</h3>
          <table style="width:100%; border-collapse: collapse;" border="1" cellpadding="6">
            <tr><th>Dorsal</th><th>Nombre y apellidos</th></tr>
            ${suplentes.map(filaJugadorPdf).join('') || '<tr><td colspan="2">Sin confirmar</td></tr>'}
          </table>
        </body>
      </html>
    `;
    await generarDocumento(html, 'el PDF del árbitro');
    setGenerandoPdf(false);
  };

  return (
    <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 10 }}>
      {puedeCambiar && (
        <TouchableOpacity style={styles.botonCambiarConvocatoria} onPress={onCambiar}>
          <Text style={styles.botonCambiarConvocatoriaTexto}>✏️ Cambiar la convocatoria (bajas, titulares, capitán)</Text>
        </TouchableOpacity>
      )}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
        <TouchableOpacity style={[styles.botonCompartir, { flex: 1, marginBottom: 0 }]} onPress={compartirConvocatoriaWhatsApp}>
          <Text style={styles.botonCompartirTexto}>💬 WhatsApp jugadores</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.botonPdfArbitro, { flex: 1 }]} onPress={generarPdfArbitro} disabled={generandoPdf}>
          {generandoPdf ? <ActivityIndicator color="#374151" /> : <Text style={styles.botonPdfArbitroTexto}>📄 PDF árbitro</Text>}
        </TouchableOpacity>
      </View>
      {capitan && <Text style={styles.textoCapitan}>👑 Capitán: #{capitan.jugador.dorsal ?? '-'} {nombreCompleto(capitan.jugador)}</Text>}

      <FlatList
        data={[{ key: 'contenido' }]}
        keyExtractor={(item) => item.key}
        renderItem={() => (
          <View>
            <Text style={styles.tituloResumen}>Titulares ({titulares.length})</Text>
            {titulares.map((c) => (
              <View key={c.id} style={styles.filaConvocatoria}>
                <Text style={styles.nombreJugadorMinutos}>
                  #{c.jugador.dorsal ?? '-'} {nombreCompleto(c.jugador)} {c.capitan ? '👑' : ''}
                </Text>
              </View>
            ))}
            <Text style={styles.tituloResumen}>Suplentes ({suplentes.length})</Text>
            {suplentes.map((c) => (
              <View key={c.id} style={styles.filaConvocatoria}>
                <Text style={styles.nombreJugadorMinutos}>#{c.jugador.dorsal ?? '-'} {nombreCompleto(c.jugador)}</Text>
              </View>
            ))}
            {convocatoria.length === 0 && <Text style={styles.listaVacia}>Todavía no hay convocatoria guardada</Text>}
          </View>
        )}
      />
    </View>
  );
}

function ResumenPartido({ eventos, convocatoria, minutoActual, golesLocal, golesVisitante, partido, finalizado, descanso, puedeCorregir, onCorregirMinutoFinal, manuales, puedeEditarMinutos, onGuardarMinuto }) {
  const [editMin, setEditMin] = useState(null); // { id, texto }
  const [generandoInforme, setGenerandoInforme] = useState(false);
  const [minutoCorregido, setMinutoCorregido] = useState(minutoActual);

  const contar = (tipo, equipo, filtroResultado) =>
    eventos.filter((e) => e.tipo === tipo && e.equipo === equipo && (!filtroResultado || filtroResultado(e.resultado))).length;

  const minutos = calcularMinutosJugados(convocatoria, eventos, minutoActual, manuales);
  const dorsalDe = Object.fromEntries(convocatoria.map((c) => [c.jugador.id, c.jugador.dorsal]));

  // Estadísticas de los dos equipos (para la pestaña y para el informe en PDF).
  const aPuerta = (r) => r === 'gol' || r === 'parada';
  const estadisticas = [
    { etiqueta: 'Goles', local: golesLocal, visitante: golesVisitante },
    { etiqueta: 'Tiros', local: contar('tiro', 'local'), visitante: contar('tiro', 'visitante') },
    { etiqueta: 'Tiros a puerta', local: contar('tiro', 'local', aPuerta), visitante: contar('tiro', 'visitante', aPuerta) },
    { etiqueta: 'Córners', local: contar('corner', 'local'), visitante: contar('corner', 'visitante') },
    { etiqueta: 'Faltas cometidas', local: contar('falta', 'local'), visitante: contar('falta', 'visitante') },
    { etiqueta: 'Amarillas', local: contar('amarilla', 'local'), visitante: contar('amarilla', 'visitante') },
    { etiqueta: 'Rojas', local: contar('roja', 'local'), visitante: contar('roja', 'visitante') },
    { etiqueta: 'Cambios', local: contar('cambio', 'local'), visitante: contar('cambio', 'visitante') },
  ];
  const marcaNuestro = (lado) => ((lado === 'local') === Boolean(partido.es_local) ? ' (nuestro equipo)' : '');

  const nombreEquipo = (equipo) => (equipo === 'local' ? partido.equipo_local : partido.equipo_visitante);
  const descripcionEventoPdf = (e) => {
    const quien = e.tipo === 'cambio'
      ? `Entra ${e.jugador_entra || '—'} / Sale ${e.jugador_sale || '—'}`
      : e.jugador || (e.dorsal_rival ? `Rival #${e.dorsal_rival}` : '');
    const resultado = e.resultado ? ` (${ETIQUETA_RESULTADO[e.resultado] || e.resultado})` : '';
    return `${e.minuto}' — ${CONFIG_TIPO[e.tipo]?.etiqueta || e.tipo} · ${nombreEquipo(e.equipo)}${resultado}${quien ? ' · ' + quien : ''}`;
  };

  const generarInforme = async () => {
    setGenerandoInforme(true);
    const eventosOrdenadosPdf = [...eventos].sort((a, b) => a.minuto - b.minuto);
    const html = `
        <html>
          <body style="font-family: -apple-system, sans-serif; padding: 24px;">
            <h2>${partido.equipo_local} ${golesLocal} - ${golesVisitante} ${partido.equipo_visitante}${descanso ? ' (descanso)' : ''}</h2>
            <p>${partido.lugar} · ${new Date(partido.fecha).toLocaleDateString('es-ES')}</p>

            <h3>${descanso ? 'Estadísticas de la primera parte' : 'Estadísticas del partido'}</h3>
            <table style="width:100%; border-collapse: collapse; text-align:center;" border="1" cellpadding="6">
              <tr><th>${partido.equipo_local}${marcaNuestro('local')}</th><th></th><th>${partido.equipo_visitante}${marcaNuestro('visitante')}</th></tr>
              ${estadisticas.map((f) => `<tr><td>${f.local}</td><td>${f.etiqueta}</td><td>${f.visitante}</td></tr>`).join('')}
            </table>

            <h3>${descanso ? 'Eventos de la primera parte' : 'Eventos del partido'}</h3>
            <ul>
              ${eventosOrdenadosPdf.map((e) => `<li>${descripcionEventoPdf(e)}</li>`).join('') || '<li>Sin eventos</li>'}
            </ul>

            <h3>Minutos jugados (nuestro equipo)</h3>
            <table style="width:100%; border-collapse: collapse;" border="1" cellpadding="6">
              <tr><th>Jugador</th><th>Titular</th><th>Minutos</th></tr>
              ${minutos.map((j) => `<tr><td>${j.nombre}</td><td>${j.titular ? 'Sí' : 'No'}</td><td>${j.jugo ? j.minutosJugados + "'" : 'No jugó'}</td></tr>`).join('')}
            </table>
          </body>
        </html>
      `;
    await generarDocumento(html, descanso ? 'el informe del descanso' : 'el informe');
    setGenerandoInforme(false);
  };

  return (
    <FlatList
      style={styles.lista}
      data={[{ key: 'contenido' }]}
      keyExtractor={(item) => item.key}
      renderItem={() => (
        <View>
          {finalizado && puedeCorregir && (
            <View style={styles.cajaCorreccion}>
              <Text style={styles.tituloResumen}>Minuto final del partido</Text>
              <Text style={styles.ayudaDorsal}>Si los minutos jugados no salen bien, corrige aquí en qué minuto terminó.</Text>
              <StepperMinuto valor={minutoCorregido} onCambiar={setMinutoCorregido} />
              <TouchableOpacity style={styles.botonGuardarMinuto} onPress={() => onCorregirMinutoFinal(minutoCorregido)}>
                <Text style={styles.botonGuardarMinutoTexto}>Guardar minuto final</Text>
              </TouchableOpacity>
            </View>
          )}

          {descanso && <Text style={styles.avisoCorreccion}>Descanso: este es el resumen de la primera parte.</Text>}
          {(finalizado || descanso) && (
            <TouchableOpacity style={styles.botonInforme} onPress={generarInforme} disabled={generandoInforme}>
              {generandoInforme ? <ActivityIndicator color="#fff" /> : <Text style={styles.botonInformeTexto}>{descanso ? '📄 Informe del descanso (estadísticas, eventos y minutos)' : '📄 Informe final (estadísticas, eventos y minutos)'}</Text>}
            </TouchableOpacity>
          )}

          <View style={styles.tablaStats}>
            <View style={styles.filaStat}>
              <Text style={[styles.filaStatValor, { fontSize: 12 }]} numberOfLines={1}>{partido.equipo_local}{marcaNuestro('local') ? ' ★' : ''}</Text>
              <Text style={styles.filaStatEtiqueta} />
              <Text style={[styles.filaStatValor, { fontSize: 12 }]} numberOfLines={1}>{partido.equipo_visitante}{marcaNuestro('visitante') ? ' ★' : ''}</Text>
            </View>
            {estadisticas.map((f) => <FilaStat key={f.etiqueta} etiqueta={f.etiqueta} izq={f.local} der={f.visitante} />)}
          </View>

          <Text style={styles.tituloResumen}>Minutos jugados</Text>
          {puedeEditarMinutos && minutos.length > 0 && <Text style={styles.ayudaDorsal}>Toca los minutos de un jugador para corregirlos a mano.</Text>}
          {minutos.map((j) => (
            <View key={j.id} style={[styles.filaMinutos, { alignItems: 'center' }]}>
              <Text style={styles.nombreJugadorMinutos}>{dorsalDe[j.id] != null ? `${dorsalDe[j.id]} · ` : ''}{j.nombre} {j.titular ? '' : '(susp.)'}</Text>
              {editMin && editMin.id === j.id ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TextInput style={styles.inputMinutoManual} keyboardType="number-pad" inputMode="numeric" maxLength={3} autoFocus value={editMin.texto} onChangeText={(t) => setEditMin({ id: j.id, texto: t.replace(/\D/g, '') })} />
                  <TouchableOpacity style={styles.botonMinutoOk} onPress={() => { onGuardarMinuto(j.id, editMin.texto === '' ? null : Math.min(130, Number(editMin.texto))); setEditMin(null); }}><Text style={{ color: '#fff', fontWeight: '700' }}>OK</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => setEditMin(null)}><Text style={{ marginLeft: 8, color: '#6b7280' }}>✕</Text></TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity disabled={!puedeEditarMinutos} onPress={() => setEditMin({ id: j.id, texto: j.jugo ? String(j.minutosJugados) : '' })}>
                  <Text style={styles.valorMinutos}>{j.manual ? '✎ ' : ''}{j.jugo ? `${j.minutosJugados}'` : 'No jugó'}{puedeEditarMinutos ? ' ✏️' : ''}</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
          {puedeEditarMinutos && Object.keys(manuales || {}).length > 0 && <Text style={styles.ayudaDorsal}>✎ = minutos puestos a mano. Para volver al cálculo automático, borra el número y pulsa OK.</Text>}
          {minutos.length === 0 && <Text style={styles.listaVacia}>No hay convocatoria guardada para este partido</Text>}
        </View>
      )}
    />
  );
}

function FilaStat({ etiqueta, izq, der }) {
  return (
    <View style={styles.filaStat}>
      <Text style={styles.filaStatValor}>{izq}</Text>
      <Text style={styles.filaStatEtiqueta}>{etiqueta}</Text>
      <Text style={styles.filaStatValor}>{der}</Text>
    </View>
  );
}

function BotonEvento({ emoji, texto, onPress }) {
  return (
    <TouchableOpacity style={styles.botonEvento} onPress={onPress}>
      <Text style={styles.botonEventoEmoji}>{emoji}</Text>
      <Text style={styles.botonEventoTexto}>{texto}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#f8fafc' },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  error: { color: '#dc2626', textAlign: 'center', padding: 20 },
  marcador: {
    flexDirection: 'row', backgroundColor: '#ffffff', paddingTop: 20, paddingBottom: 22, paddingHorizontal: 12,
    alignItems: 'center', borderBottomWidth: 1, borderColor: '#e5e7eb',
  },
  equipoMarcador: { flex: 1 },
  nombreEquipo: { color: '#374151', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  resultado: { alignItems: 'center', paddingHorizontal: 12 },
  goles: { color: '#111827', fontSize: 32, fontWeight: '800' },
  reloj: { color: '#16a34a', fontSize: 15, marginTop: 2, fontWeight: '700', fontVariant: ['tabular-nums'] },
  parte: { color: '#9ca3af', fontSize: 12, marginTop: 2 },
  controles: { flexDirection: 'row', justifyContent: 'center', marginTop: 14, marginBottom: 4 },
  botonControl: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  botonControlTexto: { color: '#fff', fontWeight: '700', fontSize: 14 },
  botonVerde: { backgroundColor: '#16a34a' },
  botonGris: { backgroundColor: '#4b5563' },
  botonRojo: { backgroundColor: '#dc2626' },
  finalizadoTexto: { fontSize: 15, color: '#6b7280', fontWeight: '600', paddingVertical: 10 },
  botonActualizar: { marginHorizontal: 16, marginTop: 14, paddingVertical: 10, borderRadius: 8, backgroundColor: '#e5e7eb', alignItems: 'center' },
  botonActualizarTexto: { color: '#374151', fontWeight: '700', fontSize: 13 },
  botonera: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', paddingVertical: 14, backgroundColor: '#ffffff', marginTop: 10, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#e5e7eb' },
  botonEvento: { alignItems: 'center', width: '16%', marginBottom: 6 },
  botonEventoEmoji: { fontSize: 22 },
  botonEventoTexto: { fontSize: 10, color: '#374151', marginTop: 2, fontWeight: '600', textAlign: 'center' },
  selectorVista: { flexDirection: 'row', gap: 4, paddingHorizontal: 12, paddingTop: 10 },
  chipVista: { flex: 1, minWidth: 0, paddingVertical: 9, paddingHorizontal: 2, borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  chipVistaActivo: { backgroundColor: '#111827', borderColor: '#111827' },
  chipVistaTexto: { fontSize: 12, fontWeight: '600', color: '#374151', textAlign: 'center' },
  chipVistaTextoActivo: { color: '#fff' },
  lista: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },
  listaVacia: { textAlign: 'center', color: '#9ca3af', marginTop: 30 },
  filaEvento: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 10, padding: 12, marginBottom: 8 },
  minutoEvento: { fontWeight: '700', color: '#111827', width: 36 },
  iconoEvento: { fontSize: 18, marginRight: 10 },
  tipoEvento: { fontSize: 13, fontWeight: '600', color: '#111827' },
  detalleEvento: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  inputDorsalRival: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: '#111827', marginTop: 4, marginBottom: 8, width: 120 },
  avisoCorreccion: { fontSize: 11, color: '#6b7280', textAlign: 'center', marginTop: 8, paddingHorizontal: 20 },
  ayudaDorsal: { fontSize: 12, color: '#6b7280', marginBottom: 8, marginTop: 2 },
  cuadriculaDorsales: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  botonDorsal: { width: 46, height: 46, borderRadius: 23, borderWidth: 1.5, borderColor: '#d1d5db', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  botonDorsalUsado: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  botonDorsalActivo: { backgroundColor: '#111827', borderColor: '#111827' },
  botonDorsalOtro: { backgroundColor: '#f3f4f6' },
  botonDorsalTexto: { fontSize: 15, fontWeight: '700', color: '#374151' },
  botonDorsalTextoActivo: { color: '#fff' },
  filaOtroDorsal: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  botonListo: { backgroundColor: '#16a34a', borderRadius: 8, paddingHorizontal: 18, paddingVertical: 12 },
  botonListoTexto: { color: '#fff', fontWeight: '700' },
  dorsalElegido: { fontSize: 13, fontWeight: '700', color: '#16a34a', marginBottom: 6, width: '100%' },
  modalFondoCentrado: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  modalCajaCentral: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginVertical: 10 },
  stepperBoton: { minWidth: 46, paddingVertical: 12, borderRadius: 10, backgroundColor: '#f3f4f6', alignItems: 'center' },
  stepperBotonTexto: { fontWeight: '800', color: '#374151', fontSize: 14 },
  stepperValor: { fontSize: 26, fontWeight: '800', color: '#111827', minWidth: 64, textAlign: 'center' },
  cajaCorreccion: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 16, marginBottom: 16 },
  botonGuardarMinuto: { backgroundColor: '#16a34a', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  botonGuardarMinutoTexto: { color: '#fff', fontWeight: '700', fontSize: 13 },
  botonCambiarConvocatoria: { backgroundColor: '#eff6ff', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginBottom: 12 },
  botonCambiarConvocatoriaTexto: { color: '#2563eb', fontWeight: '700', fontSize: 12 },
  botonInforme: { backgroundColor: '#111827', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginBottom: 16 },
  botonInformeTexto: { color: '#fff', fontWeight: '700', fontSize: 13 },
  modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContenido: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, maxHeight: '85%' },
  modalTitulo: { fontSize: 17, fontWeight: '700', marginBottom: 16, color: '#111827' },
  etiquetaSeccion: { fontSize: 12, fontWeight: '700', color: '#6b7280', marginTop: 4, marginBottom: 8, textTransform: 'uppercase' },
  selectorEquipo: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  chipEquipo: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db', alignItems: 'center' },
  chipEquipoActivo: { backgroundColor: '#111827', borderColor: '#111827' },
  chipTexto: { color: '#374151', fontWeight: '600' },
  chipTextoActivo: { color: '#ffffff' },
  listaJugadoresModal: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  inputMinutoManual: { width: 56, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8, textAlign: 'center', fontSize: 15, backgroundColor: '#fff' },
  botonMinutoOk: { backgroundColor: '#16a34a', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, marginLeft: 8 },
  chipDorsalModal: { minWidth: 52, height: 48, paddingHorizontal: 8, borderRadius: 12, borderWidth: 1, borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  chipDorsalTexto: { fontSize: 20, fontWeight: '800', color: '#111827' },
  editarEvento: { fontSize: 16, marginLeft: 8, alignSelf: 'center' },
  botonEliminarEvento: { borderWidth: 1, borderColor: '#dc2626', borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 10 },
  botonEliminarEventoTexto: { color: '#dc2626', fontWeight: '700' },
  chipJugadorModal: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: '#d1d5db' },
  chipJugadorModalActivo: { backgroundColor: '#111827', borderColor: '#111827' },
  listaVaciaModal: { fontSize: 12, color: '#9ca3af', marginBottom: 8 },
  modalBotones: { flexDirection: 'row', gap: 10, marginTop: 10 },
  botonCancelar: { flex: 1, paddingVertical: 14, borderRadius: 8, backgroundColor: '#f3f4f6', alignItems: 'center' },
  botonCancelarTexto: { color: '#374151', fontWeight: '600' },
  botonConfirmar: { flex: 1, paddingVertical: 14, borderRadius: 8, backgroundColor: '#16a34a', alignItems: 'center' },
  botonDeshabilitado: { backgroundColor: '#9ca3af' },
  botonConfirmarTexto: { color: '#fff', fontWeight: '700' },
  tablaStats: { backgroundColor: '#ffffff', borderRadius: 10, padding: 14, marginBottom: 18 },
  filaStat: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#f3f4f6' },
  filaStatValor: { width: 90, textAlign: 'center', fontWeight: '700', color: '#111827' },
  filaStatEtiqueta: { flex: 1, textAlign: 'center', fontSize: 12, color: '#6b7280' },
  tituloResumen: { fontSize: 14, fontWeight: '700', color: '#111827', marginTop: 8, marginBottom: 8 },
  botonCompartir: { backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginBottom: 16 },
  botonCompartirTexto: { color: '#fff', fontWeight: '700', fontSize: 14 },
  filaConvocatoria: { backgroundColor: '#ffffff', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 6 },
  botonPdfArbitro: { backgroundColor: '#f3f4f6', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  botonPdfArbitroTexto: { color: '#374151', fontWeight: '700', fontSize: 13 },
  textoCapitan: { fontSize: 13, color: '#92400e', fontWeight: '700', marginBottom: 14, textAlign: 'center' },
  filaMinutos: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#ffffff', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 6 },
  nombreJugadorMinutos: { fontSize: 13, color: '#111827' },
  valorMinutos: { fontSize: 13, fontWeight: '700', color: '#111827' },
});

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, TextInput, Keyboard, ActivityIndicator, Alert } from 'react-native';
import { BLOQUES_ENTRENADOR, BLOQUE_FINAL, bloqueDeTarea, posturasEstiramiento, TIPOS_SESION, GRUPOS_PRIMER_ENTRENO, bloqueConGrupos, repartirTareasPorGrupo } from '../data/planSesion';
import { confirmar } from '../data/confirmar';
import BibliotecaTareas from './BibliotecaTareas';
import ProgramaEditable from './ProgramaEditable';
import { programaDe, tiemposRueda, minutosRueda, CLAVE_PROG } from '../data/programaSesion';
import { CAMPOS_PERFIL } from '../data/semana';
import { OBJETIVOS, formatoTarea, textoDimensiones, segundosDe, formatoDuracion } from '../data/tareas';

const ROLES_ENTRENADOR = ['entrenador', 'segundo_entrenador'];

// Plan de la sesión. El preventivo y la movilidad son del preparador físico y
// son un programa por tipo de entreno (se aplica a todas las semanas). Los
// demás bloques los rellena el entrenador/segundo para cada sesión.
export default function PlanSesion({ entrenamiento, tipo, detectado, manual, plantillas, errorPlan, rol, tareas, jugadoresGrupo, onAbrirTarea, onCambiarTipo, onGuardarPlantilla, onGuardarBloques, onGuardarSemana, onCargarBiblioteca, onAnadirDeBiblioteca, onBorrarDeBiblioteca, onCargarTareasPlantilla, onGuardarSesionComoPlantilla }) {
  const puedePF = rol === 'preparador_fisico';
  const puedeEntrenador = ROLES_ENTRENADOR.includes(rol);
  const puedeTipo = puedePF || puedeEntrenador;
  const plantilla = plantillas.find((p) => p.numero === tipo);
  const bloques = entrenamiento.bloques || {};
  const puedeApagar = puedePF || puedeEntrenador; // apagar preventivo o movilidad solo en esta sesión
  const programa = programaDe(entrenamiento, plantilla);
  const guardarProg = (tipoProg) => (lista) => onGuardarBloques({ [CLAVE_PROG[tipoProg]]: lista });
  const guardarProgPlantilla = (tipoProg) => async (lista) => {
    if (lista.length === 0) throw new Error('La sugerencia necesita al menos un elemento.');
    if (tipoProg === 'rueda') await onGuardarSemana(tipo, { ...(semana || {}), tareas: (semana && semana.tareas) || [], postas: lista });
    else await onGuardarPlantilla(tipo, { [tipoProg]: lista });
  };
  const preventivoOff = bloques.preventivo_activa === false;
  const movilidadOff = bloques.movilidad_activa === false;

  const [edicion, setEdicion] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [biblio, setBiblio] = useState({ visible: false, bloque: null, titulo: '', objetivo: null, items: null, error: '' });

  const abrirBiblioteca = async (bloque, objetivo) => {
    setBiblio({ visible: true, bloque: bloque.clave, titulo: `Biblioteca · ${bloque.titulo}`, objetivo: objetivo || null, items: null, error: '' });
    try {
      const items = await onCargarBiblioteca();
      setBiblio((b) => ({ ...b, items }));
    } catch (err) {
      setBiblio((b) => ({ ...b, error: err.message || 'No se pudo cargar la biblioteca' }));
    }
  };

  const elegirDeBiblioteca = async (item) => {
    try {
      await onAnadirDeBiblioteca(biblio.bloque, item);
      setBiblio((b) => ({ ...b, visible: false }));
    } catch (err) {
      Alert.alert('No se pudo añadir', err.message);
    }
  };

  const borrarDeBiblioteca = (item) => {
    confirmar('Quitar de la biblioteca', `¿Quitar "${item.nombre}" de la biblioteca? Las sesiones que ya la usan no cambian.`, async () => {
      try {
        await onBorrarDeBiblioteca(item);
        setBiblio((b) => ({ ...b, items: (b.items || []).filter((x) => x.id !== item.id) }));
      } catch (err) {
        Alert.alert('No se pudo quitar', err.message);
      }
    }, 'Quitar');
  };

  const cerrar = () => {
    Keyboard.dismiss();
    setEdicion(null);
  };

  const cambiarValor = (campo, texto) => setEdicion((e) => ({ ...e, valores: { ...e.valores, [campo]: texto } }));

  const semana = plantilla ? plantilla.semana : null;
  const abrirPerfil = () => {
    setEdicion({
      tipo: 'perfil',
      titulo: `Perfil del Entreno ${tipo}`,
      nota: `Se aplica a todos los Entreno ${tipo}.`,
      campos: CAMPOS_PERFIL,
      valores: Object.fromEntries(CAMPOS_PERFIL.map((c) => [c.clave, (semana && semana[c.clave]) || ''])),
    });
  };

  const cargarPlantilla = () => {
    const n = (semana?.tareas || []).length;
    const hay = (tareas || []).length;
    confirmar(
      'Cargar las tareas de la plantilla',
      `Se añadirán hasta ${n} tareas del Entreno ${tipo} a esta sesión${hay ? ` (ya tiene ${hay}; las que se llamen igual en el mismo bloque no se repiten)` : ''}. Después se pueden editar una a una.`,
      async () => {
        try {
          const r = await onCargarTareasPlantilla(tipo);
          Alert.alert('Plantilla cargada', r.creadas ? `Se han añadido ${r.creadas} tareas.${r.repetidas ? ` ${r.repetidas} ya estaban.` : ''}` : 'No había nada nuevo que añadir: todas ya estaban en la sesión.');
        } catch (err) {
          Alert.alert('No se pudo cargar del todo', err.message);
        }
      },
      'Cargar',
    );
  };

  const guardarComoPlantilla = () => {
    confirmar(
      'Guardar como plantilla',
      `Las ${(tareas || []).length} tareas de esta sesión pasarán a ser la plantilla de todos los Entreno ${tipo}. Sustituye a la que hay ahora (sin jugadores asignados).`,
      async () => {
        try {
          await onGuardarSesionComoPlantilla(tipo);
          Alert.alert('Plantilla guardada', `Ya es la plantilla de los Entreno ${tipo}.`);
        } catch (err) {
          Alert.alert('No se pudo guardar', err.message);
        }
      },
      'Guardar',
    );
  };

  const abrirBloque = (bloque) => {
    setEdicion({
      tipo: 'bloque', clave: bloque.clave,
      titulo: bloque.titulo,
      nota: 'Solo para esta sesión.',
      campos: [{ clave: 'contenido', etiqueta: 'Qué se va a hacer', multilinea: true }],
      valores: { contenido: bloques[bloque.clave] || '' },
    });
  };

  const completo = edicion ? edicion.campos.every((c) => !c.obligatorio || (edicion.valores[c.clave] || '').trim().length > 0) : false;

  const guardar = async () => {
    if (!completo || guardando) return;
    setGuardando(true);
    try {
      const v = Object.fromEntries(Object.entries(edicion.valores).map(([k, x]) => [k, x.trim()]));
      if (edicion.tipo === 'perfil') {
        await onGuardarSemana(tipo, { ...(semana || {}), tareas: (semana && semana.tareas) || [], ...v });
      } else {
        await onGuardarBloques({ [edicion.clave]: v.contenido || null });
      }
      cerrar();
    } catch (err) {
      Alert.alert('No se pudo guardar', err.message);
    } finally {
      setGuardando(false);
    }
  };

  const alternarBloque = async (clave) => {
    try {
      await onGuardarBloques({ [`${clave}_activa`]: bloques[`${clave}_activa`] === false });
    } catch (err) {
      Alert.alert('No se pudo guardar', err.message);
    }
  };

  const elegirTipo = async (n) => {
    if (!puedeTipo) return;
    try {
      await onCambiarTipo(n === detectado ? null : n);
    } catch (err) {
      Alert.alert('No se pudo cambiar', err.message);
    }
  };

  const tarjetaTarea = (bloqueClave) => (t) => (
                <TouchableOpacity key={t.id} style={styles.tarea} onPress={() => onAbrirTarea(bloqueClave, t)} activeOpacity={0.7}>
                  <Text style={styles.tareaNombre} numberOfLines={2}>{t.nombre}</Text>
                  <Text style={styles.tareaFormato}>{formatoTarea(t)} · {textoDimensiones(t)}</Text>
                  <View style={styles.tareaPie}>
                    {t.objetivo && OBJETIVOS[t.objetivo] && (
                      <View style={styles.tareaChip}><Text style={styles.tareaChipTexto}>{OBJETIVOS[t.objetivo].corto}</Text></View>
                    )}
                    <Text style={styles.tareaTrabajo}>{t.series} × {formatoDuracion(segundosDe(t))}{t.pausa_seg ? ` · pausa ${t.pausa_seg}s` : ''}</Text>
                  </View>
                </TouchableOpacity>
              );

  if (errorPlan) {
    return (
      <>
        <Text style={styles.tituloSeccion}>Plan de la sesión</Text>
        <Text style={styles.vacio}>
          No se ha podido cargar el plan de la sesión. El resto de esta pantalla funciona con normalidad. Vuelve a entrar en unos minutos; si sigue igual, avisa.
        </Text>
      </>
    );
  }

  return (
    <>
      <Text style={styles.tituloSeccion}>Plan de la sesión</Text>

      <Text style={styles.deteccion}>{manual ? '✏️ Tipo elegido a mano' : '🔎 Tipo detectado por la fecha (orden dentro de la semana)'}</Text>
      <View style={styles.filaTipos}>
        {TIPOS_SESION.map((n) => (
          <TouchableOpacity
            key={n}
            disabled={!puedeTipo}
            style={[styles.chipTipo, tipo === n && styles.chipTipoActivo]}
            onPress={() => elegirTipo(n)}
          >
            <Text style={[styles.chipTipoTexto, tipo === n && styles.chipTipoTextoActivo]}>Entreno {n}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {manual && puedeTipo && (
        <TouchableOpacity onPress={() => onCambiarTipo(null).catch((e) => Alert.alert('No se pudo cambiar', e.message))}>
          <Text style={styles.enlace}>Volver al automático (Entreno {detectado})</Text>
        </TouchableOpacity>
      )}

      {(
        <>
          {!plantilla && <Text style={styles.vacio}>Todavía no hay programa de preparación física para el Entreno {tipo}. Puedes añadir ejercicios solo para esta sesión.</Text>}
          <View style={styles.cabeceraBloque}>
            <Text style={[styles.subtitulo, { flex: 1, marginTop: 0, marginBottom: 0 }]}>1. Trabajo preventivo neuromuscular · 15' (4 estaciones en circuito, 3' cada una)</Text>
            {puedeApagar && (
              <TouchableOpacity style={[styles.interruptor, !preventivoOff && styles.interruptorActivo]} onPress={() => alternarBloque('preventivo')}>
                <Text style={styles.interruptorTexto}>{preventivoOff ? 'OFF' : 'ON'}</Text>
              </TouchableOpacity>
            )}
          </View>
          {preventivoOff && <Text style={styles.vacio}>Desactivado en esta sesión: no se hace preventivo.</Text>}
          {!preventivoOff && (
            <ProgramaEditable
              tipo="preventivo" lista={programa.preventivo} propio={programa.propioPrev} puedeEditar={puedeApagar}
              puedePlantilla={puedePF && !!plantilla} numeroEntreno={tipo}
              onGuardarSesion={guardarProg('preventivo')} onGuardarPlantilla={guardarProgPlantilla('preventivo')}
            />
          )}

          <View style={styles.cabeceraBloque}>
            <Text style={[styles.subtitulo, { flex: 1, marginTop: 0, marginBottom: 0 }]}>2. Movilidad dinámica integrada · 5' (2 filas a 10 metros)</Text>
            {puedeApagar && (
              <TouchableOpacity style={[styles.interruptor, !movilidadOff && styles.interruptorActivo]} onPress={() => alternarBloque('movilidad')}>
                <Text style={styles.interruptorTexto}>{movilidadOff ? 'OFF' : 'ON'}</Text>
              </TouchableOpacity>
            )}
          </View>
          {movilidadOff && <Text style={styles.vacio}>Desactivada en esta sesión.</Text>}
          {!movilidadOff && (
            <ProgramaEditable
              tipo="movilidad" lista={programa.movilidad} propio={programa.propioMov} puedeEditar={puedeApagar}
              puedePlantilla={puedePF && !!plantilla} numeroEntreno={tipo}
              onGuardarSesion={guardarProg('movilidad')} onGuardarPlantilla={guardarProgPlantilla('movilidad')}
            />
          )}
          <Text style={styles.pie}>
            {puedeApagar ? `Toca un ejercicio para cambiarlo, o usa ▲ ▼ 🗑 y ＋. Los cambios valen solo para esta sesión${puedePF ? `; al editar puedes guardarlos para todos los Entreno ${tipo}` : ''}.` : 'Lo gestiona el preparador físico.'}
          </Text>
        </>
      )}

      {semana && (
        <View style={styles.perfil}>
          <TouchableOpacity activeOpacity={0.7} disabled={!puedeTipo} onPress={abrirPerfil}>
            <Text style={styles.perfilTitulo}>Perfil del día · Entreno {tipo}</Text>
            {CAMPOS_PERFIL.map((c) => !!semana[c.clave] && (
              <Text key={c.clave} style={styles.perfilLinea}><Text style={styles.perfilEtiqueta}>{c.etiqueta}: </Text>{semana[c.clave]}</Text>
            ))}
            {puedeTipo && <Text style={styles.perfilPie}>Toca para editar el perfil</Text>}
          </TouchableOpacity>
        </View>
      )}
      {puedeEntrenador && tareas !== null && !!semana && (semana.tareas || []).length > 0 && (
        <TouchableOpacity style={styles.accion} onPress={cargarPlantilla}>
          <Text style={styles.accionTexto}>⬇  Cargar las {semana.tareas.length} tareas de la plantilla del Entreno {tipo}</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.subtitulo}>3. Trabajo del entrenador (esta sesión)</Text>
      {BLOQUES_ENTRENADOR.map((b) => {
        const apagado = b.conInterruptor && bloques[`${b.clave}_activa`] === false;
        const tareasDelBloque = (tareas || []).filter((t) => bloqueDeTarea(t) === b.clave);
        const conGrupos = bloqueConGrupos(tipo, b.clave);
        const repartidas = repartirTareasPorGrupo(tareasDelBloque);
        return (
          <React.Fragment key={b.clave}>
          <TouchableOpacity
            style={[styles.bloque, apagado && { opacity: 0.5 }]}
            disabled={!puedeEntrenador || apagado}
            onPress={() => abrirBloque(b)}
            activeOpacity={0.7}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.zona}>{b.titulo}{b.clave === 'rueda_perfiles' ? ` · ${minutosRueda(programa.rueda.length, tiemposRueda(entrenamiento).posta, tiemposRueda(entrenamiento).rotacion)}'` : b.duracion ? ` · ${b.duracion}'` : ''}</Text>
              <Text style={styles.ejercicio} numberOfLines={3}>
                {apagado ? 'Desactivada en esta sesión' : bloques[b.clave] || (puedeEntrenador ? 'Toca para rellenar' : 'Sin rellenar todavía')}
              </Text>
            </View>
            {b.conInterruptor && puedeEntrenador && (
              <TouchableOpacity style={[styles.interruptor, !apagado && styles.interruptorActivo]} onPress={() => alternarBloque(b.clave)}>
                <Text style={styles.interruptorTexto}>{apagado ? 'OFF' : 'ON'}</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          {b.clave === 'rueda_perfiles' && !apagado && (
            <View style={styles.tareasBloque}>
              <ProgramaEditable
                tipo="rueda" lista={programa.rueda} propio={programa.propioRueda} puedeEditar={puedeEntrenador}
                puedePlantilla={puedeTipo && !!semana} numeroEntreno={tipo}
                tiempos={tiemposRueda(entrenamiento)} onCambiarTiempos={(c) => onGuardarBloques(c)}
                onGuardarSesion={guardarProg('rueda')} onGuardarPlantilla={guardarProgPlantilla('rueda')}
              />
              <Text style={styles.grupoNota}>El tiempo de la rueda depende de las postas: cada posta dura lo que pongas y entre postas hay rotación.</Text>
            </View>
          )}

          {tareas !== null && !apagado && (
            <View style={styles.tareasBloque}>
              {conGrupos ? (
                <>
                  {GRUPOS_PRIMER_ENTRENO.map((g) => {
                    const nombres = jugadoresGrupo ? jugadoresGrupo[g.clave] : null;
                    return (
                      <View key={g.clave} style={styles.grupo}>
                        <Text style={styles.grupoTitulo}>{g.titulo}</Text>
                        <Text style={styles.grupoCriterio}>
                          {g.criterio}{nombres ? ` · ${nombres.length} jugadores` : ' · sin partido anterior registrado: no se puede calcular quién va en cada grupo'}
                        </Text>
                        {g.clave === 'compensacion' && jugadoresGrupo && jugadoresGrupo.noConvocados.length > 0 && (
                          <Text style={styles.grupoNota}>Incluye {jugadoresGrupo.noConvocados.length} no convocado(s), que cuentan 0'.</Text>
                        )}
                        {repartidas[g.clave].map(tarjetaTarea(b.clave))}
                        {puedeEntrenador && (
                          <View style={styles.filaAnadir}>
                            <TouchableOpacity style={[styles.tareaAnadir, { flex: 1 }]} onPress={() => onAbrirTarea(b.clave, null, g.clave)}>
                              <Text style={styles.tareaAnadirTexto}>+ Nueva tarea de {g.titulo.toLowerCase()}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.tareaAnadir, { flex: 1 }]} onPress={() => abrirBiblioteca(b, g.clave)}>
                              <Text style={styles.tareaAnadirTexto}>📚 Desde la biblioteca</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    );
                  })}
                  {repartidas.otras.length > 0 && (
                    <>
                      <Text style={styles.grupoNota}>Sin grupo (su objetivo no es Recuperación ni Compensación):</Text>
                      {repartidas.otras.map(tarjetaTarea(b.clave))}
                    </>
                  )}
                </>
              ) : (
                <>
                  {tareasDelBloque.map(tarjetaTarea(b.clave))}
                  {puedeEntrenador && (
                    <View style={styles.filaAnadir}>
                      <TouchableOpacity style={[styles.tareaAnadir, { flex: 1 }]} onPress={() => onAbrirTarea(b.clave, null)}>
                        <Text style={styles.tareaAnadirTexto}>+ Nueva tarea</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.tareaAnadir, { flex: 1 }]} onPress={() => abrirBiblioteca(b, null)}>
                        <Text style={styles.tareaAnadirTexto}>📚 Desde la biblioteca</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}
            </View>
          )}
          </React.Fragment>
        );
      })}

      <View style={styles.bloque} testID="bloque-estiramientos">
        <View style={{ flex: 1 }}>
          <Text style={styles.zona}>{BLOQUE_FINAL.titulo} · {BLOQUE_FINAL.duracion}'</Text>
          {(() => {
            const est = posturasEstiramiento(semana && semana.estiramientos);
            if (!est) return <Text style={styles.ejercicio}>{(semana && semana.estiramientos) || 'Última tarea de todos los entrenos'}</Text>;
            return (
              <>
                {est.posturas.map((x, i) => <Text key={i} style={styles.ejercicio}>{i + 1}. {x}</Text>)}
                {!!est.nota && <Text style={styles.grupoNota}>{est.nota}</Text>}
              </>
            );
          })()}
        </View>
      </View>

      {puedeEntrenador && tareas !== null && tareas.length > 0 && !!plantilla && (
        <TouchableOpacity style={styles.accionSecundaria} onPress={guardarComoPlantilla}>
          <Text style={styles.accionSecundariaTexto}>⬆  Guardar las tareas de esta sesión como plantilla del Entreno {tipo}</Text>
        </TouchableOpacity>
      )}

      <BibliotecaTareas
        visible={biblio.visible}
        titulo={biblio.titulo}
        items={biblio.items}
        error={biblio.error}
        objetivoInicial={biblio.objetivo}
        puedeBorrar={puedeEntrenador}
        onElegir={elegirDeBiblioteca}
        onBorrar={borrarDeBiblioteca}
        onCerrar={() => setBiblio((b) => ({ ...b, visible: false }))}
      />

      {/* Cuadro de edición pegado ARRIBA y con los botones arriba también:
          así el teclado nunca los tapa. */}
      <Modal visible={edicion !== null} transparent animationType="fade">
        <View style={styles.fondoModal}>
          <ScrollView style={styles.cajaModal} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 8 }}>
            {edicion && (
              <>
                <View style={styles.cabeceraModal}>
                  <TouchableOpacity onPress={cerrar}><Text style={styles.cancelar}>Cancelar</Text></TouchableOpacity>
                  <Text style={styles.tituloModal} numberOfLines={1}>{edicion.titulo}</Text>
                  <TouchableOpacity onPress={guardar} disabled={!completo || guardando}>
                    {guardando ? <ActivityIndicator color="#16a34a" /> : <Text style={[styles.guardar, !completo && { color: '#9ca3af' }]}>Guardar</Text>}
                  </TouchableOpacity>
                </View>
                <Text style={styles.notaModal}>{edicion.nota}</Text>
                {edicion.campos.map((c) => (
                  <View key={c.clave}>
                    <Text style={styles.etiqueta}>{c.etiqueta}</Text>
                    <TextInput
                      style={[styles.input, c.multilinea && styles.inputMultilinea]}
                      value={edicion.valores[c.clave]}
                      onChangeText={(t) => cambiarValor(c.clave, t)}
                      multiline={!!c.multilinea}
                      maxLength={c.multilinea ? 1500 : 160}
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                ))}
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  tituloSeccion: { fontSize: 14, fontWeight: '700', color: '#111827', marginTop: 24, marginBottom: 8 },
  deteccion: { fontSize: 11, color: '#9ca3af', fontWeight: '600', marginBottom: 8 },
  filaTipos: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  chipTipo: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#fff', alignItems: 'center' },
  chipTipoActivo: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  chipTipoTexto: { fontSize: 12, fontWeight: '700', color: '#6b7280' },
  chipTipoTextoActivo: { color: '#fff' },
  enlace: { fontSize: 11, color: '#2563eb', fontWeight: '700', marginBottom: 6 },
  vacio: { fontSize: 12, color: '#6b7280', backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', padding: 14, marginTop: 8 },
  subtitulo: { fontSize: 12, fontWeight: '700', color: '#6b7280', marginTop: 16, marginBottom: 8 },
  estacion: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#ddd6fe', padding: 14, marginBottom: 8 },
  numero: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center', marginRight: 12, marginTop: 2 },
  numeroTexto: { color: '#fff', fontWeight: '800', fontSize: 13 },
  tramo: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#bfdbfe', padding: 14, marginBottom: 8 },
  tiempo: { backgroundColor: '#2563eb', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, marginRight: 12, marginTop: 1 },
  tiempoTexto: { color: '#fff', fontWeight: '800', fontSize: 11 },
  tareasBloque: { marginLeft: 14, marginTop: -2, marginBottom: 10, paddingLeft: 10, borderLeftWidth: 3, borderLeftColor: '#ddd6fe' },
  tarea: { backgroundColor: '#faf5ff', borderRadius: 10, borderWidth: 1, borderColor: '#e9d5ff', padding: 12, marginBottom: 6 },
  tareaNombre: { fontSize: 13, fontWeight: '800', color: '#111827' },
  tareaFormato: { fontSize: 12, color: '#6d28d9', fontWeight: '700', marginTop: 3 },
  tareaPie: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  tareaChip: { backgroundColor: '#ede9fe', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  tareaChipTexto: { fontSize: 10, fontWeight: '700', color: '#6d28d9' },
  tareaTrabajo: { fontSize: 11, color: '#6b7280' },
  grupo: { borderWidth: 1, borderStyle: 'dashed', borderColor: '#a78bfa', borderRadius: 10, padding: 8, marginBottom: 8 },
  grupoTitulo: { fontSize: 13, fontWeight: '800', color: '#6d28d9' },
  grupoCriterio: { fontSize: 11, color: '#6b7280', marginBottom: 6 },
  grupoNota: { fontSize: 11, color: '#92400e', marginBottom: 6 },
  perfil: { backgroundColor: '#f5f3ff', borderRadius: 12, borderWidth: 1, borderColor: '#ddd6fe', padding: 14, marginTop: 16 },
  perfilTitulo: { fontSize: 13, fontWeight: '800', color: '#5b21b6', marginBottom: 6 },
  perfilLinea: { fontSize: 12, color: '#374151', lineHeight: 18, marginTop: 2 },
  perfilEtiqueta: { fontWeight: '700', color: '#6d28d9' },
  perfilPie: { fontSize: 10, color: '#9ca3af', marginTop: 8 },
  accion: { backgroundColor: '#7c3aed', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 12, alignItems: 'center', marginTop: 10 },
  accionTexto: { color: '#fff', fontWeight: '800', fontSize: 12, textAlign: 'center' },
  accionSecundaria: { borderRadius: 10, borderWidth: 1.5, borderColor: '#c4b5fd', paddingVertical: 11, paddingHorizontal: 12, alignItems: 'center', marginTop: 8, backgroundColor: '#fff' },
  accionSecundariaTexto: { color: '#6d28d9', fontWeight: '700', fontSize: 12, textAlign: 'center' },
  filaAnadir: { flexDirection: 'row', gap: 8 },
  tareaAnadir: { borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db', borderStyle: 'dashed', paddingVertical: 9, alignItems: 'center', backgroundColor: '#fff' },
  tareaAnadirTexto: { color: '#7c3aed', fontSize: 11, fontWeight: '700' },
  bloque: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 14, marginBottom: 8 },
  zona: { fontSize: 13, fontWeight: '800', color: '#111827' },
  ejercicio: { fontSize: 12, color: '#4b5563', marginTop: 3, lineHeight: 17 },
  series: { fontSize: 12, color: '#7c3aed', fontWeight: '700', marginTop: 6 },
  pie: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  cabeceraBloque: { flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 8 },
  interruptor: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: '#e5e7eb', marginLeft: 8 },
  interruptorActivo: { backgroundColor: '#16a34a' },
  interruptorTexto: { fontSize: 10, fontWeight: '800', color: '#fff' },
  fondoModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-start', paddingTop: 50, paddingHorizontal: 16 },
  cajaModal: { backgroundColor: '#fff', borderRadius: 16, padding: 18, maxHeight: '80%' },
  cabeceraModal: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  tituloModal: { flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '800', color: '#111827', marginHorizontal: 8 },
  cancelar: { color: '#6b7280', fontWeight: '700', fontSize: 14 },
  guardar: { color: '#16a34a', fontWeight: '800', fontSize: 14 },
  notaModal: { fontSize: 11, color: '#7c3aed', fontWeight: '600', marginBottom: 4 },
  etiqueta: { fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 6, marginTop: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#111827' },
  inputMultilinea: { height: 120, textAlignVertical: 'top' },
});

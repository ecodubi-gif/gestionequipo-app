import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import { elegirPdf } from '../data/leerPdf';
import { useFocusEffect } from '@react-navigation/native';
import { obtenerUsuario, obtenerLigaApi, guardarClasificacionApi, guardarNotaRivalApi, obtenerScoutingApi, listarPartidosApi } from '../data/apiClient';
import Formacion from '../components/Formacion';
import { resumenInforme, estaVacio, jugadoresPorTipo, TIPOS_JUGADOR, progreso } from '../data/scouting';
import { MI_EQUIPO, fechasCerradas, parsearClasificacion, fichaRival, partidosDe, mismoEquipo, totales } from '../data/liga';

const ROLES_EDITAR = ['entrenador', 'segundo_entrenador'];
const ROLES_VER_SCOUTING = ['entrenador', 'segundo_entrenador', 'preparador_fisico'];
const COLOR_MARCA = { G: '#16a34a', E: '#9ca3af', P: '#dc2626' };
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const fechaLarga = (iso) => {
  const d = new Date(`${iso}T12:00:00`);
  return `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}`;
};
// Nombre más corto para las tablas: quita las siglas de club (C.D., C.F., S.A.D., U.D. …) y las palabras de relleno.
const RELLENO = new Set(['C.D.', 'C.F.', 'S.A.D.', 'U.D.', 'P.D.', 'A.D.', 'CLUB', 'DE', 'FÚTBOL', 'FUTBOL', 'BALOMPIE']);
const corto = (n) => {
  const t = n.split(/\s+/).map((x) => x.replace(/,$/, '')).filter((x) => !RELLENO.has(x.toUpperCase()));
  return t.length ? t.join(' ') : n;
};

function Racha({ marcas }) {
  if (!marcas || marcas.length === 0) return <Text style={styles.mini}>Sin partidos aún</Text>;
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {marcas.map((m, i) => (
        <View key={i} style={[styles.marca, { backgroundColor: COLOR_MARCA[m] }]}><Text style={styles.marcaTexto}>{m}</Text></View>
      ))}
    </View>
  );
}

export default function LigaScreen({ navigation }) {
  const [usuario, setUsuario] = useState(null);
  const [liga, setLiga] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [pestana, setPestana] = useState('rival');
  const [pegando, setPegando] = useState(false);
  const [texto, setTexto] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [nota, setNota] = useState(null); // null = sin cambios
  const [guardandoNota, setGuardandoNota] = useState(false);
  const [scouting, setScouting] = useState({});
  const [cerradas, setCerradas] = useState([]); // fechas de partidos ya finalizados en la app

  const cargar = useCallback(async () => {
    setError('');
    try {
      const [u, l, ps] = await Promise.all([obtenerUsuario(), obtenerLigaApi(), listarPartidosApi().catch(() => [])]);
      setCerradas(fechasCerradas(ps));
      setUsuario(u);
      setLiga(l);
      // El informe de scouting solo lo ve el cuerpo técnico; si falla, la liga se ve igual.
      if (u && ROLES_VER_SCOUTING.includes(u.role)) {
        try { setScouting(await obtenerScoutingApi()); } catch (e) { setScouting({}); }
      } else setScouting({});
    } catch (err) {
      setError(err.message || 'No se pudo cargar la liga');
    } finally {
      setCargando(false);
    }
  }, []);
  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const puedeEditar = usuario && ROLES_EDITAR.includes(usuario.role);
  const hoy = hoyISO();
  const filas = liga?.clasificacion?.filas || [];
  const ficha = useMemo(
    () => (liga ? fichaRival({ filas, anterior: liga.anterior?.filas || null, calendario: liga.calendario, hoy, cerradas }) : null),
    [liga, filas, hoy, cerradas]
  );
  const [leyendoPdf, setLeyendoPdf] = useState(false);
  const [errorPdf, setErrorPdf] = useState('');
  const lectura = useMemo(() => parsearClasificacion(texto), [texto]);

  const subirPdf = async () => {
    setErrorPdf('');
    setLeyendoPdf(true);
    try {
      const t = await elegirPdf();
      if (t) setTexto(t);
    } catch (err) {
      setErrorPdf(err.message || 'No se pudo leer el PDF');
    } finally {
      setLeyendoPdf(false);
    }
  };

  const guardarClasificacion = async () => {
    setGuardando(true);
    try {
      await guardarClasificacionApi(lectura.filas, hoy);
      setPegando(false);
      setTexto('');
      await cargar();
    } catch (err) {
      Alert.alert('No se pudo guardar', err.message);
    } finally {
      setGuardando(false);
    }
  };

  const guardarNota = async () => {
    if (!ficha) return;
    setGuardandoNota(true);
    try {
      await guardarNotaRivalApi(ficha.proximo.rival, nota);
      setNota(null);
      await cargar();
    } catch (err) {
      Alert.alert('No se pudo guardar la nota', err.message);
    } finally {
      setGuardandoNota(false);
    }
  };

  if (cargando) return <View style={styles.centrado}><ActivityIndicator size="large" color="#16a34a" /></View>;
  if (error) {
    return (
      <View style={styles.centrado}>
        <Text style={styles.error}>{error}</Text>
        <TouchableOpacity style={styles.boton} onPress={() => { setCargando(true); cargar(); }}><Text style={styles.botonTexto}>Reintentar</Text></TouchableOpacity>
      </View>
    );
  }

  const proximo = ficha?.proximo;
  const t = ficha?.rival ? totales(ficha.rival) : null;
  const notasVisibles = liga.notas !== undefined && liga.notas !== null;
  const notaGuardada = (proximo && liga.notas && liga.notas[proximo.rival]) || '';
  const miFila = filas.find((f) => mismoEquipo(f.equipo, MI_EQUIPO));

  const crearPartido = (p) => navigation.navigate('DatosPartido', {
    previo: { local: p.local, visitante: p.visitante, fecha: p.fecha, esLocal: p.esLocal },
  });

  return (
    <View style={styles.contenedor}>
      <View style={styles.pestanas}>
        {[['rival', 'Próximo rival'], ['tabla', 'Clasificación'], ['calendario', 'Calendario']].map(([k, n]) => (
          <TouchableOpacity key={k} style={[styles.pestana, pestana === k && styles.pestanaActiva]} onPress={() => setPestana(k)}>
            <Text style={[styles.pestanaTexto, pestana === k && styles.pestanaTextoActiva]}>{n}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View style={styles.actualizada}>
          <Text style={styles.mini}>
            {liga.clasificacion ? `Clasificación del ${fechaLarga(liga.clasificacion.fecha)}` : 'Todavía no hay clasificación guardada'}
          </Text>
          {puedeEditar && (
            <TouchableOpacity onPress={() => setPegando(!pegando)}>
              <Text style={styles.enlace}>{pegando ? 'Cancelar' : '⟳ Actualizar clasificación'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {pegando && (
          <View style={styles.tarjeta}>
            <Text style={styles.titulo}>Clasificación de la federación</Text>
            {Platform.OS === 'web' && (
              <TouchableOpacity style={[styles.boton, { marginTop: 10 }, leyendoPdf && { opacity: 0.5 }]} disabled={leyendoPdf} onPress={subirPdf} testID="liga-pdf">
                <Text style={styles.botonTexto}>{leyendoPdf ? 'Leyendo el PDF…' : '📄 Subir el PDF de la federación'}</Text>
              </TouchableOpacity>
            )}
            {errorPdf ? <Text style={styles.aviso}>{errorPdf}</Text> : null}
            <Text style={[styles.mini, { marginTop: 10 }]}>O pega la tabla a mano:</Text>
            <Text style={styles.mini}>Copia la clasificación entera de la web y pégala aquí tal cual. La sanción no se tiene en cuenta salvo que ya venga en los puntos.</Text>
            <TextInput
              style={styles.areaPegar}
              multiline
              value={texto}
              onChangeText={setTexto}
              placeholder="Pega aquí la tabla…"
              placeholderTextColor="#9ca3af"
              testID="liga-pegar"
            />
            {texto.trim().length > 0 && (
              <>
                <Text style={[styles.mini, { color: lectura.filas.length ? '#15803d' : '#dc2626', fontWeight: '700' }]}>
                  {lectura.filas.length} equipos leídos
                </Text>
                {lectura.avisos.map((a, i) => <Text key={i} style={styles.aviso}>{a}</Text>)}
              </>
            )}
            <TouchableOpacity
              style={[styles.boton, (lectura.filas.length === 0 || guardando) && { opacity: 0.4 }]}
              disabled={lectura.filas.length === 0 || guardando}
              onPress={guardarClasificacion}
              testID="liga-guardar"
            >
              <Text style={styles.botonTexto}>{guardando ? 'Guardando…' : 'Guardar clasificación'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ---------- Próximo rival ---------- */}
        {pestana === 'rival' && (
          !proximo ? <Text style={styles.vacio}>No queda ningún partido en el calendario.</Text> : (
            <View>
              <View style={styles.tarjeta}>
                <Text style={styles.mini}>Jornada {proximo.jornada} · {fechaLarga(proximo.fecha)} · {proximo.esLocal ? 'en casa' : 'fuera'}</Text>
                <Text style={styles.rival}>{proximo.rival}</Text>
                {ficha.rival ? (
                  <View style={{ marginTop: 10, gap: 12 }}>
                    <View style={styles.fila}>
                      <View style={styles.dato}>
                        <Text style={styles.datoNumero}>{ficha.rival.pos}º</Text>
                        <Text style={styles.mini}>
                          puesto{ficha.cambioPuesto ? ` ${ficha.cambioPuesto > 0 ? '▲' : '▼'}${Math.abs(ficha.cambioPuesto)}` : ''}
                        </Text>
                      </View>
                      <View style={styles.dato}><Text style={styles.datoNumero}>{ficha.rival.pts}</Text><Text style={styles.mini}>puntos</Text></View>
                      <View style={styles.dato}><Text style={styles.datoNumero}>{t.j}</Text><Text style={styles.mini}>jugados</Text></View>
                      <View style={styles.dato}><Text style={styles.datoNumero}>{t.g}-{t.e}-{t.p}</Text><Text style={styles.mini}>G-E-P</Text></View>
                    </View>

                    <View>
                      <Text style={styles.etiqueta}>Últimos 5 (el más reciente a la derecha)</Text>
                      <Racha marcas={ficha.rival.ultimos} />
                    </View>

                    {ficha.rival.casa && ficha.rival.fuera ? (
                    <View style={styles.fila}>
                        <View style={[styles.sede, ficha.sede === 'casa' && styles.sedeActiva]}>
                          <Text style={styles.etiqueta}>En casa{ficha.sede === 'casa' ? ' · lo que importa' : ''}</Text>
                          <Text style={styles.sedeTexto}>{ficha.rival.casa.g}G {ficha.rival.casa.e}E {ficha.rival.casa.p}P</Text>
                          <Text style={styles.mini}>en {ficha.rival.casa.j} partidos</Text>
                        </View>
                        <View style={[styles.sede, ficha.sede === 'fuera' && styles.sedeActiva]}>
                          <Text style={styles.etiqueta}>Fuera{ficha.sede === 'fuera' ? ' · lo que importa' : ''}</Text>
                          <Text style={styles.sedeTexto}>{ficha.rival.fuera.g}G {ficha.rival.fuera.e}E {ficha.rival.fuera.p}P</Text>
                          <Text style={styles.mini}>en {ficha.rival.fuera.j} partidos</Text>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.fila}>
                        <View style={styles.sede}>
                          <Text style={styles.etiqueta}>En total</Text>
                          <Text style={styles.sedeTexto}>{totales(ficha.rival).g}G {totales(ficha.rival).e}E {totales(ficha.rival).p}P</Text>
                          <Text style={styles.mini}>en {totales(ficha.rival).j} partidos</Text>
                        </View>
                      </View>
                    )}

                    <Text style={styles.texto}>
                      Goles: {ficha.rival.f} a favor y {ficha.rival.c} en contra
                      {ficha.golesPorPartido ? ` (${ficha.golesPorPartido.f} y ${ficha.golesPorPartido.c} por partido)` : ''}.
                    </Text>
                    {ficha.mia && (
                      <Text style={styles.texto}>
                        Nosotros: {ficha.mia.pos}º con {ficha.mia.pts} puntos.{' '}
                        {ficha.diferenciaPuntos === 0 ? 'Mismos puntos que ellos.' : ficha.diferenciaPuntos > 0 ? `Ellos nos sacan ${ficha.diferenciaPuntos}.` : `Les sacamos ${-ficha.diferenciaPuntos}.`}
                      </Text>
                    )}
                    {ficha.rival.sancion > 0 && <Text style={styles.aviso}>Tiene {ficha.rival.sancion} puntos de sanción.</Text>}
                  </View>
                ) : (
                  <Text style={styles.vacio}>Todavía no tengo la clasificación de este equipo. Actualiza la clasificación.</Text>
                )}
              </View>

              {usuario && ROLES_VER_SCOUTING.includes(usuario.role) && (() => {
                const inf = scouting[proximo.rival];
                const hay = inf && !estaVacio(inf);
                const p = progreso(inf);
                return (
                  <View style={styles.tarjeta} testID="scouting-card">
                    <Text style={styles.titulo}>🔎 Scouting de {corto(proximo.rival)}</Text>
                    {!hay && <Text style={[styles.mini, { marginTop: 6 }]}>Todavía no hay informe de este rival.</Text>}
                    {hay && (
                      <View style={{ marginTop: 8, gap: 10 }}>
                        <Text style={styles.mini}>
                          {p.hechos} de {p.total} campos{inf.editado_por ? ` · ${inf.editado_por}` : ''}{inf.actualizado ? ` · ${fechaLarga(inf.actualizado.slice(0, 10))}` : ''}
                        </Text>
                        {resumenInforme(inf).map((s) => (
                          <View key={s.id}>
                            <Text style={styles.etiqueta}>{s.icono} {s.titulo}</Text>
                            {s.id === 'sistema' && s.lineas.some((l) => l.formacion) && (
                              <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap', marginVertical: 8 }}>
                                {[['dibujo', 'Inicio'], ['dibujo_ataque', 'Con balón'], ['dibujo_defensa', 'Sin balón']].map(([id, n]) => {
                                  const l = s.lineas.find((x) => x.id === id);
                                  return l ? <Formacion key={id} texto={l.valor} etiqueta={n} ancho={74} /> : null;
                                })}
                              </View>
                            )}
                            {s.lineas.map((l, i) => (
                              <View key={l.id}>
                                {l.grupo && (i === 0 || s.lineas[i - 1].grupo !== l.grupo) ? <Text style={[styles.mini, { fontWeight: '800', marginTop: 6, textTransform: 'uppercase' }]}>{l.grupo}</Text> : null}
                                <Text style={styles.texto}><Text style={{ fontWeight: '700' }}>{l.etiqueta}: </Text>{l.valor}</Text>
                              </View>
                            ))}
                          </View>
                        ))}
                        {TIPOS_JUGADOR.map((tp) => {
                          const js = jugadoresPorTipo(inf, tp.id);
                          if (js.length === 0) return null;
                          return (
                            <View key={tp.id}>
                              <Text style={[styles.etiqueta, { color: tp.color }]}>{tp.etiqueta}</Text>
                              {js.map((j, i) => (
                                <Text key={i} style={styles.texto}>{j.dorsal ? `#${j.dorsal} ` : ''}{j.nombre}{j.nota ? ` · ${j.nota}` : ''}</Text>
                              ))}
                            </View>
                          );
                        })}
                      </View>
                    )}
                    {hay && (
                      <TouchableOpacity onPress={() => navigation.navigate('ScoutingHistorial', { equipo: proximo.rival })} style={{ alignSelf: 'center', marginTop: 10 }} testID="scouting-historial">
                        <Text style={styles.enlace}>🕘 Ver el historial de cambios</Text>
                      </TouchableOpacity>
                    )}
                    {puedeEditar && (
                      <TouchableOpacity style={[styles.boton, { backgroundColor: '#7c3aed' }]} onPress={() => navigation.navigate('Scouting', { equipo: proximo.rival, informe: inf || null })} testID="scouting-editar">
                        <Text style={styles.botonTexto}>{hay ? '✏️ Editar el informe' : '📝 Rellenar el informe'}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })()}

              {notasVisibles && (
                <View style={styles.tarjeta}>
                  <Text style={styles.titulo}>Aspectos clave de {corto(proximo.rival)}</Text>
                  <TextInput
                    style={styles.areaNota}
                    multiline
                    editable={Boolean(puedeEditar)}
                    value={nota === null ? notaGuardada : nota}
                    onChangeText={setNota}
                    placeholder={puedeEditar ? 'Cómo juegan, jugadores clave, a balón parado…' : 'Sin notas'}
                    placeholderTextColor="#9ca3af"
                    maxLength={2000}
                  />
                  {puedeEditar && nota !== null && nota !== notaGuardada && (
                    <TouchableOpacity style={[styles.boton, guardandoNota && { opacity: 0.4 }]} disabled={guardandoNota} onPress={guardarNota}>
                      <Text style={styles.botonTexto}>{guardandoNota ? 'Guardando…' : 'Guardar nota'}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {puedeEditar && (
                <TouchableOpacity style={[styles.boton, { backgroundColor: '#111827' }]} onPress={() => crearPartido(proximo)}>
                  <Text style={styles.botonTexto}>Crear el partido de la jornada {proximo.jornada}</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        )}

        {/* ---------- Clasificación ---------- */}
        {pestana === 'tabla' && (
          filas.length === 0 ? <Text style={styles.vacio}>Todavía no hay clasificación guardada.</Text> : (
            <View style={styles.tabla}>
              <View style={[styles.filaTabla, styles.cabeceraTabla]}>
                <Text style={[styles.celda, styles.cPos]}>#</Text>
                <Text style={[styles.celda, styles.cNombre]}>Equipo</Text>
                <Text style={[styles.celda, styles.cNum]}>Pt</Text>
                <Text style={[styles.celda, styles.cNum]}>J</Text>
                <Text style={[styles.celda, styles.cGoles]}>GF-GC</Text>
                <Text style={[styles.celda, styles.cRacha]}>Racha</Text>
              </View>
              {filas.map((f) => {
                const esMio = mismoEquipo(f.equipo, MI_EQUIPO);
                const esRival = proximo && mismoEquipo(f.equipo, proximo.rival);
                return (
                  <View key={f.equipo} style={[styles.filaTabla, esMio && styles.filaMia, esRival && styles.filaRival]}>
                    <Text style={[styles.celda, styles.cPos]}>{f.pos}</Text>
                    <Text style={[styles.celda, styles.cNombre, (esMio || esRival) && { fontWeight: '800' }]} numberOfLines={1}>{corto(f.equipo)}</Text>
                    <Text style={[styles.celda, styles.cNum, { fontWeight: '800' }]}>{f.pts}</Text>
                    <Text style={[styles.celda, styles.cNum]}>{totales(f).j}</Text>
                    <Text style={[styles.celda, styles.cGoles]}>{f.f}-{f.c}</Text>
                    <View style={styles.cRacha}>
                      <View style={{ flexDirection: 'row', gap: 2 }}>
                        {f.ultimos.map((m, i) => <View key={i} style={[styles.punto, { backgroundColor: COLOR_MARCA[m] }]} />)}
                      </View>
                    </View>
                  </View>
                );
              })}
              <Text style={[styles.mini, { padding: 10 }]}>Verde = nosotros · amarillo = próximo rival. Racha: del más antiguo al más reciente.</Text>
            </View>
          )
        )}

        {/* ---------- Calendario ---------- */}
        {pestana === 'calendario' && (
          <View style={{ gap: 8 }}>
            {partidosDe(liga.calendario, MI_EQUIPO).map((p) => {
              const pasado = p.fecha < hoy || cerradas.includes(p.fecha);
              const esSiguiente = proximo && p.jornada === proximo.jornada;
              return (
                <View key={p.jornada} style={[styles.partido, esSiguiente && styles.partidoSiguiente, pasado && { opacity: 0.55 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.mini}>J{p.jornada} · {fechaLarga(p.fecha)} · {p.esLocal ? 'casa' : 'fuera'}</Text>
                    <Text style={styles.partidoRival} numberOfLines={1}>{p.esLocal ? 'vs' : '@'} {p.rival}</Text>
                  </View>
                  {puedeEditar && !pasado && (
                    <TouchableOpacity style={styles.botonPequeno} onPress={() => crearPartido(p)}>
                      <Text style={styles.botonPequenoTexto}>Crear</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}
        {!miFila && filas.length > 0 && <Text style={styles.aviso}>No encuentro a {MI_EQUIPO} en la clasificación.</Text>}
      </ScrollView>
    </View>
  );
}

const VERDE = '#16a34a';
const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#f8fafc' },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#f8fafc' },
  error: { color: '#dc2626', marginBottom: 12, textAlign: 'center' },
  pestanas: { flexDirection: 'row', gap: 6, padding: 12, paddingBottom: 0 },
  pestana: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#e5e7eb', alignItems: 'center' },
  pestanaActiva: { backgroundColor: '#111827' },
  pestanaTexto: { fontSize: 12, fontWeight: '700', color: '#374151' },
  pestanaTextoActiva: { color: '#fff' },
  actualizada: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  enlace: { fontSize: 12, color: '#2563eb', fontWeight: '700' },
  tarjeta: { backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 12 },
  titulo: { fontSize: 14, fontWeight: '800', color: '#111827', marginBottom: 4 },
  rival: { fontSize: 20, fontWeight: '800', color: '#111827', marginTop: 2 },
  mini: { fontSize: 11, color: '#6b7280' },
  etiqueta: { fontSize: 11, fontWeight: '700', color: '#6b7280', marginBottom: 4 },
  texto: { fontSize: 13, color: '#374151' },
  vacio: { color: '#6b7280', textAlign: 'center', marginTop: 20 },
  aviso: { backgroundColor: '#fef3c7', color: '#92400e', borderRadius: 8, padding: 8, fontSize: 12, marginTop: 6 },
  fila: { flexDirection: 'row', gap: 8 },
  dato: { flex: 1, backgroundColor: '#f3f4f6', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  datoNumero: { fontSize: 18, fontWeight: '800', color: '#111827' },
  sede: { flex: 1, backgroundColor: '#f3f4f6', borderRadius: 10, padding: 10, borderWidth: 1.5, borderColor: 'transparent' },
  sedeActiva: { backgroundColor: '#ecfdf5', borderColor: VERDE },
  sedeTexto: { fontSize: 16, fontWeight: '800', color: '#111827' },
  marca: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  marcaTexto: { color: '#fff', fontWeight: '800', fontSize: 12 },
  punto: { width: 8, height: 8, borderRadius: 4 },
  boton: { backgroundColor: VERDE, borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 10 },
  botonTexto: { color: '#fff', fontWeight: '800', fontSize: 14 },
  areaPegar: { minHeight: 140, maxHeight: 260, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 10, fontSize: 12, color: '#111827', marginTop: 8, textAlignVertical: 'top' },
  areaNota: { minHeight: 90, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 10, fontSize: 14, color: '#111827', textAlignVertical: 'top' },
  tabla: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden' },
  filaTabla: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 8, borderBottomWidth: 1, borderColor: '#f3f4f6' },
  cabeceraTabla: { backgroundColor: '#f3f4f6' },
  filaMia: { backgroundColor: '#dcfce7' },
  filaRival: { backgroundColor: '#fef9c3' },
  celda: { fontSize: 12, color: '#111827' },
  cPos: { width: 22 },
  cNombre: { flex: 1 },
  cNum: { width: 26, textAlign: 'center' },
  cGoles: { width: 48, textAlign: 'center' },
  cRacha: { width: 52, alignItems: 'flex-end' },
  partido: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  partidoSiguiente: { borderColor: VERDE, borderWidth: 2 },
  partidoRival: { fontSize: 14, fontWeight: '700', color: '#111827', marginTop: 2 },
  botonPequeno: { backgroundColor: '#111827', borderRadius: 8, paddingVertical: 7, paddingHorizontal: 12 },
  botonPequenoTexto: { color: '#fff', fontWeight: '700', fontSize: 12 },
});

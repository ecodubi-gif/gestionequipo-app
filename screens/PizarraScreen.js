import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, PanResponder, useWindowDimensions, Alert,
} from 'react-native';
import DibujoSvg from '../components/DibujoSvg';
import StepperNumero from '../components/StepperNumero';
import { listarCamposApi } from '../data/apiClient';
import {
  CAMPO_POR_DEFECTO, FLECHAS, ELEMENTOS, COLORES_ZONA, TAMANO_EDITABLE, LIMITES,
  nuevoDibujo, normalizarDibujo, ajustarDibujo, limitarZona, centrarZona, zonaSugerida, jugadoresIniciales,
  anadirElemento, anadirFlecha, borrar, cambiarElemento, cambiarTipoFlecha, mover, buscarEn, aZona, avisosDibujo, campoDe, campoEfectivo,
} from '../data/pizarra';
import { formasTarea, pxAMetros, ventanaZona } from '../data/formas';
import { ROLES } from '../data/tareas';

const GRUPOS_ELEMENTOS = ['Conos y marcas', 'Porterías', 'Material', 'Zonas y texto'];
const GIRABLES = ['porteria', 'miniporteria', 'pica', 'valla', 'escalera'];
const ETIQUETA_ROL = { ataque: 'Ataque', defensa: 'Defensa', comodin: 'Comodín', portero: 'Portero' };

// Pizarra de una tarea: el campo con sus medidas reales, la zona de trabajo (que se mueve y se cambia de tamaño),
// los jugadores, el material y las flechas. Al terminar devuelve el dibujo y las medidas de la zona al editor de la tarea.
export default function PizarraScreen({ navigation, route }) {
  const { tarea: tareaInicial, dibujo: dibujoInicial, volverA = 'TareaEditor' } = route.params;
  const { height: alturaPantalla } = useWindowDimensions();

  const [campos, setCampos] = useState([]);
  const [campoElegido, setCampoElegido] = useState(CAMPO_POR_DEFECTO);
  const [dims, setDims] = useState({ largo: tareaInicial.largo || 40, ancho: tareaInicial.ancho || 30 });
  const tarea = { ...tareaInicial, largo: dims.largo, ancho: dims.ancho };
  // Medio campo o campo entero según la zona de la tarea (ver campoEfectivo): con eso se dibuja y se limita todo.
  const campo = useMemo(() => campoEfectivo(campoElegido, dims.largo, dims.ancho), [campoElegido, dims.largo, dims.ancho]);
  const [dibujo, setDibujo] = useState(() => {
    const guardado = normalizarDibujo(dibujoInicial);
    const l0 = tareaInicial.largo || 40; const a0 = tareaInicial.ancho || 30;
    return guardado || nuevoDibujo({ tarea: { ...tareaInicial, largo: l0, ancho: a0 }, campo: campoEfectivo(CAMPO_POR_DEFECTO, l0, a0) });
  });
  const [enfoque, setEnfoque] = useState('zona'); // 'zona' (ampliada, para colocar con comodidad) | 'campo' (el campo entero)
  const [seleccion, setSeleccion] = useState(null);
  const [modo, setModo] = useState('mover'); // 'mover' | 'flecha'
  const [tipoFlecha, setTipoFlecha] = useState('pase');
  const [panel, setPanel] = useState('elementos'); // 'elementos' | 'flechas' | 'zona'
  const [historial, setHistorial] = useState([]);
  const [anchoCaja, setAnchoCaja] = useState(0);
  const [flechaEnCurso, setFlechaEnCurso] = useState(null); // { a:{x,y}, b:{x,y} } en metros

  // Los campos dados de alta; el del dibujo (o el primero) pasa a ser el elegido.
  const cargarCampos = useCallback(async () => {
    const lista = await listarCamposApi().catch(() => []);
    setCampos(lista);
    const c = campoDe(normalizarDibujo(dibujoInicial), lista);
    setCampoElegido(c);
    const ce = campoEfectivo(c, dims.largo, dims.ancho);
    setDibujo((d) => ajustarDibujo({ ...d, zona: dibujoInicial ? d.zona : centrarZona(ce, dims.largo, dims.ancho) }, tarea, ce));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { cargarCampos(); }, [cargarCampos]);

  const altoMax = Math.max(180, Math.min(330, alturaPantalla * 0.4));
  // Lo último que se sabe, para los gestos (que no se redibujan con cada cambio).
  const estado = useRef({});
  // La ventana ampliada se calcula al entrar, al cambiar de campo o de medidas, o al pulsar "Centrar vista"; no se mueve mientras se arrastra.
  const [ventanaFija, setVentanaFija] = useState(() => ventanaZona({ tarea: { largo: dims.largo, ancho: dims.ancho }, dibujo, campo }));
  const recentrar = useCallback(() => setVentanaFija(ventanaZona({ tarea: { largo: dims.largo, ancho: dims.ancho }, dibujo: estado.current.dibujo, campo })), [dims.largo, dims.ancho, campo]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { recentrar(); }, [recentrar, enfoque, campos]);
  const dibujoVista = flechaEnCurso
    ? (() => {
        const a = aZona(dibujo, tarea, flechaEnCurso.a.x, flechaEnCurso.a.y); const b = aZona(dibujo, tarea, flechaEnCurso.b.x, flechaEnCurso.b.y);
        return { ...dibujo, flechas: [...dibujo.flechas, { tipo: tipoFlecha, u1: a.u, v1: a.v, u2: b.u, v2: b.v }] };
      })()
    : dibujo;
  const res = anchoCaja > 0 ? formasTarea({ tarea, dibujo: dibujoVista, campo, modo: 'pizarra', anchoMax: anchoCaja, altoMax, seleccion, ventana: enfoque === 'zona' ? ventanaFija : null }) : null;
  const resFinal = res;

  // (se actualiza en cada pintado)
  estado.current = { dibujo, tarea, campo, res, modo, tipoFlecha };
  const arrastre = useRef(null);

  const guardarHistorial = (base) => setHistorial((h) => [...h.slice(-29), base]);
  const deshacer = () => {
    setHistorial((h) => {
      if (h.length === 0) return h;
      const ultimo = h[h.length - 1];
      setDibujo(ultimo);
      setSeleccion(null);
      return h.slice(0, -1);
    });
  };

  const gestos = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => {
      const { dibujo: d, tarea: t, res: r, modo: m } = estado.current;
      if (!r) return;
      const p = pxAMetros(r, e.nativeEvent.locationX, e.nativeEvent.locationY);
      if (m === 'flecha') {
        arrastre.current = { tipo: 'flecha-nueva', a: p };
        setSeleccion(null);
        return;
      }
      const tol = Math.min(6, Math.max(0.8, 22 / r.escala)); // ~22 px alrededor: cabe el dedo
      const hit = buscarEn(d, t, p.x, p.y, tol);
      setSeleccion(hit);
      arrastre.current = hit ? { tipo: 'mover', ref: hit, base: d, movido: false } : null;
    },
    onPanResponderMove: (e, g) => {
      const a = arrastre.current; const { tarea: t, campo: c, res: r } = estado.current;
      if (!a || !r) return;
      const dx = g.dx / r.escala; const dy = g.dy / r.escala;
      if (a.tipo === 'mover') {
        if (!a.movido && Math.hypot(g.dx, g.dy) < 3) return;
        a.movido = true;
        setDibujo(mover(a.base, t, c, a.ref, dx, dy));
      } else if (a.tipo === 'flecha-nueva') {
        setFlechaEnCurso({ a: a.a, b: { x: a.a.x + dx, y: a.a.y + dy } });
      }
    },
    onPanResponderRelease: (e, g) => {
      const a = arrastre.current; const { dibujo: d, tarea: t, res: r, tipoFlecha: tf } = estado.current;
      arrastre.current = null;
      if (!a || !r) return;
      if (a.tipo === 'mover' && a.movido) guardarHistorial(a.base);
      if (a.tipo === 'flecha-nueva') {
        setFlechaEnCurso(null);
        const dx = g.dx / r.escala; const dy = g.dy / r.escala;
        if (Math.hypot(dx, dy) < 1.5) return; // un toque suelto no es una flecha
        const desde = aZona(d, t, a.a.x, a.a.y); const hasta = aZona(d, t, a.a.x + dx, a.a.y + dy);
        const nuevo = anadirFlecha(d, tf, desde, hasta);
        if (nuevo.ref) {
          guardarHistorial(d);
          setDibujo(nuevo.dibujo);
          setSeleccion(nuevo.ref);
        }
      }
    },
    onPanResponderTerminate: () => {
      const a = arrastre.current;
      arrastre.current = null;
      setFlechaEnCurso(null);
      if (a && a.tipo === 'mover') setDibujo(a.base);
    },
  })).current;

  // ---------- Acciones ----------
  const cambiar = (nuevo, conHistorial = true) => {
    if (conHistorial) guardarHistorial(dibujo);
    setDibujo(nuevo);
  };

  const anadir = (tipo) => {
    const hayPorteriaIzquierda = dibujo.elementos.some((e) => (e.tipo === 'porteria' || e.tipo === 'miniporteria') && e.u < 0.3);
    let u = 0.5 + (dibujo.elementos.length % 5) * 0.03; let v = 0.5 + (dibujo.elementos.length % 5) * 0.03;
    if (tipo === 'porteria' || tipo === 'miniporteria') { u = hayPorteriaIzquierda ? 1 : 0; v = 0.5; }
    const r = anadirElemento(dibujo, tipo, u, v);
    if (!r.ref) { Alert.alert('Máximo alcanzado', `No caben más de ${LIMITES.elementos} elementos.`); return; }
    cambiar(r.dibujo);
    setModo('mover');
    setSeleccion(r.ref);
  };

  const quitarSeleccion = () => {
    if (!seleccion || !(seleccion.tipo === 'elemento' || seleccion.tipo === 'flecha')) return;
    cambiar(borrar(dibujo, seleccion));
    setSeleccion(null);
  };

  const elegirCampo = (c) => {
    setCampoElegido(c);
    cambiar({ ...dibujo, campo_id: c.id, zona: limitarZona(campoEfectivo(c, dims.largo, dims.ancho), dibujo.zona, dims.largo, dims.ancho) });
  };

  const cambiarMedidas = (largo, ancho) => {
    setDims({ largo, ancho });
    setDibujo((d) => ({ ...d, zona: limitarZona(campoEfectivo(campoElegido, largo, ancho), d.zona, largo, ancho) }));
  };

  const girarZona = () => cambiarMedidas(dims.ancho, dims.largo);

  const usarZonaSugerida = () => {
    const z = zonaSugerida({
      objetivo: tarea.objetivo, referencia: tarea.referencia, jugadoresCampo: tarea.jugadoresCampo || (tarea.n_ataque + tarea.n_defensa + tarea.n_comodines) || 1,
      apP: tarea.apP, campo: campoElegido,
    });
    setDims({ largo: z.largo, ancho: z.ancho });
    cambiar({ ...dibujo, zona: centrarZona(campoEfectivo(campoElegido, z.largo, z.ancho), z.largo, z.ancho) });
    if (z.avisos.length) Alert.alert('Aviso', z.avisos[0]);
  };

  const recolocarJugadores = () => cambiar({ ...dibujo, jugadores: jugadoresIniciales(tarea) });

  const listo = () => {
    const final = ajustarDibujo(dibujo, tarea, campo);
    navigation.navigate({ name: volverA, params: { pizarra: { dibujo: final, largo: dims.largo, ancho: dims.ancho, ts: Date.now() } }, merge: true });
  };

  const sel = seleccion;
  const elementoSel = sel && sel.tipo === 'elemento' ? dibujo.elementos[sel.i] : null;
  const flechaSel = sel && sel.tipo === 'flecha' ? dibujo.flechas[sel.i] : null;
  const jugadorSel = sel && sel.tipo === 'jugador' ? dibujo.jugadores[sel.i] : null;
  const avisos = avisosDibujo(dibujo, tarea, campo);
  const jugadoresCampoN = (tarea.n_ataque || 0) + (tarea.n_defensa || 0) + (tarea.n_comodines || 0);
  const apPAhora = jugadoresCampoN > 0 ? Math.round((dims.largo * dims.ancho) / jugadoresCampoN) : null;

  return (
    <View style={styles.contenedor}>
      <View style={styles.barra}>
        <TouchableOpacity style={styles.barraBoton} onPress={() => navigation.goBack()}>
          <Text style={styles.barraBotonTexto}>Cancelar</Text>
        </TouchableOpacity>
        <Text style={styles.barraTitulo} numberOfLines={1}>{tarea.nombre || 'Pizarra'}</Text>
        <TouchableOpacity style={[styles.barraBoton, historial.length === 0 && { opacity: 0.35 }]} disabled={historial.length === 0} onPress={deshacer}>
          <Text style={styles.barraBotonTexto}>↩︎ Deshacer</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.botonListo} onPress={listo} testID="pizarra-listo">
          <Text style={styles.botonListoTexto}>Listo</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.cajaPizarra} onLayout={(e) => setAnchoCaja(Math.round(e.nativeEvent.layout.width))}>
        {resFinal && (
          <View style={{ width: resFinal.ancho, height: resFinal.alto, alignSelf: 'center' }}>
            <DibujoSvg res={resFinal} />
            <View style={[StyleSheet.absoluteFill, styles.capaGestos]} {...gestos.panHandlers} testID="pizarra-gestos" />
          </View>
        )}
      </View>

      <View style={styles.modos}>
        <TouchableOpacity style={[styles.modo, modo === 'mover' && styles.modoActivo]} onPress={() => setModo('mover')}>
          <Text style={[styles.modoTexto, modo === 'mover' && styles.modoTextoActivo]}>✋ Mover</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.modo, modo === 'flecha' && styles.modoActivo]} onPress={() => { setModo('flecha'); setPanel('flechas'); setSeleccion(null); }}>
          <Text style={[styles.modoTexto, modo === 'flecha' && styles.modoTextoActivo]}>➜ Dibujar flecha</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.filaVista}>
        <Text style={styles.mini}>Vista:</Text>
        {[['zona', '🔍 Zona ampliada'], ['campo', campo.medio ? '⬜ Medio campo' : '⬜ Campo entero']].map(([k, t]) => (
          <TouchableOpacity key={k} style={[styles.chipVista, enfoque === k && styles.chipVistaActivo]} onPress={() => setEnfoque(k)}>
            <Text style={[styles.chipVistaTexto, enfoque === k && { color: '#fff' }]}>{t}</Text>
          </TouchableOpacity>
        ))}
        {enfoque === 'zona' && (
          <TouchableOpacity style={styles.chipVista} onPress={recentrar}>
            <Text style={styles.chipVistaTexto}>◎ Centrar vista</Text>
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.pista}>
        {modo === 'flecha'
          ? `Arrastra sobre el campo para dibujar: ${FLECHAS[tipoFlecha].etiqueta.toLowerCase()} (${FLECHAS[tipoFlecha].discontinua ? 'discontinua = balón' : 'continua = jugador'}).`
          : 'Toca y arrastra jugadores, material, flechas o la zona verde para moverlos.'}
      </Text>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {avisos.map((a, i) => <Text key={i} style={styles.aviso}>{a}</Text>)}

        {/* ---- Lo seleccionado ---- */}
        {sel && (
          <View style={styles.seleccion}>
            {sel.tipo === 'zona' && <Text style={styles.selTitulo}>Zona de la tarea · {dims.largo} × {dims.ancho} m (se cambia en la pestaña Zona)</Text>}
            {jugadorSel && <Text style={styles.selTitulo}>{ETIQUETA_ROL[jugadorSel.rol]} · arrástralo para colocarlo</Text>}
            {elementoSel && (
              <>
                <Text style={styles.selTitulo}>{ELEMENTOS[elementoSel.tipo].etiqueta}</Text>
                <View style={styles.filaWrap}>
                  {GIRABLES.includes(elementoSel.tipo) && (
                    <TouchableOpacity style={styles.chip} onPress={() => cambiar(cambiarElemento(dibujo, sel.i, { giro: true }))}>
                      <Text style={styles.chipTexto}>⟳ Girar</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={[styles.chip, styles.chipBorrar]} onPress={quitarSeleccion}>
                    <Text style={[styles.chipTexto, { color: '#dc2626' }]}>🗑 Borrar</Text>
                  </TouchableOpacity>
                </View>
                {TAMANO_EDITABLE.includes(elementoSel.tipo) && (
                  <View style={{ marginTop: 8 }}>
                    <Text style={styles.mini}>Largo</Text>
                    <StepperNumero valor={elementoSel.largo} pasos={[-5, -1, 1, 5]} min={0.5} max={60} formato={(v) => `${v} m`} onCambiar={(v) => cambiar(cambiarElemento(dibujo, sel.i, { largo: v }), false)} />
                    <Text style={styles.mini}>Ancho</Text>
                    <StepperNumero valor={elementoSel.ancho} pasos={[-5, -1, 1, 5]} min={0.5} max={60} formato={(v) => `${v} m`} onCambiar={(v) => cambiar(cambiarElemento(dibujo, sel.i, { ancho: v }), false)} />
                  </View>
                )}
                {elementoSel.tipo === 'zona' && (
                  <View style={[styles.filaWrap, { marginTop: 8 }]}>
                    {COLORES_ZONA.map((c) => (
                      <TouchableOpacity key={c} onPress={() => cambiar(cambiarElemento(dibujo, sel.i, { color: c }), false)} style={[styles.color, { backgroundColor: c }, elementoSel.color === c && styles.colorActivo]} />
                    ))}
                  </View>
                )}
                {(elementoSel.tipo === 'zona' || elementoSel.tipo === 'texto') && (
                  <TextInput
                    style={styles.input}
                    value={elementoSel.texto}
                    onChangeText={(t) => cambiar(cambiarElemento(dibujo, sel.i, { texto: t }), false)}
                    placeholder="Texto corto (pasillo, zona de presión…)"
                    placeholderTextColor="#9ca3af"
                    maxLength={LIMITES.texto}
                  />
                )}
              </>
            )}
            {flechaSel && (
              <>
                <Text style={styles.selTitulo}>Flecha · {FLECHAS[flechaSel.tipo].etiqueta}</Text>
                <View style={styles.filaWrap}>
                  {Object.entries(FLECHAS).map(([k, f]) => (
                    <TouchableOpacity key={k} style={[styles.chip, flechaSel.tipo === k && { borderColor: f.color, backgroundColor: '#fff' }]} onPress={() => cambiar(cambiarTipoFlecha(dibujo, sel.i, k))}>
                      <View style={[styles.muestra, { borderTopColor: f.color, borderStyle: f.discontinua ? 'dashed' : 'solid' }]} />
                      <Text style={styles.chipTexto}>{f.etiqueta}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity style={[styles.chip, styles.chipBorrar]} onPress={quitarSeleccion}>
                    <Text style={[styles.chipTexto, { color: '#dc2626' }]}>🗑 Borrar</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.mini}>Arrastra la flecha para moverla o sus puntas para cambiar su recorrido.</Text>
              </>
            )}
          </View>
        )}

        {/* ---- Pestañas ---- */}
        <View style={styles.pestanas}>
          {[['elementos', 'Elementos'], ['flechas', 'Flechas'], ['zona', 'Zona y campo']].map(([k, t]) => (
            <TouchableOpacity key={k} style={[styles.pestana, panel === k && styles.pestanaActiva]} onPress={() => setPanel(k)}>
              <Text style={[styles.pestanaTexto, panel === k && styles.pestanaTextoActiva]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {panel === 'elementos' && GRUPOS_ELEMENTOS.map((g) => (
          <View key={g}>
            <Text style={styles.grupo}>{g}</Text>
            <View style={styles.filaWrap}>
              {Object.entries(ELEMENTOS).filter(([, e]) => e.grupo === g).map(([k, e]) => (
                <TouchableOpacity key={k} style={styles.chip} onPress={() => anadir(k)}>
                  <Text style={styles.chipTexto}>+ {e.etiqueta}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {panel === 'flechas' && (
          <View>
            <Text style={styles.mini}>Continua = se mueve el jugador · Discontinua = se mueve el balón. El color dice de qué se trata.</Text>
            {Object.entries(FLECHAS).map(([k, f]) => (
              <TouchableOpacity
                key={k}
                style={[styles.filaFlecha, tipoFlecha === k && modo === 'flecha' && { borderColor: f.color, backgroundColor: '#fff' }]}
                onPress={() => { setTipoFlecha(k); setModo('flecha'); setSeleccion(null); }}
              >
                <View style={[styles.muestraGrande, { borderTopColor: f.color, borderStyle: f.discontinua ? 'dashed' : 'solid' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.flechaNombre}>{f.etiqueta}</Text>
                  <Text style={styles.flechaAyuda}>{f.discontinua ? 'Discontinua' : 'Continua'} · {f.ayuda}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {panel === 'zona' && (
          <View>
            <Text style={styles.grupo}>Campo</Text>
            <View style={styles.filaWrap}>
              {(campos.length ? campos : [CAMPO_POR_DEFECTO]).map((c) => (
                <TouchableOpacity key={c.id ?? 'defecto'} style={[styles.chip, campo.id === c.id && styles.chipActivo]} onPress={() => elegirCampo(c)}>
                  <Text style={[styles.chipTexto, campo.id === c.id && styles.chipTextoActivo]}>{c.nombre} · {c.largo}×{c.ancho}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={[styles.chip, styles.chipLink]} onPress={() => navigation.navigate('Campos')}>
                <Text style={[styles.chipTexto, { color: '#7c3aed' }]}>⚙ Gestionar campos</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.grupo}>Zona de la tarea</Text>
            <Text style={styles.mini}>Largo</Text>
            <StepperNumero valor={dims.largo} pasos={[-5, -1, 1, 5]} min={5} max={110} formato={(v) => `${v} m`} onCambiar={(v) => cambiarMedidas(v, dims.ancho)} />
            <Text style={styles.mini}>Ancho</Text>
            <StepperNumero valor={dims.ancho} pasos={[-5, -1, 1, 5]} min={5} max={75} formato={(v) => `${v} m`} onCambiar={(v) => cambiarMedidas(dims.largo, v)} />
            <Text style={styles.info}>
              {dims.largo * dims.ancho} m²{apPAhora ? ` · ${apPAhora} m² por jugador de campo (${jugadoresCampoN})` : ''}
            </Text>
            <Text style={styles.info}>
              {campo.medio ? `Medio campo: la zona cabe en la mitad del campo (${campo.largoTotal / 2} × ${campo.ancho} m) y se supone una portería móvil.` : `Campo entero (${campo.largoTotal} × ${campo.ancho} m).`}
            </Text>
            <View style={styles.filaWrap}>
              <TouchableOpacity style={styles.chip} onPress={usarZonaSugerida}><Text style={styles.chipTexto}>✨ Zona sugerida por la carga</Text></TouchableOpacity>
              <TouchableOpacity style={styles.chip} onPress={girarZona}><Text style={styles.chipTexto}>⟳ Girar zona</Text></TouchableOpacity>
              <TouchableOpacity style={styles.chip} onPress={() => cambiar({ ...dibujo, zona: centrarZona(campo, dims.largo, dims.ancho) })}><Text style={styles.chipTexto}>◎ Centrar</Text></TouchableOpacity>
              <TouchableOpacity style={styles.chip} onPress={recolocarJugadores}><Text style={styles.chipTexto}>↺ Recolocar jugadores</Text></TouchableOpacity>
            </View>
            <Text style={styles.mini}>
              Los jugadores se colocan según el formato de la tarea ({ROLES.ataque.etiqueta} en rojo, {ROLES.defensa.etiqueta} en azul, comodines en amarillo, porteros en negro). Las medidas de la zona son las de la tarea: si las cambias aquí, se cambian allí.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const MORADO = '#7c3aed';
const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#f8fafc' },
  barra: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e5e7eb' },
  barraTitulo: { flex: 1, fontSize: 14, fontWeight: '800', color: '#111827', textAlign: 'center' },
  barraBoton: { paddingVertical: 8, paddingHorizontal: 8 },
  barraBotonTexto: { fontSize: 12, fontWeight: '700', color: '#374151' },
  botonListo: { backgroundColor: MORADO, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 16 },
  botonListoTexto: { color: '#fff', fontWeight: '800', fontSize: 13 },
  cajaPizarra: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 8, borderBottomWidth: 1, borderColor: '#e5e7eb' },
  capaGestos: { touchAction: 'none', userSelect: 'none', cursor: 'grab' },
  modos: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 10 },
  modo: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#f3f4f6', alignItems: 'center' },
  modoActivo: { backgroundColor: MORADO },
  modoTexto: { fontSize: 13, fontWeight: '700', color: '#374151' },
  modoTextoActivo: { color: '#fff' },
  filaVista: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, paddingHorizontal: 12, paddingTop: 8 },
  chipVista: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#e5e7eb' },
  chipVistaActivo: { backgroundColor: '#111827' },
  chipVistaTexto: { fontSize: 11, fontWeight: '700', color: '#374151' },
  pista: { fontSize: 11, color: '#6b7280', paddingHorizontal: 14, paddingTop: 6 },
  aviso: { backgroundColor: '#fef3c7', color: '#92400e', borderRadius: 8, padding: 10, fontSize: 12, marginBottom: 10 },
  seleccion: { backgroundColor: '#faf5ff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e9d5ff', marginBottom: 12 },
  selTitulo: { fontSize: 13, fontWeight: '800', color: '#4c1d95', marginBottom: 6 },
  pestanas: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  pestana: { flex: 1, paddingVertical: 9, borderRadius: 9, backgroundColor: '#e5e7eb', alignItems: 'center' },
  pestanaActiva: { backgroundColor: '#111827' },
  pestanaTexto: { fontSize: 12, fontWeight: '700', color: '#374151' },
  pestanaTextoActiva: { color: '#fff' },
  grupo: { fontSize: 12, fontWeight: '800', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 10, marginBottom: 6 },
  filaWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#f3f4f6', borderWidth: 1.5, borderColor: 'transparent' },
  chipActivo: { backgroundColor: '#ede9fe', borderColor: MORADO },
  chipBorrar: { backgroundColor: '#fef2f2' },
  chipLink: { backgroundColor: '#fff', borderColor: '#ddd6fe' },
  chipTexto: { fontSize: 12, fontWeight: '700', color: '#374151' },
  chipTextoActivo: { color: MORADO },
  mini: { fontSize: 11, color: '#6b7280', marginTop: 8, marginBottom: 4 },
  info: { fontSize: 13, fontWeight: '700', color: '#15803d', marginVertical: 10 },
  color: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: '#fff' },
  colorActivo: { borderColor: '#111827' },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#111827', backgroundColor: '#fff', marginTop: 10 },
  muestra: { width: 16, borderTopWidth: 2.5 },
  filaFlecha: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, backgroundColor: '#f3f4f6', borderWidth: 1.5, borderColor: 'transparent', marginTop: 8 },
  muestraGrande: { width: 44, borderTopWidth: 3.5 },
  flechaNombre: { fontSize: 14, fontWeight: '700', color: '#111827' },
  flechaAyuda: { fontSize: 11, color: '#6b7280', marginTop: 1 },
});

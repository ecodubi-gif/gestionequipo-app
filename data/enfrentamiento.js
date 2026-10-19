// Enfrentamiento de sistemas: dado nuestro sistema y el del rival, cuenta quién tiene superioridad en cada zona
// y saca de ahí los puntos tácticos (con balón, sin balón, ajustes) y una puntuación para ordenar nuestras opciones.
// Todo sale del perfil de cada sistema (cuántos centrales, laterales o carrileros, medios, extremos…), así que sirve
// para cualquier sistema, también para los de tres centrales. Funciones puras, sin red ni pantalla.
import { lineasFormacion } from './scouting';
import { SISTEMAS } from './alineacion';

// Sistemas que se pueden elegir (los de la alineación y otros que usan los rivales).
export const SISTEMAS_ENFRENTAMIENTO = [...SISTEMAS, '4-1-4-1', '4-5-1', '4-4-1-1', '3-5-2', '3-4-2-1'];

// "1-4-4-2", "4-4-2", "4 3 3" → "4-4-2". null si no se entiende.
export function claveSistema(texto) {
  const l = lineasFormacion(texto);
  return l ? l.join('-') : null;
}

// Perfil: dfc = centrales, lat = laterales, carr = carrileros (medios de banda con defensa de tres),
// mc = medios centro, entre = jugadores entre líneas (mediapuntas, interiores), ext = extremos, del = delanteros centro.
export function perfilDe(lineas) {
  const n = lineas.length;
  const D = lineas[0];
  const A = lineas[n - 1];
  const mids = lineas.slice(1, n - 1);
  const p = { dfc: D >= 5 ? D - 2 : D === 4 ? 2 : D, lat: D >= 4 ? 2 : 0, carr: 0, mc: 0, entre: 0, ext: 0, del: 0 };
  mids.forEach((c, k) => {
    if (c === 1) { if (k === 0 && mids.length > 1) p.mc += 1; else p.entre += 1; }
    else if (c === 2) { if (k === 0) p.mc += 2; else p.entre += 2; }
    else if (c === 3) { if (k > 0 && n >= 4) { p.ext += 2; p.entre += 1; } else p.mc += 3; }
    else { if (D === 3) p.carr += 2; else p.ext += 2; p.mc += c - 2; }
  });
  if (A <= 2) p.del = A; else { p.ext += 2; p.del = A - 2; }
  return p;
}

const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
export function descripcionPerfil(p) {
  const t = [plural(p.dfc, 'central', 'centrales')];
  if (p.lat) t.push(plural(p.lat, 'lateral', 'laterales'));
  if (p.carr) t.push(plural(p.carr, 'carrilero', 'carrileros'));
  t.push(`${p.mc} ${p.mc === 1 ? 'medio centro' : 'medios centro'}`);
  if (p.entre) t.push(`${p.entre} entre líneas`);
  if (p.ext) t.push(plural(p.ext, 'extremo', 'extremos'));
  t.push(plural(p.del, 'delantero', 'delanteros'));
  return t.join(' · ');
}

const lado = (p) => (p.lat + p.carr + p.ext) / 2; // jugadores que ocupan cada banda
const limitar = (x, a, b) => Math.max(a, Math.min(b, x));

// Superioridades por zona, vistas desde nosotros.
export function superioridades(P, R) {
  const centroP = P.mc + P.entre;
  const centroR = R.mc + R.entre;
  const ladoP = lado(P);
  const ladoR = lado(R);
  const amenaza = R.del + R.entre;
  const dC = centroP - centroR;
  const dA = ladoP - ladoR;
  const pres = P.del - R.dfc;
  const def = P.dfc - amenaza;
  const zonas = [];
  zonas.push({
    id: 'centro', zona: 'Centro del campo', nosotros: centroP, ellos: centroR, tipo: dC > 0 ? 'ventaja' : dC < 0 ? 'inferioridad' : 'igualdad',
    texto: dC > 0 ? `${centroP} contra ${centroR}: superioridad en el centro. Circula, busca al tercer hombre y gana la segunda jugada.`
      : dC < 0 ? `${centroP} contra ${centroR}: inferioridad. Cierra el pasillo interior, junta las líneas y no persigas el balón.`
        : `${centroP} contra ${centroR}: igualdad. Decide el duelo individual y quién llega antes a la segunda jugada.`,
  });
  zonas.push({
    id: 'presion', zona: 'Su salida de balón', nosotros: P.del, ellos: R.dfc, tipo: pres >= 0 ? 'ventaja' : pres === -1 ? 'igualdad' : 'inferioridad',
    texto: pres >= 0 ? `Tus ${P.del} atacantes igualan a sus ${R.dfc} centrales: puedes presionar alto.`
      : pres === -1 ? `${P.del} contra ${R.dfc}: les queda un central libre. Presiona escalonado y que un medio cierre el pase a ese central y al pivote.`
        : `${P.del} contra ${R.dfc}: salen con superioridad. No presiones arriba con pocos: bloque medio y roba en el centro.`,
  });
  zonas.push({
    id: 'defensa', zona: 'Defensa de tu área', nosotros: P.dfc, ellos: amenaza, tipo: def >= 1 ? 'ventaja' : def === 0 ? 'igualdad' : 'inferioridad',
    texto: def >= 1 ? `Tus ${P.dfc} centrales ante ${plural(amenaza, 'atacante', 'atacantes')} por dentro: te sobra uno. Úsalo para salir jugando o como cobertura.`
      : def === 0 ? `${P.dfc} contra ${amenaza} por dentro: igualdad. El pivote debe cubrir el espacio entre líneas.`
        : `${P.dfc} centrales ante ${plural(amenaza, 'atacante', 'atacantes')} por dentro: te falta uno. Un pivote cae entre los centrales y los laterales no suben a la vez.`,
  });
  zonas.push({
    id: 'bandas', zona: 'Bandas', nosotros: ladoP, ellos: ladoR, tipo: dA > 0 ? 'ventaja' : dA < 0 ? 'inferioridad' : 'igualdad',
    texto: dA > 0 ? `${ladoP} contra ${ladoR} por banda: puedes doblar a su lateral o extremo.`
      : dA < 0 ? `${ladoP} contra ${ladoR} por banda: inferioridad. Tu lateral necesita ayuda del extremo o del medio de ese lado.`
        : `${ladoP} contra ${ladoR} por banda: igualdad. Gana el que tenga mejor 1 contra 1.`,
  });
  return { zonas, dC, dA, pres, def, amenaza };
}

// Puntuación de encaje de nuestro sistema frente al rival (más alta, mejor). Solo para ordenar.
export function puntuar(P, R) {
  const s = superioridades(P, R);
  let punt = 10;
  punt += 2.5 * limitar(s.dC, -2, 2);
  punt += 1.5 * limitar(s.dA, -1, 1);
  punt += 1 * limitar(s.pres, -1, 1);
  if (s.def < 0) punt -= 2 * Math.min(-s.def, 2);
  else if (s.def >= 1) punt += 0.5;
  return Math.round(punt * 10) / 10;
}

const sinRepetir = (arr) => [...new Set(arr)];

// Análisis completo: nuestro sistema contra el del rival.
export function analizar(propio, rival) {
  const kp = claveSistema(propio);
  const kr = claveSistema(rival);
  if (!kp || !kr) return null;
  const lp = kp.split('-').map(Number);
  const lr = kr.split('-').map(Number);
  const P = perfilDe(lp);
  const R = perfilDe(lr);
  const sup = superioridades(P, R);
  const conBalon = [];
  const sinBalon = [];
  const ajustes = [];
  const riesgos = [];

  // --- Lo que deja el rival (sus puntos débiles) ---
  if (R.dfc === 3 && R.carr > 0) conBalon.push('Su espalda tiene un punto débil: cuando los carrileros suben quedan solo tres centrales y huecos por fuera. Ataca ese espacio con balones largos a tu extremo o con un lateral que se incorpore.');
  if (R.dfc === 3 && R.carr === 0) conBalon.push('Con tres centrales y sin carrileros ni laterales, sus bandas están desprotegidas. Ataca por fuera con amplitud y cambios de orientación.');
  if (R.dfc >= 5 || (R.dfc === 3 && R.lat === 2)) conBalon.push('Bloque bajo de cinco: paciencia, mueve el balón de lado a lado, centra y tira desde fuera, y no metas pases por dentro sin necesidad.');
  if (R.ext === 0 && R.carr === 0 && R.lat === 2) conBalon.push('No tiene extremos ni carrileros: sus laterales quedan solos en banda. Cambios de orientación y laterales o extremos altos.');
  if (R.del === 1) conBalon.push('Solo un delantero: tus centrales tienen tiempo para sacar el balón; no hace falta jugar largo.');
  if (R.del >= 2 && R.dfc >= 3 && P.del <= 1) conBalon.push(`Tus ${P.del === 1 ? 'único delantero' : 'delanteros'} ante ${R.dfc} centrales: baja un medio o un mediapunta para dar apoyo y no dejarlo aislado.`);
  if (R.mc + R.entre === 2) conBalon.push('Solo dos jugadores en el centro: un mediapunta o interior que reciba entre líneas les rompe.');
  if (R.ext >= 2 && R.dfc === 4) conBalon.push('Sus extremos abren el campo y dejan espacio por dentro: si ganas la segunda jugada, el centro queda libre.');

  // --- Lo que hay que vigilar de él ---
  if (R.entre >= 1) sinBalon.push(`Entre líneas ${R.entre === 1 ? 'tiene un jugador' : `tiene ${R.entre} jugadores`} que reciben de cara: reparte antes del partido quién marca a cada uno (pivote, central o medio, nunca dos para el mismo) y cierra el pasillo interior con los laterales.`);
  if (R.mc >= 3) sinBalon.push(`Tiene ${R.mc} medios centro: no los persigas, junta las líneas y que el pivote no salga de su zona.`);
  if (R.carr > 0) sinBalon.push('Sus carrileros doblan a tus laterales: ayuda con el extremo o el medio de ese lado y no saltes con el lateral si el central no cubre.');
  if (R.dfc === 3 && R.del + R.entre >= 3) sinBalon.push(`Tres atacantes por dentro: tus laterales no suben a la vez.`);
  if (R.del >= 3 || (R.ext >= 2 && R.del >= 1 && R.entre === 0)) sinBalon.push('Tiene tres hombres arriba: línea defensiva muy junta y cobertura entre central y lateral.');
  if (R.del === 2 && R.dfc <= 4) sinBalon.push('Dos delanteros: ojo a los balones largos y a las segundas jugadas tras el pivote.');

  // --- Cómo encaja nuestro sistema ---
  if (P.dfc === 3) conBalon.push('Salida de tres: el central de un lado conduce y el carrilero o lateral se abre para dar amplitud.');
  if (P.dfc === 3 && R.del === 1) conBalon.push('Con tres centrales ante un solo delantero, te sobra uno: úsalo de líbero para salir jugando o súbelo a presionar.');
  if (P.dfc === 3 && R.del === 2) sinBalon.push('Tres contra dos atrás: un central queda libre para cubrir y el del lado del balón puede salir a presionar al delantero que baja.');
  if (P.dfc === 3 && R.del + R.entre >= 3) sinBalon.push('Tus tres centrales contra tres atacantes: igualdad atrás; los carrileros deben bajar y formar cinco cuando pierdes el balón.');
  if (P.carr > 0) sinBalon.push('Tus carrileros: cuando uno sube, el otro se queda para formar línea de cuatro con los centrales.');
  if (P.dfc === 3 && P.lat === 0 && sup.dA < 0) riesgos.push('Con carrileros en vez de laterales, si ellos te superan por banda tu espalda queda con solo tres centrales.');
  if (P.entre >= 1) sinBalon.push('Tu mediapunta presiona al pivote rival cuando pierdes el balón y cierra el pase al medio centro.');
  if (P.ext >= 2) conBalon.push('Tus extremos fijan a sus laterales: abre el campo y deja el centro para los medios.');
  if (P.del === 1 && R.dfc >= 3) riesgos.push(`Un delantero ante ${R.dfc} centrales puede quedar aislado. Necesita apoyo de un mediapunta y llegada desde segunda línea.`);
  if (P.del === 2 && R.dfc === 3) conBalon.push('Dos delanteros contra tres centrales: uno fija al central del medio y el otro se mueve al canal; que el tercer hombre entre desde segunda línea.');
  if (kp === kr) conBalon.unshift('Mismo sistema: duelos uno contra uno por todo el campo. Lo decide el que gane más segundas jugadas y arriesgue menos en la salida; un extremo que se cierra o un cambio de ritmo rompen la simetría.');
  if (P.dfc === 3 && R.dfc === 3) sinBalon.push('Ambos con tres centrales: los carrileros deciden. El que cargue más la banda pone en apuros al contrario.');

  // --- Riesgos por las superioridades ---
  if (sup.dC < 0) riesgos.push(`Inferioridad en el centro (${P.mc + P.entre} contra ${R.mc + R.entre}): te pueden dominar la posesión.`);
  if (sup.def < 0) riesgos.push(`Te falta un central ante ${plural(sup.amenaza, 'atacante', 'atacantes')} por dentro.`);
  if (sup.dA < 0) riesgos.push('Inferioridad por bandas: tu lateral o carrilero puede quedar en 2 contra 1.');
  if (sup.pres <= -2) riesgos.push('Su salida de balón tiene mucha ventaja numérica: te costará recuperar arriba.');

  // --- Ajustes durante el partido ---
  if (P.dfc === 3) ajustes.push('Si vas ganando: baja los carrileros y defiende con cinco; si pierdes, sube un central al medio y juega con un delantero más.');
  else if (P.del >= 2) ajustes.push('Si vas ganando: retira un delantero al medio (4-5-1 o 4-4-1-1) y junta las líneas. Si pierdes: sube un medio y juega con tres arriba.');
  else ajustes.push('Si vas ganando: junta las líneas y reduce los espacios. Si pierdes: sube un medio o un lateral y añade un delantero.');
  if (R.dfc === 3) ajustes.push('Si el rival pasa a defensa de cuatro, vigila que no te quede un jugador sin pareja en banda.');
  else ajustes.push('Si el rival pasa a tres centrales, iguala el centro con un jugador más y vigila la espalda de sus carrileros.');
  ajustes.push('Con un jugador más: ensancha el campo y mueve el balón de lado a lado. Con uno menos: cierra el centro y renuncia a un delantero antes que a un medio.');

  const puntuacion = puntuar(P, R);
  const ventajas = sup.zonas.filter((z) => z.tipo === 'ventaja').map((z) => z.zona);
  const resumen = ventajas.length
    ? `Tu ${kp} tiene ventaja en ${ventajas.join(' y ').toLowerCase()} frente al ${kr}.`
    : sup.zonas.some((z) => z.tipo === 'inferioridad')
      ? `Tu ${kp} no tiene ventaja numérica frente al ${kr}: la ventaja tendrá que venir de los duelos y la intensidad.`
      : `Tu ${kp} y el ${kr} se igualan: decide el duelo individual.`;
  return {
    propio: kp, rival: kr, perfilPropio: P, perfilRival: R, descripcionPropio: descripcionPerfil(P), descripcionRival: descripcionPerfil(R),
    superioridades: sup.zonas, puntuacion, resumen,
    conBalon: sinRepetir(conBalon).slice(0, 6), sinBalon: sinRepetir(sinBalon).slice(0, 6), riesgos: sinRepetir(riesgos).slice(0, 4), ajustes: sinRepetir(ajustes).slice(0, 4),
  };
}

// Nuestros sistemas ordenados de mejor a peor frente a un rival. Cada uno con su puntuación y por qué.
export function mejoresOpciones(rival, sistemas = SISTEMAS_ENFRENTAMIENTO) {
  const kr = claveSistema(rival);
  if (!kr) return [];
  const R = perfilDe(kr.split('-').map(Number));
  const vistos = new Set();
  const out = [];
  for (const s of sistemas) {
    const k = claveSistema(s);
    if (!k || vistos.has(k)) continue;
    vistos.add(k);
    const P = perfilDe(k.split('-').map(Number));
    const sup = superioridades(P, R);
    out.push({
      sistema: k,
      puntuacion: puntuar(P, R),
      motivos: sup.zonas.filter((z) => z.tipo === 'ventaja').map((z) => `${z.zona.toLowerCase()} ${z.nosotros}-${z.ellos}`),
      avisos: sup.zonas.filter((z) => z.tipo === 'inferioridad').map((z) => `${z.zona.toLowerCase()} ${z.nosotros}-${z.ellos}`),
    });
  }
  return out.sort((a, b) => b.puntuacion - a.puntuacion || a.sistema.localeCompare(b.sistema));
}

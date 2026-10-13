import { leerFicha, resumenGoles } from './goles.mjs';
let n = 0; const t = (c, m) => { if (!c) { console.log('FALLO', m); process.exitCode = 1; } else n++; };
const L = (nom, id) => `[${nom}](https://www.lapreferente.com/J${id}/x/${nom.toLowerCase().replace(/ /g, '-')}.html)`;
const fichas = {
 5: `Fecha: Domingo * Goles del C.D. Utrera B: 1-0, ${L('Pablo López', 295167)} (59'); 2-0, ${L('Omar', 500489)} (70'); * Goles del U.D. Morón C.F.: 2-1, ${L('Daniel', 217860)} (80'); * Tarjetas: Amonestó por los locales a ${L('Adri García', 1)} y por los visitantes a ${L('Puche', 2)}.`,
 4: `* Goles del U.D. Morón C.F.: 1-0, ${L('Benitez', 1)} (34'); 2-0, ${L('Javier Nuñez', 2)} (78'); 3-0, ${L('Jonathan', 3)} (84'); * Árbitro: ${L('Roldán', 4)} (Sevilla) * Tarjetas: Expulsó por los visitantes a ${L('Gonzalo', 5)} (Roja directa 73').`,
 3: `* Goles del C.D. Demo: 1-1, ${L('Rubén Gómez', 1)} (7'); 2-4, ${L('Tomas Alfonso Martinez', 2)} (52'); 3-4, ${L('Tomas Alfonso Martinez', 2)} (66'); * Goles del U.D. Morón C.F.: 0-1, ${L('Juanjo', 3)} (3'); 1-2, ${L('Fernando', 4)} en propia meta (16'); 1-3, ${L('Josué', 5)} (18'); 1-4, ${L('Nano', 6)} (48'); 3-5, ${L('Javier Nuñez', 7)} (89'); * Árbitro: x`,
 2: `* Goles del U.D. Morón C.F.: 1-0, ${L('Jonathan', 1)} (13'); 2-2, ${L('Javier Perez', 2)} (51'); * Goles del El Palmar Vda. Real: 1-1, ${L('Joaquin', 3)} (15'); 1-2, ${L('Manuel', 4)} (30'); * Árbitro: x * Tarjetas: Expulsó por los locales a ${L('Daniel', 5)} (Roja directa 80')`,
 1: `* Goles del Dos Hermanas CF B: 1-0, ${L('Enrique', 1)} (56'); 2-0, ${L('Lucas Lopez', 2)} (89'); * Árbitro: x * Tarjetas: Expulsó por los visitantes a ${L('Martin Cano', 3)} (Roja directa 80').`,
};
const esp = { 5: [1, 2], 4: [3, 0], 3: [5, 3], 2: [2, 2], 1: [0, 2] };
const ps = [];
for (const j of [1, 2, 3, 4, 5]) {
  const f = leerFicha(fichas[j], 'U.D. MORÓN C.F.');
  t(f && f.gf === esp[j][0] && f.gc === esp[j][1], `J${j} ${f && [f.gf, f.gc]}`);
  ps.push(f);
}
t(ps[2].goles.some((g) => g.tipo === 'propia' && g.jugador === 'Fernando' && g.min === 16), 'propia');
const r = resumenGoles(ps);
console.log(JSON.stringify({ gf: r.gf, gc: r.gc, primero: r.primero, rec: r.recibePrimero, sin: r.sinGoles, tramos: r.tramos.map((x) => [x.etiqueta, x.f, x.c]), p1: [r.primeraParteF, r.primeraParteC], p2: [r.segundaParteF, r.segundaParteC], gol: r.goleadores, fuerte: r.fuerteAFavor, debil: r.debilEnContra }));
console.log(n + ' ok');

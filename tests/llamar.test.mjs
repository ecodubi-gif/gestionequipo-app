import { llamar, leerJson, mensajeDeEstado, MENSAJE_SIN_CONEXION } from './llamar.mjs';
let n=0; const t=(c,m)=>{ if(!c){console.log('FALLO',m);process.exitCode=1;} else n++; };
globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };
try { await llamar('x', {}); t(false,'debía fallar'); } catch (e) { t(e.message===MENSAJE_SIN_CONEXION,'sin red: '+e.message); }
globalThis.fetch = (u, o) => new Promise((_, rej) => o.signal.addEventListener('abort', () => rej(Object.assign(new Error('a'), { name: 'AbortError' }))));
const original = globalThis.setTimeout; globalThis.setTimeout = (f) => original(f, 20);
try { await llamar('x', {}); t(false,'timeout'); } catch (e) { t(/tarda demasiado/.test(e.message),'timeout: '+e.message); }
globalThis.setTimeout = original;
globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ a: 1 }) });
t((await llamar('x', {})).status===200,'ok');
t((await leerJson({ json: async () => { throw new SyntaxError('Unexpected token <'); } })).constructor===Object,'no JSON');
t(/Demasiados/.test(mensajeDeEstado(429))&&/problema/.test(mensajeDeEstado(502))&&/404/.test(mensajeDeEstado(404)),'estados');
console.log(n+' ok');

# Seguimiento Partido

App Expo (Android/iOS/web) conectada a un backend Laravel real
(`https://ecodubi.com/api`). Ya no guarda nada en local: todo vive en
el servidor, compartido entre dispositivos y usuarios según su rol
(entrenador, segundo entrenador, delegado, preparador físico).

## Cómo probarlo

```
npm install
npx expo start
```

Instala **Expo Go** en tu móvil y escanea el QR. Hace falta conexión a
internet (habla con el servidor en todo momento).

## Flujo de pantallas

1. **Login** — email y contraseña reales contra la API. El rol
   determina qué puedes hacer (solo entrenador/segundo entrenador
   pueden crear partidos y registrar eventos; los otros dos roles ven
   todo en modo lectura).
2. **Mis partidos** — lista todos los partidos del servidor. El botón
   "+ Nuevo partido" solo aparece si tu rol puede crear partidos.
3. **Nuevo partido** — equipos, fecha, lugar. Se guarda en el momento
   (`POST /partidos`), no hay borrador local.
4. **Convocatoria** — la plantilla de jugadores es del club, no del
   partido: se crea una vez (`GET/POST /jugadores`) y se reutiliza en
   cada convocatoria. Aquí marcas quién está citado y quién es titular
   para este partido concreto.
5. **Partido en directo** — tiros, córners, tarjetas, faltas y
   cambios, todo guardado al momento en el servidor. El cronómetro
   (parte, minuto, pausas) vive solo en este móvil, no se sincroniza:
   si cierras la app a mitad de partido el crono se reinicia, pero los
   eventos ya guardados no se pierden.

## La capa de datos

Todo pasa por `data/apiClient.js`: login, partidos, jugadores,
convocatoria y eventos. Ninguna pantalla llama a `fetch` directamente.

## Desarrollo

- **Servidor al que apunta**: `API_BASE` en `data/apiClient.js`. Por defecto es producción
  (`https://ecodubi.com/api`). **Para desarrollar, cámbialo al entorno de pruebas**, no a producción:
  ahí hay datos reales del equipo.
- **Web (PWA)**: `CI=1 npx expo export --platform web` genera `dist/`.
- **Lógica sin pantalla**: la parte de cálculo vive en `data/*.js` (carga, semana, reparto, tareas, biblioteca…)
  y no depende de React. Las pruebas están en `tests/*.test.mjs`; se ejecutan con Node copiando `data/*.js`
  a `.mjs` y cambiando las importaciones `from './x'` por `from './x.mjs'`.
- **Revisión de código**: `eslint` con `no-undef` y `react-hooks/rules-of-hooks` detecta referencias sin definir
  y hooks declarados después de un `return` (esos errores no los avisa el empaquetador).
- **Roles**: entrenador, segundo entrenador, delegado y preparador físico. El servidor decide qué puede hacer cada uno.

## Pantallas principales

Panel (según rol) · Prepartido y convocatoria · Partido en directo · Entrenamientos (asistencia, preparación,
plan de sesión por bloques, tareas, sesión completa imprimible) · Semana (carga prevista y real) ·
RPE (carga semanal y riesgo de lesión) · Plantilla del club.

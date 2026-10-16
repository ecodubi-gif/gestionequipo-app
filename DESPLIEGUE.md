# Gestión del equipo · C.D. Herrera — despliegue y estado

App: https://app.ecodubi.com · API Laravel en `/var/www/estpartido-api` · BD MariaDB `estpartido` · VPS 95.111.245.19

## Cómo se despliega

| Qué cambia | Qué subir | Comandos (en la VPS, tras `scp` a `/root/`) |
|---|---|---|
| Solo la web | `seguimiento-partido-web-<hash>.zip` (lleva `dist/`) | `bash /root/desplegar-web.sh /root/seguimiento-partido-web-<hash>.zip` |
| Código fuente (GitHub) | `SeguimientoPartido.zip` | `bash /root/subir-app.sh /root/SeguimientoPartido.zip "mensaje"` |
| Servidor (tablas, rutas, permisos) | `aplicar-<tema>.sh` | `bash /root/aplicar-<tema>.sh` y pegar la salida |

- Todos los `aplicar-*.sh` hacen copia de seguridad antes (`/var/backups/estpartido/`), se pueden repetir sin romper nada y terminan con una comprobación en una transacción que se deshace.
- La web anterior queda en `/var/www/seguimiento-partido-web.anterior` por si hay que volver atrás.
- Subir a la VPS desde tu ordenador: `scp <archivos> root@95.111.245.19:/root/`

## Orden de los scripts de servidor (el orden importa)

Marca con ✔ lo que hayas ejecutado y comprobado (todas las líneas "OK").

1. [ ] `aplicar-lesiones-multas.sh` — lesiones y saldo de multas
2. [ ] `aplicar-enlaces-jugador.sh` — enlaces personales, confirmación de asistencia, bienestar
3. [ ] `aplicar-convocatoria-jugador.sh` — convocatoria publicada, "Visto", "llego tarde" (necesita el 2)
4. [ ] `aplicar-permisos-salud.sh` — lesiones y bienestar solo para preparador físico y delegado; marca "No disponible" (necesita 1 y 2)
5. [ ] `aplicar-alineaciones.sh` — alineaciones por momentos
6. [x] `aplicar-abp.sh` — balón parado (ejecutado el 16/10/2026, todo OK; se puede repetir)
7. [ ] `aplicar-preventivo-opcional.sh` — preventivo y movilidad apagables por sesión
8. [ ] `aplicar-tarjetas.sh` — ajustes manuales de tarjetas y sanciones
9. [ ] `aplicar-resumen-jugador.sh` — resumen del último partido en la página del jugador (necesita el 3)

Pendientes de antes (confirmar si se ejecutaron): `aplicar-rueda-fisica.sh`, `aplicar-rueda-opcional.sh`, `aplicar-scouting.sh`, `aplicar-campos-herrera.sh`, `borrar-partido-alhaurin.sh`, `limpiar-equipo-anterior.sh`, `resetear-clave.sh`, `aplicar-correo.sh`.

## Prueba completa con un partido de prueba

1. `bash /root/crear-partido-prueba.sh` — crea "PRUEBA Herrera vs PRUEBA Rival" con 11 titulares y suplentes.
2. En la app: convocatoria → publicarla → abrir el enlace personal de un jugador (comprobar que ve "convocado" pero no si es titular) → alineación con un cambio de sistema → balón parado (asignar, mover, fijar con doble toque, "ver todas", imprimir) → registrar alguna tarjeta y comprobar "Tarjetas".
3. `bash /root/borrar-partido-prueba.sh` — pide escribir `SI` antes de borrar.

Mientras exista el partido de prueba aparece como próximo partido; no cuenta en las tarjetas.

## Quién ve y toca qué

- **Lesiones y bienestar:** preparador físico y delegado. El resto solo ve "🩹 No disponible".
- **Enlaces de jugadores, Multas, Tarjetas:** dentro de Plantilla (delegado, entrenador, segundo).
- **Alineación, balón parado:** los ven los cuatro; los cambian entrenador y segundo.
- **Tarjetas (ajustes manuales):** los ven los cuatro; los crean delegado, entrenador y segundo.
- **Preventivo/movilidad ON-OFF:** entrenador, segundo y preparador físico (solo esos dos interruptores).
- Datos de salud de menores: conviene tener el consentimiento por escrito.

## Notas

- Las tarjetas suman lo que el delegado registra en directo; las anteriores a la app o las correcciones de acta van como ajuste manual. La sanción real la fija el Comité de Competición: la app solo avisa.
- Amarillas por ciclo: 5 por defecto (configurable en la pantalla Tarjetas). Confirma el valor en el reglamento de la competición.
- Tests de lógica: `tests/*.test.mjs` (se ejecutan con Node). Lint: ESLint.

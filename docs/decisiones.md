# Decisiones de arquitectura

Registro vivo de decisiones tomadas y sus trade-offs. Se actualiza en cada
fase; no se reescribe el historial, se agrega.

## Relación con el plan anterior

La carpeta del proyecto ya contenía
[`PLAN-Sistema-Ventas-Automatizado.md`](../PLAN-Sistema-Ventas-Automatizado.md),
un plan para un motor de ventas **genérico** (multi-producto, con n8n como
integrador y cobro en línea vía Culqi/Yape). Este proyecto lo reemplaza con
una plataforma **vertical inmobiliaria** con dos diferencias de fondo:

- **Sin n8n.** Webhooks y orquestación viven en rutas API de Next.js
  (runtime Node) con una cola en Postgres (`job_queue`, `SKIP LOCKED`). Menos
  piezas móviles, todo versionado y testeable en el mismo repo.
- **Sin pasarela de pago.** El agente nunca cobra: crea una solicitud de
  reserva pendiente que un humano aprueba en la bandeja. El pago ocurre fuera
  del sistema.

## Decisiones confirmadas (fase de planificación)

| Decisión                   | Elegido                                                                                                                      | Por qué / trade-off                                                                                                                                                                                                                                                                                                                                 |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Multi-inquilino            | Tabla `organizations` + `org_id` en todas las tablas y RLS por organización, operando con **una sola** organización          | Costo casi nulo ahora; evita una migración dolorosa si algún día se necesita multi-inquilino real. No hay onboarding de orgs ni invitaciones todavía.                                                                                                                                                                                               |
| Cola / background          | **Vercel Cron + drenador** (`FOR UPDATE SKIP LOCKED`), con disparo inmediato tras el webhook                                 | Cero infraestructura nueva, testeable localmente. Si el volumen lo exige, el mismo código puede correr como worker Node de larga duración en el VPS Hostinger existente (Fase 7) sin cambiar la lógica.                                                                                                                                             |
| Canales en Fase 2          | WhatsApp + landing; Messenger e Instagram en Fase 5                                                                          | Evita bloquear el avance en la revisión de app de Meta para `instagram_manage_messages`, que puede tardar semanas. Los adaptadores se escriben contra el modelo normalizado desde el inicio.                                                                                                                                                        |
| Entorno Supabase           | Proyecto Supabase Cloud de desarrollo (no local con Docker)                                                                  | Migraciones vía `supabase db push` contra el remoto. Los tests de RLS y concurrencia pegan a la red — se aíslan en `npm run test:db`, aparte de los unitarios, para no frenar la iteración normal.                                                                                                                                                  |
| Objetivo del agente        | **La cita agendada en Google Calendar** es el cierre del agente de IA                                                        | Cambia la máquina de estados: el agente llega hasta `cita_agendada`; la visita, la propuesta y la reserva son 100% humanas, gestionadas en la bandeja. Es también la métrica de conversión principal del dashboard.                                                                                                                                 |
| Google Calendar            | Un solo calendario compartido de la empresa ("Visitas"), una cuenta conectada por OAuth; el asesor asignado va como invitado | Simple, sin depender de que cada asesor autorice individualmente. Trade-off aceptado: el sistema no ve la agenda personal de cada asesor, así que un choque con un evento privado suyo es posible en teoría; se mitiga con el horario de atención configurable (`availability_rules`). Migrar a OAuth por asesor después solo toca `lib/calendar/`. |
| Disponibilidad de horarios | Slots reales vía `freebusy` del calendario compartido, cruzados con `availability_rules`                                     | El agente solo ofrece 2-3 huecos concretos y nunca uno ya ocupado.                                                                                                                                                                                                                                                                                  |
| Reserva de unidad          | Se mantiene, pero **post-visita**                                                                                            | Máquina de estados: `nuevo → calificando → calificado → cita_agendada → visita_realizada → propuesta_enviada → reserva_pendiente → cerrado_ganado / cerrado_perdido / derivado_humano`, más `cita_no_asistida` y `cita_reprogramada`.                                                                                                               |

## Restricciones técnicas asumidas (no son workarounds)

- **Instagram Messaging**: ventana de 7 días, no se puede iniciar
  conversación en frío, no hay plantillas para reabrir el hilo. La UI marca
  el canal como "solo respuesta" y bloquea el envío fuera de ventana.
  Requiere `instagram_manage_messages` + revisión de app de Meta.
- **WhatsApp**: ventana de servicio de 24 h; fuera de ella, solo plantillas
  aprobadas. El bloqueo del envío libre es a nivel de servicio, no solo de UI.
- **Vercel**: techo de duración por invocación serverless. El drenador
  procesa un lote acotado y vuelve a encolar lo que falte.
- **PDF de cotización**: `pdf-lib` en runtime Node, sin servicio externo de
  terceros.
- **Google Calendar API** es el único proveedor nuevo que este proyecto
  agrega, y solo porque fue pedido explícitamente. `googleapis` con OAuth
  2.0 de una sola cuenta; el refresh token se guarda cifrado
  (`ENCRYPTION_KEY`, AES-256) en `calendar_credentials`, nunca en el
  cliente. La cuota gratuita de la API es amplia, así que no suma costo. Si
  el refresh token se revoca o expira, la agenda deja de funcionar — se
  muestra una alerta explícita en la UI, no un fallo silencioso.
- **La cita es de doble escritura** (fila en `visits` + evento en Google).
  Postgres es la fuente de verdad: primero se toma el slot
  transaccionalmente, luego se crea el evento; si Google falla, la cita
  queda en `pendiente_sincronizacion` y el drenador reintenta. Nunca se
  confirma al cliente una cita que no está asegurada en la base.

## Fase 0 — Notas de implementación

- **Versiones de dependencias.** Al momento de crear el proyecto (julio de
  2026), TypeScript estable llegaba a 5.9.3 (7.x son builds de desarrollo) y
  `@types/react-dom` a 19.2.3; `typescript-eslint` 8.65 todavía no soporta
  TypeScript 7. Se fijaron esas versiones en `package.json`.
- **Next 16 eliminó `eslint.ignoreDuringBuilds`** de `next.config.ts` (ya no
  ejecuta ESLint como parte del build). El lint corre como paso propio en
  `npm run lint` y en CI.
- **`eslint-config-next` cambió su forma de exportar**: en vez de una
  función que devuelve un array de configs, ahora exporta el array
  directamente (`export = config`). El flat config del repo
  (`eslint.config.mjs`) lo usa como `...next` en vez de `...next()`.
- **`npm audit` reporta vulnerabilidades altas en `postcss`/`sharp`
  empaquetados dentro de `next@16.2.12`.** La corrección sugerida
  (`npm audit fix --force`) propone instalar `next@9.3.3`, una versión muy
  anterior — es un falso positivo por un rango de versiones mal acotado en
  la base de datos de asesorías, no un downgrade real disponible. Se deja
  documentado para revisar en cada actualización de Next; no se fuerza el
  downgrade.

## Fase 1 — Notas de implementación

- **Orden de las migraciones y funciones `language sql`.** Postgres
  resuelve los nombres de tabla dentro del cuerpo de una función
  `language sql` en el momento de `CREATE FUNCTION` (a diferencia de
  `language plpgsql`, que los resuelve recién en la primera ejecución). Las
  funciones helper de RLS (`app.current_org_id()`, `app.is_admin()`, etc.)
  consultan `public.users`, así que se movieron a su propia migración
  (`20260729233003_rls_helpers.sql`) **después** de crear esa tabla; antes
  fallaban con "relation public.users does not exist". El trigger
  `proteger_cambio_rol_usuario` (plpgsql) no tuvo este problema aunque
  también llama a `app.is_admin()` y se define antes de que exista.
- **`org_id` en absolutamente todas las tablas**, incluidas las de detalle
  (`unit_media`, `lead_qualification`) que podrían resolverlo por join con
  su padre. Es una simplificación deliberada: las políticas RLS quedan
  todas con la misma forma (`org_id = app.current_org_id()`), más rápidas
  y más fáciles de auditar que políticas basadas en subconsultas.
- **`calendar_credentials` y `job_queue` quedan sin políticas RLS ni
  grants**: no son inaccesibles por descuido, es la decisión — ni siquiera
  un admin las lee directo desde el navegador. El estado de conexión del
  calendario (sin el token) se expone aparte en la vista
  `calendar_connection_status`, cuyo `WHERE` filtra por
  `app.current_org_id()` y `app.is_admin()` usando la identidad de quien
  llama (vía `auth.uid()`), aunque la vista corre con los privilegios de su
  dueño (`security_invoker = false`) para poder leer la tabla base pese a
  que esta no tiene políticas propias.
- **Grants explícitos por tabla.** Los proyectos Supabase nuevos ya no
  auto-exponen las tablas a `anon`/`authenticated` (cambio de plataforma de
  2026). Cada tabla necesita `GRANT` explícito además de la política RLS —
  RLS filtra filas, GRANT habilita la operación. `anon` no recibe ningún
  grant: el navegador nunca usa la anon key para escribir leads
  directamente, siempre pasa por una ruta API del backend con
  `service_role`.
- **`Database` (lib/supabase/database.types.ts) escrito a mano**, porque
  todavía no hay un proyecto Supabase enlazado para correr
  `supabase gen types typescript --linked`. Cada tabla necesita el campo
  `Relationships: []` además de `Row`/`Insert`/`Update` — sin él,
  `@supabase/postgrest-js` no reconoce el tipo como `GenericTable` válido y
  todas las operaciones (`insert`, `update`, `select`) colapsan
  silenciosamente a `never` en vez de dar un error de tipos claro. Este
  archivo se reemplaza por el generado real en cuanto el proyecto esté
  enlazado.
- **`lib/env.ts` se dividió en validadores por área** (`envSupabaseServer`,
  `envAnthropic`, `envMeta`, `envGoogleCalendar`, `envCron`) en vez de un
  único `envServer()` que exigiera todas las variables juntas. Motivo
  concreto: `scripts/seed.ts` solo necesita Supabase, y con el esquema
  combinado de la Fase 0 fallaba pidiendo credenciales de Meta y Google que
  todavía no existen en esta fase.
- **El paquete `server-only` no se usa en `lib/supabase/admin.ts`.** Es un
  guard específico del bundler de Next (siempre lanza fuera de él); como
  `admin.ts` también lo importa `scripts/seed.ts` (un script de Node plano
  ejecutado con `tsx`, fuera del bundler), rompía ese caso. La protección
  en tiempo de ejecución la sigue dando el chequeo de `window` dentro de
  `envSupabaseServer()`.
- **Sin Docker disponible en esta máquina**, así que las migraciones no se
  pudieron validar contra una instancia local antes de aplicarlas al
  proyecto Supabase Cloud de desarrollo — se revisó el SQL manualmente en
  su lugar (orden de dependencias entre tablas, sintaxis de la exclusion
  constraint, de los índices parciales). `npm run db:push` es el primer
  chequeo real contra un servidor Postgres.
- **`turbopack.root`** se fijó explícitamente en `next.config.ts` porque
  existe un `package-lock.json` fuera de esta carpeta (en el perfil de
  Windows del usuario) que Next detectaba como posible raíz de workspace.

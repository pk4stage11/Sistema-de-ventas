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

| Decisión                   | Elegido                                                                                                                      | Por qué / trade-off                                                                                                                                                                                                                                                                                                                                                                                                              |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Multi-inquilino            | Tabla `organizations` + `org_id` en todas las tablas y RLS por organización, operando con **una sola** organización          | Costo casi nulo ahora; evita una migración dolorosa si algún día se necesita multi-inquilino real. No hay onboarding de orgs ni invitaciones todavía.                                                                                                                                                                                                                                                                            |
| Cola / background          | **Vercel Cron + drenador** (`FOR UPDATE SKIP LOCKED`), con disparo inmediato tras el webhook                                 | Cero infraestructura nueva, testeable localmente. Si el volumen lo exige, el mismo código puede correr como worker Node de larga duración en el VPS Hostinger existente (Fase 7) sin cambiar la lógica.                                                                                                                                                                                                                          |
| Canales activos            | Solo WhatsApp + landing, **indefinidamente por ahora** (Messenger/Instagram diferidos)                                       | Decisión explícita del usuario (2026-07-31): "dejemos lo de Meta [Messenger/Instagram] por el momento, solo usemos WhatsApp". La Fase 5 pierde ese alcance — queda solo handoff + plantillas de WhatsApp. `lib/channels/types.ts` conserva `messenger`/`instagram` en el tipo `Canal` (no cuesta nada dejarlos) pero no se construyen sus adaptadores ni se tramita la revisión de app de Meta hasta que se pida explícitamente. |
| Entorno Supabase           | Proyecto Supabase Cloud de desarrollo (no local con Docker)                                                                  | Migraciones vía `supabase db push` contra el remoto. Los tests de RLS y concurrencia pegan a la red — se aíslan en `npm run test:db`, aparte de los unitarios, para no frenar la iteración normal.                                                                                                                                                                                                                               |
| Objetivo del agente        | **La cita agendada en Google Calendar** es el cierre del agente de IA                                                        | Cambia la máquina de estados: el agente llega hasta `cita_agendada`; la visita, la propuesta y la reserva son 100% humanas, gestionadas en la bandeja. Es también la métrica de conversión principal del dashboard.                                                                                                                                                                                                              |
| Google Calendar            | Un solo calendario compartido de la empresa ("Visitas"), una cuenta conectada por OAuth; el asesor asignado va como invitado | Simple, sin depender de que cada asesor autorice individualmente. Trade-off aceptado: el sistema no ve la agenda personal de cada asesor, así que un choque con un evento privado suyo es posible en teoría; se mitiga con el horario de atención configurable (`availability_rules`). Migrar a OAuth por asesor después solo toca `lib/calendar/`.                                                                              |
| Disponibilidad de horarios | Slots reales vía `freebusy` del calendario compartido, cruzados con `availability_rules`                                     | El agente solo ofrece 2-3 huecos concretos y nunca uno ya ocupado.                                                                                                                                                                                                                                                                                                                                                               |
| Reserva de unidad          | Se mantiene, pero **post-visita**                                                                                            | Máquina de estados: `nuevo → calificando → calificado → cita_agendada → visita_realizada → propuesta_enviada → reserva_pendiente → cerrado_ganado / cerrado_perdido / derivado_humano`, más `cita_no_asistida` y `cita_reprogramada`.                                                                                                                                                                                            |

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

### Verificación contra el proyecto Supabase Cloud real (2026-08-01)

Proyecto creado por el usuario: `dgqjaqecnlhvqjgavbvw` (`us-west-2`,
Postgres 17.6). Sin MCP de Supabase disponible en este entorno, se conectó
directamente con la Management API (`https://api.supabase.com`) usando un
token de acceso personal que el usuario pasó por chat — token de **cuenta
completa**, no acotado a este proyecto; se le recomendó rotarlo/revocarlo
después de esta sesión porque quedó en texto plano en la conversación.

- `supabase link --project-ref dgqjaqecnlhvqjgavbvw` + `supabase db push`:
  **las 10 migraciones de la Fase 1 aplicaron limpio, primera vez**, sin
  necesidad de contraseña de base de datos interactiva. Sin Docker
  instalado, el CLI avisa que no pudo cachear el catálogo de migraciones
  para `db diff` — no bloquea el push, solo limita esa funcionalidad
  específica.
- **Bug real encontrado y corregido:** `scripts/seed.ts` y
  `tests/db/setup.ts` usaban `import 'dotenv/config'`, que por defecto solo
  carga un archivo llamado `.env` — `.env.local` es una convención de
  Next.js que el paquete `dotenv` no conoce. Con eso, `npm run db:seed`
  fallaba pidiendo credenciales aunque `.env.local` existiera y estuviera
  bien formado. Se corrigió a `config({ path: '.env.local' })` explícito en
  ambos archivos.
- `npm run db:seed`: creó la organización, el proyecto ("Edificio Vista
  Mar") y las 20 unidades sin errores.
- `npm run test:db`: **5/5 tests pasan** contra la base real — aislamiento
  por organización, bloqueo de aprobación de reserva para rol `asesor`,
  aprobación exitosa para rol `admin`, y bloqueo de auto-promoción de rol.

Con esto, la Fase 1 queda verificada de punta a punta, no solo revisada
manualmente.

## Identidad visual — adopción del sistema de diseño InteresArte

El usuario indicó (2026-07-31) construir la Bandeja siguiendo el mockup
`docs/mockups/10-admin-leads.html` del proyecto **"Inmobiliaria"**
(`C:\Users\crist\Documents\Claude Projects\Inmobiliaria`), que junto con
`_base.css` y `07-admin-dashboard.html` en esa misma carpeta define la
identidad de marca real del negocio: **InteresArte**. Esto reemplaza la
paleta placeholder "verde pizarra/ámbar" inventada en la Fase 0
(`app/globals.css` nunca había salido de este repo, así que no hay nada que
migrar).

- **Tipografía:** Fraunces (serif, títulos/cifras) + Inter (sans, cuerpo),
  cargadas con `next/font/google` (self-hosted, sin FOUC) en vez del
  `@import` de Google Fonts que usa el mockup estático.
- **Color:** teal `#14919B` (marca-500) / `#2BC5CE` (marca-400, acento
  brillante), shell de administración con sidebar `#0E0E0E` fijo. **No** es
  un tema claro/oscuro conmutable — el diseño de referencia no tiene
  variante oscura del panel de contenido, así que no se inventó una (a
  diferencia del enfoque `prefers-color-scheme` de la Fase 0).
- **Iconos:** se evaluó `@tabler/icons-webfont` (el que usa el mockup
  estático) pero son ~127 MB sin tree-shaking; se usó `@tabler/icons-react`
  en su lugar (mismo set de iconos, componentes React, solo se empaquetan
  los que se importan). Se quitó `lucide-react` de la Fase 0, que había
  quedado sin usar — evita mantener dos librerías de iconos.
- **Componentes propios en vez de shadcn/ui todavía:** `components/ui/chip.tsx`
  y `badge.tsx` son bespoke, no de shadcn. El stack del plan original dice
  "Tailwind + shadcn/ui", pero para esta primera pantalla (chips de filtro,
  pills de estado/canal) shadcn no aporta nada que no sea más rápido
  escribir a mano sobre esta marca específica; se instala cuando haga falta
  un primitivo más complejo (diálogos, dropdowns).
- **Bandeja construida antes de tiempo respecto al plan de fases:** el plan
  original ubica la Bandeja en la Fase 3 (con Realtime) y pide no avanzar
  de fase sin revisión. Esta primera versión (`app/(app)/inbox/`) usa datos
  de muestra (`mock-data.ts`) y replica el layout de `10-admin-leads.html`
  — lista de consultas con chips de filtro, no todavía el layout de 3
  columnas con hilo de conversación que describe el plan de la Fase 3. Se
  construyó ahora porque no depende del backend y el usuario lo pidió
  explícitamente mientras el resto de la Fase 1 sigue bloqueado en
  credenciales de Supabase. **Pendiente:** validar visualmente en un
  navegador real (el screenshot automático falló porque el panel del
  navegador no estaba visible en el cliente del usuario; se verificó por
  accesibilidad, texto renderizado, red y consola) y revisar el
  comportamiento responsive del sidebar en móvil, que todavía no colapsa.
- **Catálogo y Agenda (2026-08-01), mismo criterio.** `app/(app)/catalogo/`
  replica `08-admin-propiedades.html`, adaptado al esquema real (`units` +
  `projects` en vez del modelo "propiedad" plana del mockup: se quitó la
  columna Venta/Alquiler, que no aplica — este es un proyecto de desarrollo
  vendiendo unidades propias, no un listado mixto de venta/alquiler de
  terceros — y se agregó Piso/m² que sí importan acá). Los chips de estado
  (`disponible`/`reservado`/`vendido`) mapean 1:1 al `estado` real de
  `units`. El buscador y los filtros sí son interactivos (no placeholders
  visuales), a diferencia del mockup estático.

  `app/(app)/agenda/` **no tiene mockup de referencia** — la pantalla es
  nueva de esta plataforma (agendamiento con Google Calendar), no existía
  en el sitio InteresArte original. Se diseñó a mano siguiendo el mismo
  sistema visual: lista de visitas agrupada por fecha, con badge de
  `sync_status` (solo visible cuando _no_ está sincronizado — un error se
  ve en rojo, "sincronizando" en ámbar) y acciones de asistencia
  (asistió/no asistió) cuando la visita sigue pendiente. Se agregó un
  color `error` (rojo) nuevo a `components/ui/badge.tsx`, que no existía
  hasta ahora porque ninguna pantalla anterior necesitaba señalar un
  fallo.

  Ambas se verificaron en un navegador real esta vez (con el dev server
  corriendo): sin errores de consola, filtros y buscador probados
  interactivamente con clics reales, no solo lectura de accesibilidad.

## Fase 2 — Notas de implementación

- **El webhook de WhatsApp encola; no ingiere en línea.** El diseño
  original de esta fase hacía todo el trabajo (contacto, conversación,
  mensaje) dentro del propio handler del webhook. Se cambió: el `POST` de
  `/api/webhooks/whatsapp` solo verifica la firma, normaliza y hace un
  único `INSERT` en `job_queue`, después responde `200`. Motivo: Meta
  reintenta el webhook si tarda o no responde 200 — minimizar el trabajo
  antes de responder importa de verdad, no es prematuro. El endpoint de
  landing (`/api/leads/inbound`), en cambio, **sí ingiere sincrónico**
  (llama `ingestInboundMessage` directo, sin pasar por la cola): el
  volumen es bajo, no hay un sistema externo reintentando agresivamente, y
  necesita el `contact_id` de inmediato para registrar el consentimiento
  (Ley 29733) en la misma request.
- **`dequeue_jobs(p_lote)` — función de Postgres nueva** (migración
  `20260801010000`). PostgREST no expone `SELECT ... FOR UPDATE SKIP
LOCKED` desde el cliente (cada request de supabase-js es su propia
  transacción sin control de locking) — sin esta función, dos
  invocaciones concurrentes del drenador tomarían el mismo job. Se llama
  vía `.rpc('dequeue_jobs', ...)`, con permiso de ejecución solo para
  `service_role`.
- **El drenador (`lib/queue/drain.ts`, `/api/cron/drain`) se construyó en
  esta fase, no en la Fase 4 como sugería el plan original.** Sin él,
  "ingesta" no era demostrable — los mensajes quedaban como filas inertes
  en `job_queue`, nunca se volvían contactos/conversaciones/mensajes
  reales. Hoy el drenador solo ingiere; en la Fase 4 se extiende para
  además invocar al agente después de ingerir, sobre la misma
  infraestructura (reintentos con backoff exponencial, tope 30 min, hasta
  `max_intentos`).
- **`after()` de `next/server`** dispara el drenado inmediatamente después
  de responder al webhook (el "disparo inmediato" que menciona el plan,
  además del minuto de Vercel Cron). No se probó en un test unitario
  porque `after()` necesita el contexto de request real de Next —
  solo se ejecuta cuando `mensajes.length > 0`, así que los tests de firma
  inválida (que nunca llegan a esa línea) no lo tocan. El camino feliz
  completo se verificó con `scripts/simulate-webhook.ts` contra
  `npm run dev` real.
- **`envMeta()` se dividió en `envMetaWebhook()` y `envWhatsappSend()`**,
  mismo motivo que la división de `envServer()` en la Fase 1: el webhook
  de ingesta no necesita `WHATSAPP_PHONE_NUMBER_ID`/`WHATSAPP_ACCESS_TOKEN`
  (esas son para _enviar_, Fase 4 en adelante) y exigirlas juntas rompía
  poder probar el webhook localmente sin tener todavía una app de Meta
  real.
- **Credenciales de Meta para desarrollo local son generadas, no reales.**
  `META_APP_SECRET` y `META_WEBHOOK_VERIFY_TOKEN` en `.env.local` son
  valores aleatorios propios (no emitidos por Meta) — funcionan porque
  `scripts/simulate-webhook.ts` firma con el mismo secreto. Cuando haya
  una app de Meta real (Fase 7, checklist de Meta Business), estos se
  reemplazan por los que Meta asigna.
- **Honeypot responde 200 igual.** `esEnvioHoneypot()` no rechaza con un
  código de error — devolver 400/403 le confirmaría a un bot de envío
  automático que fue detectado. Se responde `{ok:true}` y simplemente no
  se procesa nada. Verificado manualmente: el contacto del honeypot nunca
  se creó en la base.
- **Rate limiting en memoria, no distribuido** (`lib/security/rate-limit.ts`):
  documentado como limitación conocida — en Vercel con varias instancias
  concurrentes el límite es "N por IP por instancia", no global. Suficiente
  para el volumen actual (bootstrapped); Upstash Redis es el siguiente
  paso si hace falta. Se verificó manualmente con 6 requests seguidos
  desde la misma IP: el 6to (de hecho, ya el 2do — las pruebas anteriores
  en la misma sesión del servidor habían consumido parte de la cuota,
  porque curl desde localhost no manda `x-forwarded-for` y todas mis
  pruebas comparten la clave `landing:desconocida`) devolvió 429.
  Comportamiento correcto, no un bug — en producción (Vercel) esa cabecera
  siempre viene poblada.
- **Verificación end-to-end real (2026-08-01):** contra el proyecto
  Supabase real y `npm run dev` real, no solo tests: `simulate-webhook.ts`
  firmado → 200 → `after()` drena → contacto, conversación y mensaje
  aparecen en la base con el texto correcto. Endpoint de landing probado
  con envío válido (200, consentimiento registrado), honeypot (200, nada
  creado), sin consentimiento (400), sin contacto (400), rate limit (429).
  GET de verificación del webhook (200 con el challenge correcto, 403 con
  token incorrecto) y `/api/cron/drain` (401 sin `CRON_SECRET`, 200 con
  el correcto) probados igual. 26 tests unitarios + 8 tests de `test:db`
  (5 de RLS de la Fase 1 + 3 nuevos de idempotencia de ingesta), todos
  pasando.

## Fase 3 — Notas de implementación

- **La autenticación no estaba planificada como su propia fase, pero era un
  prerequisito real, no opcional.** Realtime + RLS necesitan una sesión de
  usuario auténtica — un asesor solo recibe eventos de su propia
  organización porque `postgres_changes` respeta las mismas políticas RLS
  que las queries normales, evaluadas contra el JWT de quien está
  conectado. Sin login no había forma honesta de mostrar datos reales (la
  alternativa habría sido usar `service_role` desde el navegador, que es
  exactamente lo que la Fase 1 prohíbe). Se construyó lo mínimo: login por
  email/contraseña con `@supabase/ssr` (`lib/supabase/server.ts` para
  Server Components/Actions, `lib/supabase/client.ts` para el navegador,
  `proxy.ts` para refrescar la sesión y proteger rutas), logout, y un
  usuario admin real creado por `scripts/seed.ts`
  (`admin@interesarte.pe`, contraseña generada e impresa una sola vez). No
  hay registro propio ni recuperación de contraseña — los asesores los da
  de alta un admin, como dice el plan original.
- **`middleware.ts` → `proxy.ts`.** Next 16 renombró la convención (el
  archivo sigue funcionando con el nombre viejo, pero con un warning de
  deprecación); además la función exportada tiene que llamarse `proxy`
  (o ser el export default), no `middleware`.
- **Bug real encontrado: `envPublic()` no funcionaba en el navegador.**
  El refactor de la Fase 1 que dividió `lib/env.ts` en validadores por
  área cambió `envPublic()` para usar el mismo helper genérico
  `parsear(schema, process.env)` que las funciones server-only. Eso rompe
  en el cliente: Next.js solo puede inlinear `NEXT_PUBLIC_*` en el bundle
  del navegador cuando la lectura es una expresión estática literal
  (`process.env.NEXT_PUBLIC_X`) reconocible por su compilador — pasarle el
  objeto `process.env` completo a Zod en runtime no lo es, y en el
  navegador ese objeto ni siquiera existe de verdad. El bug no se había
  manifestado hasta ahora porque ningún Client Component había llamado
  `envPublic()` antes (recién con `lib/supabase/client.ts`, que hace falta
  para las suscripciones de Realtime). Se revirtió `envPublic()` a acceso
  estático explícito por variable; las demás funciones de `env.ts`
  (todas server-only) están bien como están.
- **`conversation_list` — vista nueva** (migración `20260801030000`):
  PostgREST no soporta "el último N por grupo" en un solo `select` con
  embeds, así que se resuelve con `distinct on` en una vista. A diferencia
  de `calendar_connection_status` (que necesita `security_invoker=false`
  porque la tabla base está completamente cerrada), esta va con
  `security_invoker=true` a propósito: debe respetar el RLS normal de
  quien la consulta, igual que si hiciera la query a las tablas directo.
- **Embeds de PostgREST evitados en el código de la app.** Con
  `Relationships: []` en todo `database.types.ts` (no hay codegen real
  todavía, ver nota de la Fase 1), una sintaxis como
  `.select('estado, projects(name)')` no tipa de forma confiable. El panel
  del lead hace dos queries simples en cascada en vez de un embed.
- **Suscripción única por organización, no por conversación.** Un solo
  canal de Realtime (`postgres_changes` en `messages`, filtrado por
  `org_id`) alimenta tanto el hilo abierto como la lista completa —
  evita mantener N suscripciones activas. El valor de la conversación
  seleccionada se lee de un `ref` (no del estado) dentro del callback,
  porque la suscripción vive todo el ciclo de vida del componente y no se
  vuelve a crear cada vez que el asesor cambia de conversación.
- **`react-hooks/set-state-in-effect`** (regla nueva del plugin de
  ESLint): marcó `setState` síncrono en la rama de retorno anticipado de
  un efecto (limpiar estado cuando la dependencia pasa a `null`). Se
  resolvió envolviendo la lógica del efecto en un IIFE async — el patrón
  correcto de todos modos para efectos con lógica asíncrona — en vez de
  desactivar la regla.
- **Fase 3 es de solo lectura, como pide el plan**: no hay forma de
  responder desde la bandeja todavía (se avisa explícitamente en el hilo).
  Catálogo y Agenda siguen con datos de muestra — no se tocaron en esta
  fase.
- **Verificación real, no solo el criterio mínimo del plan.** Se hizo la
  verificación pedida explícitamente (insertar un mensaje por SQL directo
  y verlo aparecer sin recargar — funcionó) más un flujo completo con
  Playwright-en-navegador real: login con el admin real, navegación
  protegida por `proxy.ts` (redirige a `/login` sin sesión), datos reales
  de la Fase 2 visibles en la bandeja (incluida la conversación de
  WhatsApp simulada y los envíos de landing), badge de ventana de 24h de
  WhatsApp calculado correctamente, panel del lead mostrando "todavía no
  lo calificó el agente de IA" (correcto — el agente no existe hasta la
  Fase 4), y logout. Sin errores de consola en ningún paso.

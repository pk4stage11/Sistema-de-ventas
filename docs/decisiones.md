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
- **`turbopack.root`** se fijó explícitamente en `next.config.ts` porque
  existe un `package-lock.json` fuera de esta carpeta (en el perfil de
  Windows del usuario) que Next detectaba como posible raíz de workspace.

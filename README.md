# Plataforma de Agentes IA — Inmobiliaria

Agentes conversacionales de IA que atienden leads de una inmobiliaria peruana
por WhatsApp, Messenger, Instagram Direct y formularios de landing page, los
califican, y los llevan hasta **una visita agendada en Google Calendar con un
asesor**. De ahí en adelante el proceso lo lleva un humano en una bandeja
unificada: la visita, la propuesta comercial y la solicitud de reserva se
revisan y cierran ahí.

> El plan de fases y las decisiones de arquitectura completas están en
> [`docs/decisiones.md`](docs/decisiones.md). Este README cubre arquitectura,
> el flujo de un mensaje entrante y el setup local.

## Stack

| Capa                    | Tecnología                                                                                                       |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Frontend + hosting      | Next.js 16 (App Router, TypeScript) en Vercel, Tailwind + shadcn/ui                                              |
| Backend                 | Rutas API de Next.js, runtime **Node** (no Edge) — necesario para verificar firmas HMAC y usar librerías nativas |
| Datos / Auth / Realtime | Supabase: Postgres, Row Level Security, Auth, Realtime, Storage, `pgvector`                                      |
| IA                      | SDK de Anthropic (Claude), tool use, prompts versionados en `lib/agent/`                                         |
| Canales                 | WhatsApp Cloud API, Messenger e Instagram vía Meta Graph API                                                     |
| Agenda                  | Google Calendar API (una cuenta de la empresa)                                                                   |

No hay capa de orquestación externa (n8n ni similar): los webhooks, la cola y
el agente viven en el propio proyecto Next.js, versionados en este repo.

## Arquitectura y flujo de un mensaje entrante

```
Canales (WhatsApp / Messenger / Instagram / Landing)
   │  webhook (GET hub.challenge  +  POST con X-Hub-Signature-256)
   ▼
/api/webhooks/meta/[platform]   → verifica firma → normaliza → encola → 200
/api/leads/inbound              → Zod + rate limit + honeypot → encola → 200
   │
   ▼  tabla  job_queue  (idempotencia por message_external_id)
/api/cron/drain  (Vercel Cron, cada minuto + disparo inmediato)
   │
   ▼  runAgentTurn()  → Claude con tool use → tools → agent_runs
   │
   ▼  Supabase Postgres  ──Realtime──►  Bandeja Next.js
   │
   ▼  outbound: sendMessage(channel) con guarda de ventana de 24 h
   │
   └─►  cierre del agente: consultar_disponibilidad / agendar_visita
             → visits (Postgres = fuente de verdad, slot bloqueado)
             → Google Calendar API (evento en el calendario "Visitas")
             → módulo de Agenda + recordatorios 24 h / 2 h antes
```

Principios que gobiernan este flujo:

- **El canal es invisible para la lógica de negocio.** Todo mensaje entrante
  se normaliza a `InboundMessage` ([`lib/channels/types.ts`](lib/channels/types.ts))
  antes de tocar el agente o la bandeja.
- **El webhook responde rápido y no procesa en línea.** Se valida la firma,
  se normaliza, se encola con `message_external_id` como clave de
  idempotencia (Meta reintenta), y se responde `200` de inmediato. El
  drenador (`/api/cron/drain`) procesa la cola con `SKIP LOCKED`.
- **Postgres es la fuente de verdad de una cita**, no Google Calendar. El
  slot se bloquea primero en la base; el evento en Google se crea después y
  se reintenta si falla.

## Estructura del repositorio

```
app/
  (app)/inbox|agenda|catalogo|reservas|dashboard/   UI de asesores
  api/auth/google/callback/route.ts                 OAuth de Google Calendar
  api/webhooks/meta/[platform]/route.ts              runtime = 'nodejs'
  api/leads/inbound/route.ts
  api/cron/drain/route.ts
lib/
  channels/       adaptadores por canal + normalize.ts (→ InboundMessage único)
  queue/          enqueue.ts / drain.ts
  agent/          prompt.ts (única fuente del system prompt), tools/*.ts, state-machine.ts
  calendar/       google.ts (freebusy/eventos), slots.ts (lógica pura, sin red)
  rag/            embed.ts / search.ts sobre pgvector
  supabase/       server.ts / client.ts / admin.ts — admin nunca se importa en cliente
  env.ts          validación de variables de entorno (Zod)
supabase/migrations/   SQL versionado
docs/                   meta-setup.md, decisiones.md, prompts/
tests/{unit,contract/fixtures,db}
```

## Setup local

### Requisitos

- Node.js ≥ 20.9 (probado con Node 24)
- Una cuenta y proyecto en [Supabase Cloud](https://supabase.com)
- Una app en [Meta for Developers](https://developers.facebook.com) (Fase 2 en adelante)
- Credenciales OAuth de Google Cloud Console (Fase 4.5 en adelante)

### Pasos

```bash
npm install
cp .env.example .env.local
# completa .env.local con tus credenciales — ver comentarios en el propio archivo
npm run dev
```

Comandos principales:

```bash
npm run dev          # servidor de desarrollo
npm run build         # build de producción
npm run lint           # ESLint
npm run format:check   # verifica formato (Prettier)
npm run typecheck      # tsc --noEmit
npm run test            # tests unitarios (rápidos, sin red) — corre en CI
npm run test:db          # tests contra Supabase Cloud de desarrollo (RLS, concurrencia)
npm run db:push            # aplica migraciones al proyecto Supabase
npm run db:seed              # carga el seed (inmobiliaria ficticia + unidades)
```

## Estado del proyecto

Ver el checklist de fases en la página principal de la app (`app/page.tsx`) y
el detalle de cada fase en [`docs/decisiones.md`](docs/decisiones.md).

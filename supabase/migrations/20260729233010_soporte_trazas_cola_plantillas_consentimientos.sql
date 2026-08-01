-- Traza de cada turno del agente: input, tools invocadas, output, tokens y
-- latencia. Se escribe solo desde el backend (runAgentTurn), nunca desde
-- el cliente.
create table public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  conversation_id uuid not null references public.conversations (id),
  lead_id uuid references public.leads (id),
  input jsonb,
  tools_called jsonb not null default '[]'::jsonb,
  output text,
  tokens_entrada int,
  tokens_salida int,
  latencia_ms int,
  modelo text,
  created_at timestamptz not null default now()
);

create index agent_runs_org_id_idx on public.agent_runs (org_id);
create index agent_runs_conversation_id_idx on public.agent_runs (conversation_id, created_at);

-- Bitácora de auditoría, de solo agregado (sin update/delete): quién hizo
-- qué y cuándo, en particular las acciones de aprobar/rechazar reserva.
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  user_id uuid references public.users (id), -- null = sistema / agente de IA
  accion text not null,
  entidad text not null,
  entidad_id uuid,
  detalle jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_org_id_idx on public.audit_log (org_id, created_at);
create index audit_log_entidad_idx on public.audit_log (entidad, entidad_id);

-- Embeddings del catálogo (RAG, Fase 4) sobre pgvector. La dimensión 1024
-- corresponde a los modelos de embeddings de Voyage AI (voyage-3 /
-- voyage-3-large), recomendados por Anthropic; se confirma al implementar
-- lib/rag/embed.ts en la Fase 4 y es ajustable con una migración posterior
-- si cambia el modelo elegido. El índice de similitud (hnsw/ivfflat) se
-- crea en esa misma fase, cuando ya haya datos que indexar.
create table public.catalog_embeddings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  project_id uuid references public.projects (id),
  unit_id uuid references public.units (id),
  content text not null,
  embedding vector(1024),
  created_at timestamptz not null default now()
);

create index catalog_embeddings_org_id_idx on public.catalog_embeddings (org_id);

-- Cola de background para el drenador (/api/cron/drain, SKIP LOCKED).
-- message_external_id es la clave de idempotencia para los jobs que
-- procesan un mensaje entrante; otros tipos de job no la usan.
create table public.job_queue (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  tipo text not null check (
    tipo in ('procesar_mensaje', 'enviar_recordatorio', 'sincronizar_calendario')
  ),
  payload jsonb not null,
  message_external_id text,
  estado text not null default 'pendiente' check (
    estado in ('pendiente', 'procesando', 'completado', 'fallido')
  ),
  intentos int not null default 0,
  max_intentos int not null default 5,
  disponible_en timestamptz not null default now(),
  error text,
  created_at timestamptz not null default now(),
  procesado_en timestamptz
);

create unique index job_queue_idempotencia_idx
  on public.job_queue (org_id, message_external_id)
  where message_external_id is not null;

create index job_queue_drenado_idx
  on public.job_queue (disponible_en)
  where estado = 'pendiente';

-- Plantillas de WhatsApp aprobadas por Meta, para enviar fuera de la
-- ventana de servicio de 24 h.
create table public.whatsapp_templates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  nombre text not null,
  idioma text not null default 'es_PE',
  categoria text not null check (categoria in ('marketing', 'utilidad', 'autenticacion')),
  estado_meta text not null default 'pendiente' check (
    estado_meta in ('pendiente', 'aprobada', 'rechazada')
  ),
  variables jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (org_id, nombre, idioma)
);

create index whatsapp_templates_org_id_idx on public.whatsapp_templates (org_id);

-- Consentimiento explícito (Ley 29733): fecha, canal y texto mostrado.
-- Registro inmutable — una corrección se hace agregando una fila nueva,
-- no editando la anterior.
create table public.consents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  contact_id uuid not null references public.contacts (id),
  canal text not null,
  texto_mostrado text not null,
  otorgado boolean not null,
  fecha timestamptz not null default now(),
  ip text,
  created_at timestamptz not null default now()
);

create index consents_org_id_idx on public.consents (org_id);
create index consents_contact_id_idx on public.consents (contact_id);

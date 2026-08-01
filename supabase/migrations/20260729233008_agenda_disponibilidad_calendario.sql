-- Reglas de horario de atención, cruzadas con freebusy de Google para
-- calcular los slots que el agente puede ofrecer (lib/calendar/slots.ts).
create table public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  dia_semana int not null check (dia_semana between 0 and 6), -- 0 = domingo
  hora_inicio time not null,
  hora_fin time not null,
  duracion_visita_minutos int not null default 45,
  buffer_minutos int not null default 15,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  constraint availability_rules_horario_valido check (hora_fin > hora_inicio)
);

create index availability_rules_org_id_idx on public.availability_rules (org_id);

-- Visita agendada. Postgres es la fuente de verdad de la cita (no Google):
-- el slot se bloquea aquí primero, el evento en Google se crea después y
-- se reintenta si falla (sync_status). La exclusion constraint impide que
-- un mismo asesor termine con dos visitas que se pisan en el tiempo, sin
-- necesidad de un SELECT ... FOR UPDATE manual.
create table public.visits (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  lead_id uuid not null references public.leads (id),
  project_id uuid references public.projects (id),
  unit_id uuid references public.units (id),
  asesor_id uuid not null references public.users (id),
  inicio timestamptz not null,
  fin timestamptz not null,
  google_event_id text,
  sync_status text not null default 'pendiente_sincronizacion' check (
    sync_status in ('pendiente_sincronizacion', 'sincronizado', 'error')
  ),
  asistencia text not null default 'pendiente' check (
    asistencia in ('pendiente', 'asistio', 'no_asistio', 'reprogramada')
  ),
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint visits_rango_valido check (fin > inicio),
  exclude using gist (asesor_id with =, tstzrange(inicio, fin, '[)') with &&)
);

create index visits_org_id_idx on public.visits (org_id);
create index visits_lead_id_idx on public.visits (lead_id);
create index visits_asesor_id_idx on public.visits (asesor_id, inicio);

create trigger trg_visits_set_updated_at
  before update on public.visits
  for each row execute function public.set_updated_at();

-- Credenciales de la cuenta de Google de la empresa (calendario único
-- compartido "Visitas"). Tabla completamente cerrada al cliente: sin
-- políticas RLS que la expongan, solo accesible vía service_role desde el
-- servidor. El refresh token se cifra en la aplicación (ENCRYPTION_KEY)
-- antes de guardarse aquí; esta columna nunca debe leerse desde el
-- navegador. El estado de conexión, sin datos sensibles, se expone en la
-- vista `calendar_connection_status` (ver migración de RLS).
create table public.calendar_credentials (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null unique references public.organizations (id),
  calendar_id text not null,
  refresh_token_cifrado text not null,
  access_token_cache text,
  token_expira_en timestamptz,
  conectado_por uuid references public.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_calendar_credentials_set_updated_at
  before update on public.calendar_credentials
  for each row execute function public.set_updated_at();

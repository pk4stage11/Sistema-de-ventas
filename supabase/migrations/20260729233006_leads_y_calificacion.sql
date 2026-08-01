-- Máquina de estados del lead. El cierre del agente de IA es
-- `cita_agendada`; de ahí en adelante el flujo es humano (ver
-- docs/decisiones.md). La validez de las *transiciones* (no solo de los
-- valores) se aplica en lib/agent/state-machine.ts a partir de la Fase 4.
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  contact_id uuid not null references public.contacts (id),
  project_id uuid,
  assigned_user_id uuid references public.users (id),
  estado text not null default 'nuevo' check (
    estado in (
      'nuevo', 'calificando', 'calificado',
      'cita_agendada', 'visita_realizada', 'cita_no_asistida', 'cita_reprogramada',
      'propuesta_enviada', 'reserva_pendiente',
      'cerrado_ganado', 'cerrado_perdido', 'derivado_humano'
    )
  ),
  score int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index leads_org_id_idx on public.leads (org_id);
create index leads_contact_id_idx on public.leads (contact_id);
create index leads_estado_idx on public.leads (org_id, estado);

create trigger trg_leads_set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

-- Calificación obligatoria antes de proponer unidades (regla dura del
-- agente, Fase 4). Relación 1:1 con el lead.
create table public.lead_qualification (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  lead_id uuid not null unique references public.leads (id),
  tipo_inmueble text,
  distrito text,
  presupuesto_min numeric,
  presupuesto_max numeric,
  forma_pago text check (forma_pago in ('contado', 'credito_hipotecario')),
  banco text,
  precalificado boolean,
  plazo_decision text,
  primera_vivienda boolean,
  notas text,
  updated_at timestamptz not null default now()
);

create index lead_qualification_org_id_idx on public.lead_qualification (org_id);

create trigger trg_lead_qualification_set_updated_at
  before update on public.lead_qualification
  for each row execute function public.set_updated_at();

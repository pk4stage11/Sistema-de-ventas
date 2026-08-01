create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  lead_id uuid not null references public.leads (id),
  unit_id uuid not null references public.units (id),
  condiciones jsonb not null default '{}'::jsonb,
  storage_path text,
  generado_por text not null check (generado_por in ('ia', 'humano')),
  created_at timestamptz not null default now()
);

create index quotes_org_id_idx on public.quotes (org_id);
create index quotes_lead_id_idx on public.quotes (lead_id);

-- Solicitud de reserva: el agente de IA nunca cobra, solo crea esta
-- solicitud en estado pendiente para que un humano la revise en la
-- bandeja (Fase 6).
create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  lead_id uuid not null references public.leads (id),
  unit_id uuid not null references public.units (id),
  estado text not null default 'pendiente' check (
    estado in ('pendiente', 'aprobada', 'rechazada', 'mas_informacion')
  ),
  monto_separacion numeric,
  comprobante_url text,
  creado_por_ia boolean not null default false,
  creado_por uuid references public.users (id),
  revisado_por uuid references public.users (id),
  revisado_en timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reservations_org_id_idx on public.reservations (org_id);
create index reservations_unit_id_idx on public.reservations (unit_id);

-- Imposible tener dos reservas activas (pendiente o aprobada) sobre la
-- misma unidad: es lo que hace la doble reserva inviable a nivel de base
-- de datos, no solo de lógica de aplicación.
create unique index reservations_unit_activa_idx
  on public.reservations (unit_id)
  where estado in ('pendiente', 'aprobada');

create trigger trg_reservations_set_updated_at
  before update on public.reservations
  for each row execute function public.set_updated_at();

-- Al aprobar una reserva, la unidad pasa a "vendido" en la misma
-- transacción del UPDATE (no requiere que el llamador recuerde hacerlo).
create or replace function public.marcar_unidad_al_aprobar_reserva()
returns trigger
language plpgsql
as $$
begin
  if new.estado = 'aprobada' and old.estado is distinct from 'aprobada' then
    update public.units set estado = 'vendido' where id = new.unit_id;
  end if;
  return new;
end;
$$;

create trigger trg_reservations_marcar_unidad
  after update on public.reservations
  for each row execute function public.marcar_unidad_al_aprobar_reserva();

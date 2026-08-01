-- Una sola organización operativa por ahora, pero el aislamiento por
-- org_id + RLS se implementa desde el día uno (ver docs/decisiones.md).
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- Perfil sobre auth.users. Un registro por asesor/admin/supervisor.
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  org_id uuid not null references public.organizations (id),
  full_name text not null,
  role text not null check (role in ('admin', 'asesor', 'supervisor')),
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index users_org_id_idx on public.users (org_id);

create trigger trg_users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- Protección a nivel de fila: solo un admin puede cambiar el rol o mover a
-- alguien de organización. RLS controla quién puede intentar el UPDATE;
-- este trigger es la segunda capa porque RLS no distingue columnas.
-- service_role bypassa RLS a nivel de fila pero los triggers igual se
-- disparan: el backend (seed, server actions administrativas) usa
-- service_role y debe poder promover/mover usuarios sin JWT de un admin.
create or replace function public.proteger_cambio_rol_usuario()
returns trigger
language plpgsql
as $$
begin
  if (new.role is distinct from old.role or new.org_id is distinct from old.org_id)
     and auth.role() <> 'service_role'
     and not app.is_admin() then
    raise exception 'Solo un administrador puede cambiar el rol o la organización de un usuario';
  end if;
  return new;
end;
$$;

create trigger trg_users_proteger_rol
  before update on public.users
  for each row execute function public.proteger_cambio_rol_usuario();

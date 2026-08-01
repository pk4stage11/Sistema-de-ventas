create table public.projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  name text not null,
  distrito text,
  direccion text,
  descripcion text,
  fecha_entrega date,
  avance_obra text,
  areas_comunes text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_org_id_idx on public.projects (org_id);

create trigger trg_projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- Ahora que projects existe, se cierra la referencia diferida de leads.
alter table public.leads
  add constraint leads_project_id_fkey foreign key (project_id) references public.projects (id);

create table public.units (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  project_id uuid not null references public.projects (id),
  codigo text not null,
  tipologia text,
  m2 numeric,
  dormitorios int,
  banos int,
  piso int,
  precio numeric not null,
  estado text not null default 'disponible' check (estado in ('disponible', 'reservado', 'vendido')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, codigo)
);

create index units_org_id_idx on public.units (org_id);
create index units_project_id_idx on public.units (project_id);
create index units_estado_idx on public.units (org_id, estado);

create trigger trg_units_set_updated_at
  before update on public.units
  for each row execute function public.set_updated_at();

create table public.unit_media (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  unit_id uuid not null references public.units (id),
  tipo text not null check (tipo in ('foto', 'plano', 'video')),
  storage_path text not null,
  orden int not null default 0,
  created_at timestamptz not null default now()
);

create index unit_media_org_id_idx on public.unit_media (org_id);
create index unit_media_unit_id_idx on public.unit_media (unit_id, orden);

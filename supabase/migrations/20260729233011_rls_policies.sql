-- Row Level Security en todas las tablas, aislamiento por organización y
-- por rol (admin | asesor | supervisor). Ver docs/decisiones.md.
--
-- Nota sobre grants: en Supabase, las tablas nuevas ya NO se auto-exponen
-- a los roles `anon`/`authenticated` (comportamiento por defecto desde
-- 2026). El acceso requiere GRANT explícito además de la política RLS —
-- RLS filtra filas, GRANT habilita la operación en la tabla. `anon` no
-- recibe ningún grant: el formulario de landing y los webhooks de Meta
-- los procesa el backend con la service_role key, nunca el navegador.

grant usage on schema public to authenticated;
grant usage on schema public to service_role;

-- ─────────────────────────────────────────────────────────────────────────
-- organizations: cada usuario ve únicamente su propia organización.
-- ─────────────────────────────────────────────────────────────────────────
alter table public.organizations enable row level security;
grant select on public.organizations to authenticated;

create policy organizations_select on public.organizations
  for select
  using (id = app.current_org_id());

-- ─────────────────────────────────────────────────────────────────────────
-- users
-- ─────────────────────────────────────────────────────────────────────────
alter table public.users enable row level security;
grant select, insert, update on public.users to authenticated;

create policy users_select_org on public.users
  for select
  using (org_id = app.current_org_id());

create policy users_insert_admin on public.users
  for insert
  with check (org_id = app.current_org_id() and app.is_admin());

-- El cambio de `role`/`org_id` lo bloquea el trigger
-- proteger_cambio_rol_usuario; esta política solo exige pertenecer a la
-- organización (permite auto-edición de perfil y edición por un admin).
create policy users_update_propio_o_admin on public.users
  for update
  using (org_id = app.current_org_id() and (id = auth.uid() or app.is_admin()))
  with check (org_id = app.current_org_id());

-- ─────────────────────────────────────────────────────────────────────────
-- channels — configuración de canal: solo admin la crea/edita.
-- ─────────────────────────────────────────────────────────────────────────
alter table public.channels enable row level security;
grant select, insert, update on public.channels to authenticated;

create policy channels_select_org on public.channels
  for select using (org_id = app.current_org_id());

create policy channels_insert_admin on public.channels
  for insert with check (org_id = app.current_org_id() and app.is_admin());

create policy channels_update_admin on public.channels
  for update
  using (org_id = app.current_org_id() and app.is_admin())
  with check (org_id = app.current_org_id());

-- ─────────────────────────────────────────────────────────────────────────
-- contacts
-- ─────────────────────────────────────────────────────────────────────────
alter table public.contacts enable row level security;
grant select, insert, update on public.contacts to authenticated;

create policy contacts_select_org on public.contacts
  for select using (org_id = app.current_org_id());

create policy contacts_insert_org on public.contacts
  for insert with check (org_id = app.current_org_id());

create policy contacts_update_org on public.contacts
  for update
  using (org_id = app.current_org_id())
  with check (org_id = app.current_org_id());

-- ─────────────────────────────────────────────────────────────────────────
-- conversations
-- ─────────────────────────────────────────────────────────────────────────
alter table public.conversations enable row level security;
grant select, insert, update on public.conversations to authenticated;

create policy conversations_select_org on public.conversations
  for select using (org_id = app.current_org_id());

create policy conversations_insert_org on public.conversations
  for insert with check (org_id = app.current_org_id());

create policy conversations_update_org on public.conversations
  for update
  using (org_id = app.current_org_id())
  with check (org_id = app.current_org_id());

-- ─────────────────────────────────────────────────────────────────────────
-- messages — inmutables una vez enviados: solo select/insert.
-- ─────────────────────────────────────────────────────────────────────────
alter table public.messages enable row level security;
grant select, insert on public.messages to authenticated;

create policy messages_select_org on public.messages
  for select using (org_id = app.current_org_id());

create policy messages_insert_org on public.messages
  for insert with check (org_id = app.current_org_id());

-- ─────────────────────────────────────────────────────────────────────────
-- leads
-- ─────────────────────────────────────────────────────────────────────────
alter table public.leads enable row level security;
grant select, insert, update on public.leads to authenticated;

create policy leads_select_org on public.leads
  for select using (org_id = app.current_org_id());

create policy leads_insert_org on public.leads
  for insert with check (org_id = app.current_org_id());

create policy leads_update_org on public.leads
  for update
  using (org_id = app.current_org_id())
  with check (org_id = app.current_org_id());

-- ─────────────────────────────────────────────────────────────────────────
-- lead_qualification
-- ─────────────────────────────────────────────────────────────────────────
alter table public.lead_qualification enable row level security;
grant select, insert, update on public.lead_qualification to authenticated;

create policy lead_qualification_select_org on public.lead_qualification
  for select using (org_id = app.current_org_id());

create policy lead_qualification_insert_org on public.lead_qualification
  for insert with check (org_id = app.current_org_id());

create policy lead_qualification_update_org on public.lead_qualification
  for update
  using (org_id = app.current_org_id())
  with check (org_id = app.current_org_id());

-- ─────────────────────────────────────────────────────────────────────────
-- projects — catálogo: CRUD restringido a admin, lectura para todo rol.
-- ─────────────────────────────────────────────────────────────────────────
alter table public.projects enable row level security;
grant select, insert, update on public.projects to authenticated;

create policy projects_select_org on public.projects
  for select using (org_id = app.current_org_id());

create policy projects_insert_admin on public.projects
  for insert with check (org_id = app.current_org_id() and app.is_admin());

create policy projects_update_admin on public.projects
  for update
  using (org_id = app.current_org_id() and app.is_admin())
  with check (org_id = app.current_org_id());

-- ─────────────────────────────────────────────────────────────────────────
-- units
-- ─────────────────────────────────────────────────────────────────────────
alter table public.units enable row level security;
grant select, insert, update on public.units to authenticated;

create policy units_select_org on public.units
  for select using (org_id = app.current_org_id());

create policy units_insert_admin on public.units
  for insert with check (org_id = app.current_org_id() and app.is_admin());

create policy units_update_admin on public.units
  for update
  using (org_id = app.current_org_id() and app.is_admin())
  with check (org_id = app.current_org_id());

-- ─────────────────────────────────────────────────────────────────────────
-- unit_media
-- ─────────────────────────────────────────────────────────────────────────
alter table public.unit_media enable row level security;
grant select, insert, update on public.unit_media to authenticated;

create policy unit_media_select_org on public.unit_media
  for select using (org_id = app.current_org_id());

create policy unit_media_insert_admin on public.unit_media
  for insert with check (org_id = app.current_org_id() and app.is_admin());

create policy unit_media_update_admin on public.unit_media
  for update
  using (org_id = app.current_org_id() and app.is_admin())
  with check (org_id = app.current_org_id());

-- ─────────────────────────────────────────────────────────────────────────
-- availability_rules — horario de atención: solo admin lo configura.
-- ─────────────────────────────────────────────────────────────────────────
alter table public.availability_rules enable row level security;
grant select, insert, update on public.availability_rules to authenticated;

create policy availability_rules_select_org on public.availability_rules
  for select using (org_id = app.current_org_id());

create policy availability_rules_insert_admin on public.availability_rules
  for insert with check (org_id = app.current_org_id() and app.is_admin());

create policy availability_rules_update_admin on public.availability_rules
  for update
  using (org_id = app.current_org_id() and app.is_admin())
  with check (org_id = app.current_org_id());

-- ─────────────────────────────────────────────────────────────────────────
-- visits — cualquier rol de la organización agenda/reprograma/marca
-- asistencia (módulo de Agenda, Fase 4.5).
-- ─────────────────────────────────────────────────────────────────────────
alter table public.visits enable row level security;
grant select, insert, update on public.visits to authenticated;

create policy visits_select_org on public.visits
  for select using (org_id = app.current_org_id());

create policy visits_insert_org on public.visits
  for insert with check (org_id = app.current_org_id());

create policy visits_update_org on public.visits
  for update
  using (org_id = app.current_org_id())
  with check (org_id = app.current_org_id());

-- ─────────────────────────────────────────────────────────────────────────
-- calendar_credentials — SIN políticas ni grants: intencionalmente
-- inaccesible desde el cliente (ni siquiera para admin). Solo el backend
-- con service_role la toca. El estado de conexión, sin el token, se
-- expone en la vista calendar_connection_status más abajo.
-- ─────────────────────────────────────────────────────────────────────────
alter table public.calendar_credentials enable row level security;

create view public.calendar_connection_status
with (security_invoker = false) as
select
  org_id,
  calendar_id,
  conectado_por,
  created_at,
  updated_at,
  (token_expira_en is not null and token_expira_en > now()) as token_vigente
from public.calendar_credentials
where org_id = app.current_org_id() and app.is_admin();

grant select on public.calendar_connection_status to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- quotes — documento generado, inmutable: solo select/insert.
-- ─────────────────────────────────────────────────────────────────────────
alter table public.quotes enable row level security;
grant select, insert on public.quotes to authenticated;

create policy quotes_select_org on public.quotes
  for select using (org_id = app.current_org_id());

create policy quotes_insert_org on public.quotes
  for insert with check (org_id = app.current_org_id());

-- ─────────────────────────────────────────────────────────────────────────
-- reservations — cualquier rol crea la solicitud; solo admin/supervisor
-- puede cambiar su estado (aprobar/rechazar/pedir información). Esta es
-- la política que hace cumplir "un asesor no puede aprobar reservas".
-- ─────────────────────────────────────────────────────────────────────────
alter table public.reservations enable row level security;
grant select, insert, update on public.reservations to authenticated;

create policy reservations_select_org on public.reservations
  for select using (org_id = app.current_org_id());

create policy reservations_insert_org on public.reservations
  for insert with check (org_id = app.current_org_id());

create policy reservations_update_admin_o_supervisor on public.reservations
  for update
  using (org_id = app.current_org_id() and app.is_admin_o_supervisor())
  with check (org_id = app.current_org_id());

-- ─────────────────────────────────────────────────────────────────────────
-- agent_runs — trazas de solo lectura para el cliente; las escribe el
-- backend con service_role.
-- ─────────────────────────────────────────────────────────────────────────
alter table public.agent_runs enable row level security;
grant select on public.agent_runs to authenticated;

create policy agent_runs_select_org on public.agent_runs
  for select using (org_id = app.current_org_id());

-- ─────────────────────────────────────────────────────────────────────────
-- audit_log — de solo agregado; cada usuario solo puede registrar
-- acciones a su propio nombre (no puede firmar como otro).
-- ─────────────────────────────────────────────────────────────────────────
alter table public.audit_log enable row level security;
grant select, insert on public.audit_log to authenticated;

create policy audit_log_select_org on public.audit_log
  for select using (org_id = app.current_org_id());

create policy audit_log_insert_propio on public.audit_log
  for insert
  with check (org_id = app.current_org_id() and (user_id = auth.uid() or user_id is null));

-- ─────────────────────────────────────────────────────────────────────────
-- catalog_embeddings — sin grants: la búsqueda semántica (RAG) corre en
-- el servidor con service_role, nunca se consulta directo desde el
-- cliente.
-- ─────────────────────────────────────────────────────────────────────────
alter table public.catalog_embeddings enable row level security;

-- ─────────────────────────────────────────────────────────────────────────
-- job_queue — sin grants: solo el drenador (service_role) la toca.
-- ─────────────────────────────────────────────────────────────────────────
alter table public.job_queue enable row level security;

-- ─────────────────────────────────────────────────────────────────────────
-- whatsapp_templates — gestión de plantillas: solo admin.
-- ─────────────────────────────────────────────────────────────────────────
alter table public.whatsapp_templates enable row level security;
grant select, insert, update on public.whatsapp_templates to authenticated;

create policy whatsapp_templates_select_org on public.whatsapp_templates
  for select using (org_id = app.current_org_id());

create policy whatsapp_templates_insert_admin on public.whatsapp_templates
  for insert with check (org_id = app.current_org_id() and app.is_admin());

create policy whatsapp_templates_update_admin on public.whatsapp_templates
  for update
  using (org_id = app.current_org_id() and app.is_admin())
  with check (org_id = app.current_org_id());

-- ─────────────────────────────────────────────────────────────────────────
-- consents — registro inmutable de consentimiento (Ley 29733).
-- ─────────────────────────────────────────────────────────────────────────
alter table public.consents enable row level security;
grant select, insert on public.consents to authenticated;

create policy consents_select_org on public.consents
  for select using (org_id = app.current_org_id());

create policy consents_insert_org on public.consents
  for insert with check (org_id = app.current_org_id());

-- ─────────────────────────────────────────────────────────────────────────
-- service_role: acceso completo a todas las tablas del esquema, bypassa
-- RLS por definición de Supabase. Se deja explícito por si el proyecto no
-- trae ya el default de plataforma.
-- ─────────────────────────────────────────────────────────────────────────
grant all on all tables in schema public to service_role;

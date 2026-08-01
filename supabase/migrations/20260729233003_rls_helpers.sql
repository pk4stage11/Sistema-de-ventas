-- Funciones helper para las políticas RLS (definidas en la última
-- migración, 20260729233011_rls_policies.sql). Van después de crear
-- `public.users`, que es la tabla que consultan.
--
-- SECURITY DEFINER + search_path fijo: evita la recursión de RLS al
-- consultar `public.users` (que también tiene RLS habilitado) y evita el
-- hijacking del search_path.

create or replace function app.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from public.users where id = auth.uid();
$$;

create or replace function app.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid();
$$;

create or replace function app.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select app.current_role() = 'admin';
$$;

create or replace function app.is_admin_o_supervisor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select app.current_role() in ('admin', 'supervisor');
$$;

revoke execute on function app.current_org_id() from public;
revoke execute on function app.current_role() from public;
revoke execute on function app.is_admin() from public;
revoke execute on function app.is_admin_o_supervisor() from public;
grant execute on function app.current_org_id() to authenticated;
grant execute on function app.current_role() to authenticated;
grant execute on function app.is_admin() to authenticated;
grant execute on function app.is_admin_o_supervisor() to authenticated;

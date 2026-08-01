-- Extensiones necesarias para todo el esquema.
create extension if not exists pgcrypto;      -- utilidades criptográficas (hashing, etc.)
create extension if not exists vector;        -- pgvector: embeddings del catálogo (RAG)
create extension if not exists btree_gist;    -- exclusion constraint para no solapar visitas

-- Esquema separado para funciones de soporte de RLS, para no mezclarlas
-- con las tablas de negocio en `public`.
create schema if not exists app;

-- Actualiza `updated_at` automáticamente en cada UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Nota: las funciones helper de RLS (app.current_org_id(), app.is_admin(),
-- etc.) se definen en 20260729233003_rls_helpers.sql, DESPUÉS de crear la
-- tabla `public.users` que consultan. Son funciones `language sql`, y
-- Postgres resuelve los nombres de tabla dentro del cuerpo al momento de
-- CREATE FUNCTION — si `users` no existe todavía, la migración falla.

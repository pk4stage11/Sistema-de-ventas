-- Bucket privado para los PDFs de cotización que genera el agente
-- (lib/agent/tools/generar-cotizacion.ts). Privado a propósito: solo el
-- backend con service_role sube/lee directo; el cliente recibe una signed
-- URL con vencimiento. Acceso directo desde la bandeja (para un asesor)
-- es una mejora de fase posterior — no expone políticas RLS a
-- `authenticated` todavía.
insert into storage.buckets (id, name, public)
values ('cotizaciones', 'cotizaciones', false)
on conflict (id) do nothing;

-- Supabase no agrega las tablas nuevas a la publicación de Realtime por
-- defecto — hay que hacerlo explícito. La autorización de cada cambio que
-- llega por Realtime la siguen decidiendo las políticas RLS de SELECT ya
-- existentes (messages_select_org, conversations_select_org): un asesor
-- solo recibe eventos de su propia organización, sin configuración extra.
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
